import { renderNewsletter } from "@/lib/newsletter";
import type { Article } from "@/lib/supabase";

const SAMPLE_ARTICLES: Article[] = [
  // 📰 뉴스
  {
    id: "1", title: "NVIDIA, 차세대 Blackwell Ultra GPU 양산 본격화…AI 인프라 수요 급증",
    url: "https://example.com/1", source: "ZDNet Korea", content_type: "news",
    published_at: "2026-03-28", summary: "NVIDIA가 Blackwell Ultra GPU의 대량 양산을 시작하며 AI 데이터센터 인프라 시장의 폭발적 성장을 견인하고 있다.",
    matched_keywords: ["NVIDIA", "GPU", "AI 인프라"], category: "market",
    relevance_score: 9, urgency: "red",
    impact_comment: "GPUBASE의 Blackwell Ultra 지원 준비 시급. 고객사 GPU 업그레이드 수요 대응 전략 필요.",
    batch_id: "demo", created_at: "2026-03-28",
  },
  {
    id: "2", title: "제논(GenOn), 공공기관 AI 플랫폼 수주 100억원 돌파",
    url: "https://example.com/2", source: "전자신문", content_type: "news",
    published_at: "2026-03-27", summary: "경쟁사 제논이 올해 공공기관 AI 플랫폼 수주 누적 100억원을 돌파했다고 발표.",
    matched_keywords: ["제논", "GenOn", "공공 AI"], category: "competitive",
    relevance_score: 10, urgency: "red",
    impact_comment: "직접 경쟁사 제논의 공공부문 확대 경계 필요. ACRYL의 GS인증/혁신제품 장점을 활용한 공공 영업 강화 시급.",
    batch_id: "demo", created_at: "2026-03-28",
  },
  {
    id: "3", title: "KT, 기업용 AI 에이전트 플랫폼 'KT Agentic' 출시",
    url: "https://example.com/3", source: "AI타임스", content_type: "news",
    published_at: "2026-03-28", summary: "KT가 MCP 기반 기업용 AI 에이전트 플랫폼을 출시하며 B2B AI 시장 공략을 본격화.",
    matched_keywords: ["KT AI", "AI 에이전트", "MCP"], category: "customer",
    relevance_score: 8, urgency: "yellow",
    impact_comment: "주요 파트너 KT의 에이전트 플랫폼 출시. AGENTBASE와의 기술 연동/파트너십 확대 기회.",
    batch_id: "demo", created_at: "2026-03-28",
  },
  {
    id: "4", title: "CoreWeave, $7.5B 시리즈 C 라운드 클로징…GPU 클라우드 경쟁 심화",
    url: "https://example.com/4", source: "TechCrunch", content_type: "news",
    published_at: "2026-03-27", summary: "GPU 클라우드 스타트업 CoreWeave가 역대 최대 규모 펀딩을 확보하며 글로벌 AI 인프라 경쟁이 가열.",
    matched_keywords: ["CoreWeave", "GPU 클라우드"], category: "competitive",
    relevance_score: 7, urgency: "yellow",
    impact_comment: "글로벌 GPU 클라우드 시장 경쟁 심화. GPUBASE의 차별화 포인트(오케스트레이션, 멀티클라우드) 강화 필요.",
    batch_id: "demo", created_at: "2026-03-28",
  },
  {
    id: "5", title: "정부, AI 국가전략 2.0 발표…GPU 인프라 투자 2조원 확대",
    url: "https://example.com/5", source: "디지털데일리", content_type: "news",
    published_at: "2026-03-28", summary: "과기정통부가 AI 국가전략 2.0을 발표하며 GPU 인프라 투자를 2조원 규모로 확대한다고 밝혔다.",
    matched_keywords: ["AI 국가전략", "GPU 도입", "공공 AI"], category: "regulation",
    relevance_score: 9, urgency: "red",
    impact_comment: "정부 GPU 인프라 대규모 투자는 ACRYL에 직접적 수혜. 나라장터/조달청 입찰 준비 즉시 착수 필요.",
    batch_id: "demo", created_at: "2026-03-28",
  },

  // 📊 보고서
  {
    id: "6", title: "SPRi, '2026 AI 인프라 시장 전망' 보고서 발간",
    url: "https://example.com/6", source: "SPRi (SW정책연구소)", content_type: "report",
    published_at: "2026-03-25", summary: "국내 AI 인프라 시장이 2026년 3.2조원 규모로 성장할 것으로 전망. GPU 오케스트레이션 수요 급증 예측.",
    matched_keywords: ["AI 인프라", "GPU 시장"], category: "market",
    relevance_score: 9, urgency: "yellow",
    impact_comment: "SPRi 보고서의 GPU 오케스트레이션 시장 데이터를 IR 자료 및 제안서에 적극 활용 가능.",
    batch_id: "demo", created_at: "2026-03-28",
  },
  {
    id: "7", title: "IITP 주간기술동향: MLOps 플랫폼 기술 동향 분석",
    url: "https://example.com/7", source: "IITP (정보통신기획평가원)", content_type: "report",
    published_at: "2026-03-26", summary: "국내외 MLOps 플랫폼 기술 동향을 분석하고 주요 기업별 기술 비교를 제공.",
    matched_keywords: ["MLOps", "AI 플랫폼"], category: "tech",
    relevance_score: 7, urgency: "green",
    impact_comment: "FLIGHTBASE MLOps 포지셔닝 참고 자료. 경쟁 제품 대비 차별화 포인트 정리에 활용.",
    batch_id: "demo", created_at: "2026-03-28",
  },

  // 📊 컨설팅
  {
    id: "8", title: "Gartner, 2026 AI Infrastructure Magic Quadrant 발표",
    url: "https://example.com/8", source: "Gartner", content_type: "consulting",
    published_at: "2026-03-20", summary: "Gartner가 AI Infrastructure Magic Quadrant를 발표. GPU 오케스트레이션이 핵심 평가 항목으로 신규 추가.",
    matched_keywords: ["Gartner AI", "Magic Quadrant"], category: "market",
    relevance_score: 8, urgency: "yellow",
    impact_comment: "Gartner MQ에 GPU 오케스트레이션 카테고리 추가는 GPUBASE 시장 검증. 마케팅/IR에 적극 인용.",
    batch_id: "demo", created_at: "2026-03-28",
  },
  {
    id: "9", title: "IDC, 글로벌 GPU 서버 시장 2026년 $150B 전망",
    url: "https://example.com/9", source: "IDC", content_type: "consulting",
    published_at: "2026-03-22", summary: "IDC가 글로벌 GPU 서버 시장이 전년 대비 45% 성장한 $150B에 달할 것으로 전망.",
    matched_keywords: ["IDC GPU forecast", "GPU 시장"], category: "market",
    relevance_score: 7, urgency: "green",
    impact_comment: "IDC 시장 규모 데이터를 TAM/SAM 산출 및 IR 발표 자료에 활용.",
    batch_id: "demo", created_at: "2026-03-28",
  },

  // 🌍 글로벌
  {
    id: "10", title: "EU AI Act 시행 1주년: 기업 AI 거버넌스 현황 점검",
    url: "https://example.com/10", source: "OECD AI Policy", content_type: "global",
    published_at: "2026-03-24", summary: "EU AI Act 시행 1주년을 맞아 유럽 기업들의 AI 거버넌스 대응 현황과 시사점을 분석.",
    matched_keywords: ["EU AI Act", "AI regulation"], category: "regulation",
    relevance_score: 6, urgency: "green",
    impact_comment: "해외 진출 시 EU AI Act 규정 준수 필요. JONATHAN 플랫폼의 AI 거버넌스 기능 검토.",
    batch_id: "demo", created_at: "2026-03-28",
  },
  {
    id: "11", title: "Stanford HAI AI Index 2026: AI 인프라 투자 사상 최대",
    url: "https://example.com/11", source: "Stanford HAI", content_type: "global",
    published_at: "2026-03-23", summary: "Stanford HAI의 연례 AI Index에서 글로벌 AI 인프라 투자가 사상 최대치를 기록했다고 발표.",
    matched_keywords: ["Stanford HAI", "AI 인프라"], category: "market",
    relevance_score: 7, urgency: "green",
    impact_comment: "글로벌 AI 인프라 투자 성장 데이터. ACRYL IR 자료 및 해외 확장 전략 근거로 활용.",
    batch_id: "demo", created_at: "2026-03-28",
  },

  // 💰 투자
  {
    id: "12", title: "NVIDIA 2026 Q1 실적: 데이터센터 매출 $45B, 전년비 65%↑",
    url: "https://example.com/12", source: "NVIDIA IR", content_type: "investment",
    published_at: "2026-03-26", summary: "NVIDIA의 2026 회계연도 1분기 데이터센터 매출이 $45B를 기록하며 AI 인프라 수요의 지속적 성장을 확인.",
    matched_keywords: ["NVIDIA earnings", "NVIDIA data center"], category: "investment",
    relevance_score: 8, urgency: "yellow",
    impact_comment: "NVIDIA 데이터센터 매출 급증은 GPUBASE 시장 확대 신호. 동종업계 밸류에이션 근거로 활용.",
    batch_id: "demo", created_at: "2026-03-28",
  },
  {
    id: "13", title: "KOSDAQ AI 인프라 섹터 시가총액 10조원 돌파",
    url: "https://example.com/13", source: "한국거래소", content_type: "investment",
    published_at: "2026-03-27", summary: "KOSDAQ AI 인프라 관련 종목들의 합산 시가총액이 처음으로 10조원을 돌파.",
    matched_keywords: ["KOSDAQ AI 종목", "AI 인프라 상장사"], category: "investment",
    relevance_score: 8, urgency: "yellow",
    impact_comment: "KOSDAQ AI 인프라 섹터 성장은 ACRYL 기업가치 재평가 기대. IR 스토리텔링에 활용.",
    batch_id: "demo", created_at: "2026-03-28",
  },

  // 🔬 블로그
  {
    id: "14", title: "Anthropic: Claude의 MCP 서버 구축 가이드 업데이트",
    url: "https://example.com/14", source: "Anthropic Blog", content_type: "blog",
    published_at: "2026-03-27", summary: "Anthropic이 MCP(Model Context Protocol) 서버 구축 가이드를 업데이트하며 엔터프라이즈 AI 에이전트 생태계를 확장.",
    matched_keywords: ["MCP server", "AI agent framework"], category: "tech",
    relevance_score: 9, urgency: "yellow",
    impact_comment: "AGENTBASE의 MCP 네이티브 지원은 핵심 차별화. Anthropic 최신 가이드 반영하여 호환성 검증 필요.",
    batch_id: "demo", created_at: "2026-03-28",
  },
  {
    id: "15", title: "NVIDIA Blog: CUDA 13.0 릴리즈 - GPU 멀티테넌시 강화",
    url: "https://example.com/15", source: "NVIDIA Blog", content_type: "blog",
    published_at: "2026-03-26", summary: "NVIDIA가 CUDA 13.0을 릴리즈하며 GPU 멀티테넌시와 오케스트레이션 API를 대폭 강화.",
    matched_keywords: ["NVIDIA blog GPU", "CUDA update", "GPU orchestration"], category: "tech",
    relevance_score: 9, urgency: "red",
    impact_comment: "CUDA 13.0의 멀티테넌시 강화는 GPUBASE 핵심 기능과 직결. 즉시 기술검토 및 지원 계획 수립 필요.",
    batch_id: "demo", created_at: "2026-03-28",
  },
];

export default function DemoPage() {
  const date = new Date().toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "long",
  });

  const html = renderNewsletter(SAMPLE_ARTICLES, date);

  return (
    <div
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
