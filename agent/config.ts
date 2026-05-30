/**
 * 뉴스 클리핑 에이전트 설정
 *
 * 수집할 키워드, Notion DB 매핑, 모델 등 모든 설정을 한 곳에서 관리합니다.
 */

// ── 수집 키워드 ────────────────────────────────────────────────
// query: 네이버 뉴스 검색에 사용할 검색어
// company: 매칭되면 Notion "언급기업" 멀티셀렉트에 자동 태깅 (선택)
export interface KeywordConfig {
  query: string;
  company?: string;
}

export const KEYWORDS: KeywordConfig[] = [
  // 산업/기술 키워드
  { query: "반도체" },
  { query: "생성형 AI" },
  { query: "AI 스타트업 투자" },

  // 관심 기업 (Notion "언급기업" 옵션과 매핑)
  { query: "노타 AI", company: "노타" },
  { query: "래블업", company: "래블업" },
  { query: "마키나락스", company: "마키나락스" },
  { query: "베슬AI", company: "베슬AI" },
  { query: "업스테이지 AI", company: "업스테이지" },
  { query: "사이오닉AI", company: "사이오닉AI" },
];

// 키워드당 네이버에서 가져올 기사 수 (최대 100)
export const ARTICLES_PER_KEYWORD = 10;

// 며칠 이내 기사만 대상으로 할지 (발행일 기준)
export const MAX_AGE_DAYS = 2;

// ── Notion ────────────────────────────────────────────────────
// "일일 뉴스클리핑" 데이터베이스 ID
export const NOTION_DATABASE_ID =
  process.env.NOTION_DATABASE_ID || "70a0369a-4cba-445d-a14a-46a2c3b9fc36";

// Notion "매체" select 옵션 (이 목록 외에는 "기타"로 처리)
export const MEDIA_OPTIONS = [
  "네이버",
  "구글",
  "AI타임스",
  "전자신문",
  "디지털데일리",
  "데이터넷",
  "조선비즈",
  "TechCrunch",
  "The Information",
  "arXiv",
  "HuggingFace",
  "기타",
] as const;

// 언론사 도메인 → "매체" 옵션 매핑 (없으면 "기타")
export const DOMAIN_TO_MEDIA: Record<string, string> = {
  "aitimes.com": "AI타임스",
  "etnews.com": "전자신문",
  "ddaily.co.kr": "디지털데일리",
  "datanet.co.kr": "데이터넷",
  "chosun.com": "조선비즈",
  "biz.chosun.com": "조선비즈",
  "techcrunch.com": "TechCrunch",
  "theinformation.com": "The Information",
  "arxiv.org": "arXiv",
  "huggingface.co": "HuggingFace",
};

// Notion "중요도" 옵션
export const IMPORTANCE_OPTIONS = ["★★★", "★★☆", "★☆☆"] as const;

// Notion "카테고리" 멀티셀렉트 옵션
export const CATEGORY_OPTIONS = [
  "자사",
  "경쟁사",
  "효율화기술",
  "정책규제",
  "논문/오픈소스",
  "기타산업",
] as const;

// Notion "언급기업" 멀티셀렉트 옵션
export const COMPANY_OPTIONS = [
  "아크릴",
  "솔트룩스",
  "코난테크놀로지",
  "마음AI",
  "업스테이지",
  "와이즈넛",
  "포티투마루",
  "올거나이즈",
  "래블업",
  "베슬AI",
  "슈퍼브AI",
  "모레",
  "리벨리온",
  "사피온",
  "퓨리오사AI",
  "노타",
  "딥엑스",
  "마키나락스",
  "앨리스",
  "뤼튼",
  "스캐터랩",
  "카카오브레인",
  "네이버 클로바",
  "LG AI연구원",
  "삼성리서치",
  "사이오닉AI",
] as const;

// ── Claude ────────────────────────────────────────────────────
export const CLAUDE_MODEL = "claude-sonnet-4-6";
