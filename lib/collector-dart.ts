import type { Article } from "./supabase";

const DART_API_BASE = "https://opendart.fss.or.kr/api";

// 모니터링 대상 기업 코드 (DART 기업 고유번호)
const MONITORED_CORPS: Record<string, string> = {
  // Phase 3에서 실제 기업코드로 교체
  // "아크릴": "00000000",
  // "제논": "00000000",
};

interface DartDisclosure {
  corp_name: string;
  report_nm: string;
  rcept_no: string;
  rcept_dt: string;
  flr_nm: string;
}

export async function collectViaDart(
  batchId: string
): Promise<Partial<Article>[]> {
  const apiKey = process.env.DART_API_KEY;
  if (!apiKey) {
    console.log("[dart] DART_API_KEY not configured, skipping");
    return [];
  }

  const articles: Partial<Article>[] = [];

  try {
    // 최근 공시 목록 조회
    const today = new Date();
    const bgn_de = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split("T")[0]
      .replace(/-/g, "");
    const end_de = today.toISOString().split("T")[0].replace(/-/g, "");

    for (const [corpName, corpCode] of Object.entries(MONITORED_CORPS)) {
      const url = `${DART_API_BASE}/list.json?crtfc_key=${apiKey}&corp_code=${corpCode}&bgn_de=${bgn_de}&end_de=${end_de}&page_count=5`;

      const res = await fetch(url);
      if (!res.ok) continue;

      const data = await res.json();
      if (data.status !== "000" || !data.list) continue;

      for (const item of data.list as DartDisclosure[]) {
        articles.push({
          title: `[공시] ${item.corp_name} - ${item.report_nm}`,
          url: `https://dart.fss.or.kr/dsaf001/main.do?rcpNo=${item.rcept_no}`,
          source: "DART",
          content_type: "investment",
          published_at: `${item.rcept_dt.slice(0, 4)}-${item.rcept_dt.slice(4, 6)}-${item.rcept_dt.slice(6, 8)}`,
          summary: `${item.corp_name}의 ${item.report_nm} (제출인: ${item.flr_nm})`,
          matched_keywords: [corpName, "공시"],
          batch_id: batchId,
        });
      }
    }
  } catch (error) {
    console.error("[dart] Error fetching DART data:", error);
  }

  console.log(`[dart] Collected ${articles.length} disclosures`);
  return articles;
}
