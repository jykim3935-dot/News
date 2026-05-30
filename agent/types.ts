/** 네이버 뉴스 API에서 수집한 원시 기사 */
export interface RawArticle {
  title: string; // HTML 태그 제거된 제목
  url: string; // 원문 링크 (originallink 우선, 없으면 link)
  description: string; // 본문 요약 (HTML 태그 제거)
  publishedAt: string; // ISO 날짜 (YYYY-MM-DD)
  media: string; // "매체" 옵션 중 하나 (도메인 기반 추정)
  query: string; // 이 기사를 찾은 검색어
  company?: string; // 검색어에 매핑된 기업명 (있으면)
}

/** Claude 분석 결과 (Notion 저장 직전 형태) */
export interface AnalyzedArticle extends RawArticle {
  relevant: boolean; // 클리핑 가치가 있는지
  summary: string; // 핵심요약 (2-3문장)
  insight: string; // 시사점 (1-2문장)
  importance: "★★★" | "★★☆" | "★☆☆";
  categories: string[]; // 카테고리 (CATEGORY_OPTIONS 부분집합)
  companies: string[]; // 언급기업 (COMPANY_OPTIONS 부분집합)
}
