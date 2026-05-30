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
  // ── 기술 (모델·반도체·아키텍처) ──
  { query: "반도체 HBM4" },
  { query: "AI 반도체 NPU" },
  { query: "생성형 AI 모델" },
  { query: "AI 에이전트 기술" },
  { query: "LLM 거대언어모델" },
  { query: "온디바이스 AI 경량화" },
  { query: "추론 최적화 AI 칩" },
  { query: "멀티모달 AI" },

  // ── 제품 (출시·런칭) ──
  { query: "AI 신제품 출시" },
  { query: "AI 모델 공개 오픈소스" },
  { query: "AI 플랫폼 런칭" },

  // ── 산업트렌드 ──
  { query: "GPU 클라우드 데이터센터" },
  { query: "AI 데이터센터 전력" },
  { query: "소버린 AI 파운데이션 모델" },
  { query: "엔터프라이즈 AI 도입" },

  // ── 투자 ──
  { query: "AI 스타트업 투자 유치" },
  { query: "AI 기업 IPO 상장" },
  { query: "AI 스타트업 시리즈 투자" },

  // ── 행사정보 ──
  { query: "AI 컨퍼런스 전시회" },
  { query: "AI 박람회 행사 개최" },

  // ── 경쟁사 / 관심 기업 (Notion "언급기업" 옵션과 매핑) ──
  { query: "노타 AI", company: "노타" },
  { query: "래블업", company: "래블업" },
  { query: "마키나락스", company: "마키나락스" },
  { query: "베슬AI", company: "베슬AI" },
  { query: "업스테이지 AI", company: "업스테이지" },
  { query: "사이오닉AI", company: "사이오닉AI" },
  { query: "리벨리온 NPU", company: "리벨리온" },
  { query: "퓨리오사AI", company: "퓨리오사AI" },
  { query: "딥엑스 NPU", company: "딥엑스" },
  { query: "모레 GPU", company: "모레" },
];

// 해외 기사 수집용 영문 검색어 (Claude web_search 수집기에서 사용)
export const GLOBAL_QUERIES: string[] = [
  "AI semiconductor HBM Nvidia GPU latest news",
  "GPU cloud neocloud CoreWeave Lambda latest",
  "frontier AI model release OpenAI Anthropic Google latest",
  "enterprise AI agent product launch latest",
  "AI startup funding round IPO latest",
  "AI data center power investment latest",
  "AI conference event GTC keynote latest",
];

// 키워드당 네이버에서 가져올 기사 수 (최대 100)
export const ARTICLES_PER_KEYWORD = 15;

// 며칠 이내 기사만 대상으로 할지 (발행일 기준). 최신성 우선 → 3일
export const MAX_AGE_DAYS = 3;

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

// Notion "카테고리" 멀티셀렉트 옵션 (경쟁사·투자·기술·제품·행사정보 중심)
export const CATEGORY_OPTIONS = [
  "자사",
  "경쟁사",
  "투자",
  "기술",
  "제품",
  "행사정보",
  "산업트렌드",
  "정책규제",
  "논문/오픈소스",
  "효율화기술",
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
