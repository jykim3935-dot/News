/**
 * Default preset sources and keyword groups used as fallback
 * when neither Supabase nor local store has data.
 * This ensures the pipeline can always collect articles on Vercel
 * even when /tmp is cleared between serverless invocations.
 */

import type { Source, KeywordGroup, ContentType, Category } from "./supabase";

type PresetSource = Omit<Source, "id" | "created_at">;
type PresetKeywordGroup = Omit<KeywordGroup, "id" | "created_at">;

export const DEFAULT_SOURCES: PresetSource[] = [
  // ── 국내 IT/경제 뉴스 ──
  { name: "전자신문", url: "https://rss.etnews.com/Section901.xml", type: "rss", content_type: "news", category: "tech", description: "IT/과학 종합", enabled: true },
  { name: "ZDNet Korea", url: "https://zdnet.co.kr/rss/newsall.xml", type: "rss", content_type: "news", category: "tech", description: "IT 전문 매체", enabled: true },
  { name: "디지털타임스", url: "https://www.dt.co.kr/rss/all_news.xml", type: "rss", content_type: "news", category: "tech", description: "디지털 산업", enabled: true },
  { name: "한국경제", url: "https://www.hankyung.com/feed/it", type: "rss", content_type: "news", category: "market", description: "IT/AI 기업 동향", enabled: true },
  { name: "AI타임스", url: "https://www.aitimes.com/rss/allArticle.xml", type: "rss", content_type: "news", category: "tech", description: "AI 전문 매체", enabled: true },
  { name: "블로터", url: "https://www.bloter.net/feed", type: "rss", content_type: "news", category: "tech", description: "IT/스타트업", enabled: true },
  { name: "매일경제 IT", url: "https://www.mk.co.kr/rss/30200030/", type: "rss", content_type: "news", category: "market", description: "IT/과학 경제", enabled: true },

  // ── 글로벌 AI/테크 ──
  { name: "TechCrunch AI", url: "https://techcrunch.com/category/artificial-intelligence/feed/", type: "rss", content_type: "global", category: "tech", description: "글로벌 AI 스타트업", enabled: true },
  { name: "VentureBeat AI", url: "https://venturebeat.com/category/ai/feed/", type: "rss", content_type: "global", category: "tech", description: "엔터프라이즈 AI", enabled: true },
  { name: "The Verge AI", url: "https://www.theverge.com/rss/ai-artificial-intelligence/index.xml", type: "rss", content_type: "global", category: "tech", description: "빅테크 AI 동향", enabled: true },
  { name: "Ars Technica AI", url: "https://feeds.arstechnica.com/arstechnica/features", type: "rss", content_type: "global", category: "tech", description: "심층 기술 분석", enabled: true },
  { name: "MIT Tech Review", url: "https://www.technologyreview.com/feed/", type: "rss", content_type: "global", category: "tech", description: "AI/기술 심층 리뷰", enabled: true },

  // ── 기술 블로그 ──
  { name: "NVIDIA Blog", url: "https://blogs.nvidia.com/feed/", type: "rss", content_type: "blog", category: "tech", description: "GPU/AI 인프라 공식", enabled: true },
  { name: "Anthropic Blog", url: "https://www.anthropic.com/blog/rss.xml", type: "rss", content_type: "blog", category: "tech", description: "Claude, MCP, AI Safety", enabled: true },
  { name: "Hugging Face Blog", url: "https://huggingface.co/blog/feed.xml", type: "rss", content_type: "blog", category: "tech", description: "오픈소스 LLM/모델 허브", enabled: true },
  { name: "OpenAI Blog", url: "https://openai.com/blog/rss.xml", type: "rss", content_type: "blog", category: "tech", description: "GPT, API, 에이전트", enabled: true },
  { name: "Google AI Blog", url: "https://blog.research.google/feeds/posts/default?alt=rss", type: "rss", content_type: "blog", category: "tech", description: "Gemini, TPU, 연구", enabled: true },

  // ── 학술/논문 ──
  { name: "arXiv cs.AI", url: "https://rss.arxiv.org/rss/cs.AI", type: "rss", content_type: "research", category: "tech", description: "AI 논문", enabled: true },
  { name: "arXiv cs.LG", url: "https://rss.arxiv.org/rss/cs.LG", type: "rss", content_type: "research", category: "tech", description: "머신러닝 논문", enabled: true },
  { name: "arXiv cs.DC", url: "https://rss.arxiv.org/rss/cs.DC", type: "rss", content_type: "research", category: "tech", description: "분산컴퓨팅/GPU스케줄링", enabled: true },

  // ── 컨설팅/리서치 ──
  { name: "McKinsey AI", url: "https://www.mckinsey.com/capabilities/quantumblack/our-insights/rss", type: "rss", content_type: "consulting", category: "market", description: "AI 전략/시장", enabled: true },
  { name: "a16z Blog", url: "https://a16z.com/feed/", type: "rss", content_type: "consulting", category: "investment", description: "AI 투자/인프라 관점", enabled: true },

  // ── 투자/IR ──
  { name: "한국거래소 공시", url: "https://kind.krx.co.kr/disclosure/todaydisclosure.do?method=searchTodayDisclosureRss", type: "rss", content_type: "investment", category: "investment", description: "KOSDAQ 공시", enabled: true },

  // ── 탑티어 시스템 학회 ──
  { name: "USENIX ATC", url: "USENIX ATC systems conference latest papers", type: "websearch", content_type: "research", category: "tech", description: "시스템 분야 최고 학회 (OS, 분산시스템, 스토리지)", enabled: true },
  { name: "OSDI/SOSP", url: "OSDI SOSP operating systems conference latest papers", type: "websearch", content_type: "research", category: "tech", description: "운영체제/분산시스템 탑티어 학회", enabled: true },
  { name: "NeurIPS", url: "NeurIPS conference latest AI ML papers", type: "websearch", content_type: "research", category: "tech", description: "AI/ML 최고 학회", enabled: true },
  { name: "ICML", url: "ICML conference latest machine learning papers", type: "websearch", content_type: "research", category: "tech", description: "머신러닝 탑티어 학회", enabled: true },
  { name: "MLSys", url: "MLSys conference latest ML systems papers", type: "websearch", content_type: "research", category: "tech", description: "ML 시스템 전문 학회", enabled: true },

  // ── 컨설팅펌 ──
  { name: "Deloitte AI", url: "https://www2.deloitte.com/us/en/insights/focus/artificial-intelligence.html", type: "websearch", content_type: "consulting", category: "market", description: "딜로이트 AI 인사이트", enabled: true },
  { name: "BCG AI", url: "https://www.bcg.com/capabilities/artificial-intelligence/insights", type: "websearch", content_type: "consulting", category: "market", description: "BCG AI 전략 리포트", enabled: true },
  { name: "Bain Tech", url: "https://www.bain.com/insights/topics/technology-report/", type: "websearch", content_type: "consulting", category: "market", description: "베인 테크 리포트", enabled: true },

  // ── 대한민국 정부 ──
  { name: "과학기술정보통신부", url: "과학기술정보통신부 AI 정책 최신 발표", type: "websearch", content_type: "government", category: "regulation", description: "AI·디지털 정책 총괄 부처", enabled: true },
  { name: "중소벤처기업부", url: "중소벤처기업부 AI 스타트업 지원 정책", type: "websearch", content_type: "government", category: "customer", description: "AI 스타트업·중소기업 지원", enabled: true },
  { name: "보건복지부", url: "보건복지부 디지털 헬스케어 AI 정책", type: "websearch", content_type: "government", category: "regulation", description: "의료AI·디지털헬스 규제/정책", enabled: true },
  { name: "IITP", url: "IITP 정보통신기획평가원 AI 사업 공고", type: "websearch", content_type: "government", category: "customer", description: "AI R&D 과제 기획·평가", enabled: true },
  { name: "NIA", url: "NIA 한국지능정보사회진흥원 AI 정책", type: "websearch", content_type: "government", category: "customer", description: "국가 AI 데이터·인프라 추진", enabled: true },
];

