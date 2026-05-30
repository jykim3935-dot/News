/**
 * 뉴스 클리핑 에이전트 — 메인 실행 진입점
 *
 *   네이버 뉴스 수집 → Claude 분석/요약 → Notion 저장
 *
 * 실행: npm run clip
 */
import { collectNaver } from "./naver";
import { analyzeArticles } from "./analyze";
import { saveToNotion } from "./notion";

async function main() {
  const startedAt = Date.now();
  console.log("=== 뉴스 클리핑 에이전트 시작 ===");

  // 1. 수집
  const raw = await collectNaver();
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
