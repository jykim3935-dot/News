/**
 * 뉴스 클리핑 에이전트 — 메인 실행 진입점
 *
 *   네이버 뉴스 수집 → Claude 분석/요약 → Notion 저장
 *
 * 실행: npm run clip
 */
import { collectNaver } from "./naver";
import { collectGlobal } from "./global";
import { analyzeArticles } from "./analyze";
import { saveToNotion } from "./notion";
import type { RawArticle } from "./types";

async function main() {
  const startedAt = Date.now();
  console.log("=== 뉴스 클리핑 에이전트 시작 ===");

  // 1. 수집 (국내 네이버 + 해외 web_search, 병렬)
  const [naverRes, globalRes] = await Promise.allSettled([
    collectNaver(),
    collectGlobal(),
  ]);
  const naver = naverRes.status === "fulfilled" ? naverRes.value : [];
  const global = globalRes.status === "fulfilled" ? globalRes.value : [];

  // URL 기준 통합 중복 제거
  const seen = new Set<string>();
  const raw: RawArticle[] = [...naver, ...global].filter((a) => {
    if (seen.has(a.url)) return false;
    seen.add(a.url);
    return true;
  });
  console.log(`[collect] 국내 ${naver.length} + 해외 ${global.length} → 통합 ${raw.length}건`);

  if (raw.length === 0) {
    console.log("수집된 기사가 없습니다. 종료합니다.");
    return;
  }

  // 2. 분석
  const analyzed = await analyzeArticles(raw);
  if (analyzed.length === 0) {
    console.log("클리핑할 만한 기사가 없습니다. 종료합니다.");
    return;
  }

  // 3. 저장
  const { saved, skipped } = await saveToNotion(analyzed);

  const elapsed = ((Date.now() - startedAt) / 1000).toFixed(1);
  console.log(
    `=== 완료 (${elapsed}s): 수집 ${raw.length} · 채택 ${analyzed.length} · 저장 ${saved} · 중복 ${skipped} ===`
  );
}

main().catch((e) => {
  console.error("에이전트 실행 실패:", e);
  process.exit(1);
});