export const DEFAULT_KEYWORD_GROUPS: PresetKeywordGroup[] = [
  // ── Priority 1: 핵심 사업 직결 ──
  {
    group_name: "GPU 클라우드/오케스트레이션",
    category: "tech",
    content_types: ["news", "research", "blog", "global"],
    priority: 1,
    keywords: ["GPU 클라우드", "GPU-as-a-Service", "GPU 오케스트레이션", "GPU 클러스터", "GPUBASE", "H100", "B200", "GPU 가상화", "GPU sharing", "MIG", "GPU pool", "cloud GPU"],
    enabled: true,
  },
  {
    group_name: "AI 에이전트/MCP",
    category: "tech",
    content_types: ["news", "research", "blog", "global"],
    priority: 1,
    keywords: ["AI 에이전트", "AI agent", "MCP", "Model Context Protocol", "AGENTBASE", "멀티에이전트", "agentic AI", "function calling", "tool use", "agent orchestration", "agent framework"],
    enabled: true,
  },
  {
    group_name: "MLOps/모델 서빙",
    category: "tech",
    content_types: ["news", "research", "blog"],
    priority: 1,
    keywords: ["MLOps", "모델 서빙", "inference optimization", "FLIGHTBASE", "vLLM", "TensorRT", "model serving", "LLM 배포", "TGI", "inference engine", "LLM inference", "서빙 최적화"],
    enabled: true,
  },
  {
    group_name: "직접 경쟁사",
    category: "competitive" as Category,
    content_types: ["news", "report", "investment"] as ContentType[],
    priority: 1,
    keywords: ["제논", "GenOn", "마인즈앤컴퍼니", "CoreWeave", "Lambda Labs", "Together AI", "RunPod", "Vast.ai", "GPU 클라우드 경쟁", "Crusoe Energy", "Nebius"],
    enabled: true,
  },
  {
    group_name: "공공 AI 인프라",
    category: "customer" as Category,
    content_types: ["news", "government"] as ContentType[],
    priority: 1,
    keywords: ["공공 AI", "AI 인프라 구축", "정부 클라우드", "AI 데이터센터", "국가 AI 컴퓨팅", "나라장터 AI", "조달청 AI", "AI 특화단지", "디지털플랫폼정부"],
    enabled: true,
  },
  {
    group_name: "헬스케어 AI/NADIA",
    category: "market",
    content_types: ["news", "research", "global"],
    priority: 1,
    keywords: ["의료 AI", "피부질환 AI", "AI 진단", "디지털 헬스케어", "NADIA", "FDA AI", "의료기기 AI", "SaMD", "digital therapeutics", "AI 병리", "헬스케어 SaaS"],
    enabled: true,
  },
  {
    group_name: "주요 파트너사",
    category: "customer" as Category,
    content_types: ["news", "investment"] as ContentType[],
    priority: 1,
    keywords: ["KT AI", "삼성SDS", "메가존클라우드", "강원랜드", "KODATA", "한국가스기술공사", "아산병원 AI", "카카오엔터프라이즈"],
    enabled: true,
  },

  // ── Priority 2: 시장/기술 동향 ──
  {
    group_name: "생성형 AI/LLM",
    category: "tech",
    content_types: ["news", "research", "blog", "global"],
    priority: 2,
    keywords: ["생성형AI", "LLM", "GPT", "Claude", "Gemini", "오픈소스 LLM", "Llama", "RAG", "fine-tuning", "RLHF", "프롬프트 엔지니어링"],
    enabled: true,
  },
  {
    group_name: "AI 반도체/하드웨어",
    category: "tech",
    content_types: ["news", "report", "global"],
    priority: 2,
    keywords: ["AI 반도체", "NVIDIA", "AMD MI300", "HBM", "AI 가속기", "Blackwell", "AI ASIC", "Groq", "Cerebras", "Intel Gaudi", "NPU", "AI 칩"],
    enabled: true,
  },
  {
    group_name: "AI 정책/규제",
    category: "regulation",
    content_types: ["news", "government", "global"],
    priority: 2,
    keywords: ["AI기본법", "AI 규제", "AI 윤리", "국가AI위원회", "EU AI Act", "AI 안전", "AI 거버넌스", "responsible AI", "AI 저작권"],
    enabled: true,
  },
  {
    group_name: "AI 인프라 투자",
    category: "investment",
    content_types: ["news", "investment"],
    priority: 2,
    keywords: ["AI 인프라 투자", "GPU 클라우드 투자", "KOSDAQ AI", "AI IPO", "AI M&A", "AI 벤처투자", "데이터센터 투자", "AI 스타트업 시리즈"],
    enabled: true,
  },
  {
    group_name: "데이터센터/클라우드",
    category: "tech",
    content_types: ["news", "global", "investment"],
    priority: 2,
    keywords: ["데이터센터", "하이퍼스케일", "클라우드 인프라", "AWS", "Azure", "GCP", "sovereign cloud", "엣지 컴퓨팅", "코로케이션"],
    enabled: true,
  },

  // ── Priority 2: 학술/컨설팅/정부 ──
  {
    group_name: "학술 시스템/인프라",
    category: "tech",
    content_types: ["research", "global"],
    priority: 2,
    keywords: ["USENIX ATC", "OSDI", "SOSP", "MLSys", "NeurIPS systems", "distributed systems", "GPU scheduling", "container orchestration", "cluster management", "resource allocation", "model parallelism", "inference serving paper"],
    enabled: true,
  },
  {
    group_name: "컨설팅 전략",
    category: "market",
    content_types: ["consulting", "report", "global"],
    priority: 2,
    keywords: ["digital transformation", "AI strategy", "enterprise AI adoption", "AI maturity", "McKinsey AI", "BCG AI", "Deloitte AI", "Bain technology", "AI ROI", "총소유비용 TCO", "AI 도입 전략"],
    enabled: true,
  },
  {
    group_name: "정부정책 사업",
    category: "regulation",
    content_types: ["government", "news"],
    priority: 2,
    keywords: ["과기정통부", "중기부", "보건복지부", "AI 바우처", "디지털뉴딜", "K-클라우드", "공공 클라우드", "AI 실증사업", "IITP", "NIA", "AI 특구", "디지털플랫폼정부"],
    enabled: true,
  },
];
