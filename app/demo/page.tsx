import { renderNewsletter } from "@/lib/newsletter";
import type { Article, Trend } from "@/lib/supabase";

const SAMPLE_ARTICLES: Article[] = [
  // 📰 뉴스
  {
    id: "1", title: "NVIDIA, 차세대 Blackwell Ultra GPU 양산 본격화…AI 인프라 수요 급증",
    url: "https://example.com/1", source: "ZDNet Korea", content_type: "news",
    published_at: "2026-03-28", summary: "NVIDIA가 Blackwell Ultra GPU의 대량 양산을 시작하며 AI 데이터센터 인프라 시장의 폭발적 성장을 견인하고 있다.",
    matched_keywords: ["NVIDIA", "GPU", "AI 인프라"], category: "market",
    relevance_score: 9, urgency: "red",
    impact_comment: "GPUBASE의 Blackwell Ultra 지원 준비 시급. 고객사 GPU 업그레이드 수요 대응 전략 필요.",
    deep_summary: "NVIDIA가 차세대 Blackwell Ultra GPU의 대량 양산을 공식 개시했다. Blackwell Ultra는 이전 세대 대비 FP8 추론 성능이 2.5배 향상되었으며, 멀티테넌시 지원이 하드웨어 레벨에서 강화되었다. 이에 따라 글로벌 하이퍼스케일러들의 사전 주문이 쇄도하고 있으며, 국내 AI 인프라 기업들도 신규 GPU 지원을 위한 플랫폼 업데이트에 돌입했다. ACRYL의 GPUBASE는 GPU 오케스트레이션 플랫폼으로서 Blackwell Ultra의 새로운 MIG 파티셔닝 기능과 NVLink 6.0 지원이 핵심 과제가 될 전망이다.",
    source_description: "ZDNet Korea는 국내 최대 IT/테크 전문 매체로 기업 IT 의사결정자들이 주요 독자층",
    key_findings: ["Blackwell Ultra FP8 추론 성능 2.5배 향상", "하드웨어 레벨 멀티테넌시 지원 강화", "국내 AI 인프라 기업 플랫폼 업데이트 돌입"],
    action_items: ["GPUBASE Blackwell Ultra 호환성 검증 TF 구성", "KT·삼성SDS에 신규 GPU 지원 로드맵 공유"],
    batch_id: "demo", created_at: "2026-03-28",
  },
  {
    id: "2", title: "제논(GenOn), 공공기관 AI 플랫폼 수주 100억원 돌파",
    url: "https://example.com/2", source: "전자신문", content_type: "news",
    published_at: "2026-03-27", summary: "경쟁사 제논이 올해 공공기관 AI 플랫폼 수주 누적 100억원을 돌파했다고 발표.",
    matched_keywords: ["제논", "GenOn", "공공 AI"], category: "competitive",
    relevance_score: 10, urgency: "red",
    impact_comment: "직접 경쟁사 제논의 공공부문 확대 경계 필요. ACRYL의 GS인증/혁신제품 장점을 활용한 공공 영업 강화 시급.",
    deep_summary: "직접 경쟁사 제논(구 마인즈앤컴퍼니)이 2026년 공공기관 AI 플랫폼 수주 누적 100억원을 돌파했다. 주요 수주처는 국방부 AI 센터, 국립중앙의료원, 한국전력 등이며, GPU 클러스터 관리 솔루션을 중심으로 확장하고 있다. 특히 나라장터 혁신제품 등록을 통한 수의계약 비중이 40%에 달해 ACRYL의 GS인증·혁신제품 등록 전략과 직접 경쟁 구도가 형성되고 있다.",
    source_description: "전자신문은 국내 IT/전자 산업 전문 일간지로 공공·기업 IT 조달 시장에 높은 영향력 보유",
    key_findings: ["제논 공공 수주 100억 돌파 (국방부, 국립중앙의료원, 한국전력)", "나라장터 혁신제품 수의계약 비중 40%", "GPU 클러스터 관리 솔루션 중심 확장"],
    action_items: ["공공부문 영업팀 긴급 대응 회의 소집", "제논 혁신제품 등록 현황 파악 및 ACRYL 차별화 포인트 정리"],
    batch_id: "demo", created_at: "2026-03-28",
  },
  {
    id: "3", title: "KT, 기업용 AI 에이전트 플랫폼 'KT Agentic' 출시",
    url: "https://example.com/3", source: "AI타임스", content_type: "news",
    published_at: "2026-03-28", summary: "KT가 MCP 기반 기업용 AI 에이전트 플랫폼을 출시하며 B2B AI 시장 공략을 본격화.",
    matched_keywords: ["KT AI", "AI 에이전트", "MCP"], category: "customer",
    relevance_score: 8, urgency: "yellow",
    impact_comment: "주요 파트너 KT의 에이전트 플랫폼 출시. AGENTBASE와의 기술 연동/파트너십 확대 기회.",
    deep_summary: null, source_description: null, key_findings: [], action_items: [],
    batch_id: "demo", created_at: "2026-03-28",
  },
  {
    id: "4", title: "CoreWeave, $7.5B 시리즈 C 라운드 클로징…GPU 클라우드 경쟁 심화",
    url: "https://example.com/4", source: "TechCrunch", content_type: "news",
    published_at: "2026-03-27", summary: "GPU 클라우드 스타트업 CoreWeave가 역대 최대 규모 펀딩을 확보하며 글로벌 AI 인프라 경쟁이 가열.",
    matched_keywords: ["CoreWeave", "GPU 클라우드"], category: "competitive",
    relevance_score: 7, urgency: "yellow",
    impact_comment: "글로벌 GPU 클라우드 시장 경쟁 심화. GPUBASE의 차별화 포인트(오케스트레이션, 멀티클라우드) 강화 필요.",
    deep_summary: null, source_description: null, key_findings: [], action_items: [],
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
    deep_summary: "SPRi(SW정책연구소)가 발간한 '2026 AI 인프라 시장 전망' 보고서에 따르면 국내 AI 인프라 시장 규모가 2025년 2.1조원에서 2026년 3.2조원으로 52% 성장할 전망이다. 특히 GPU 오케스트레이션/관리 소프트웨어 시장이 전체 AI 인프라 시장의 15%(약 4,800억원)를 차지할 것으로 예측했다. 공공부문 AI 인프라 투자가 전년 대비 80% 증가하며 성장을 견인할 전망이다.",
    source_description: "SPRi(SW정책연구소)는 과학기술정보통신부 산하 SW 정책 전문 연구기관으로 국내 SW/AI 시장 통계의 공신력 있는 출처",
    key_findings: ["국내 AI 인프라 시장 2026년 3.2조원 (YoY +52%)", "GPU 오케스트레이션 SW 시장 ~4,800억원 (전체 15%)", "공공부문 AI 인프라 투자 YoY +80%"],
    action_items: ["IR 발표자료에 SPRi 시장 규모 데이터 반영", "TAM 4,800억원 기준 시장점유율 목표 재설정"],
    batch_id: "demo", created_at: "2026-03-28",
  },
  {
    id: "7", title: "IITP 주간기술동향: MLOps 플랫폼 기술 동향 분석",
    url: "https://example.com/7", source: "IITP (정보통신기획평가원)", content_type: "report",
    published_at: "2026-03-26", summary: "국내외 MLOps 플랫폼 기술 동향을 분석하고 주요 기업별 기술 비교를 제공.",
    matched_keywords: ["MLOps", "AI 플랫폼"], category: "tech",
    relevance_score: 7, urgency: "green",
    impact_comment: "FLIGHTBASE MLOps 포지셔닝 참고 자료. 경쟁 제품 대비 차별화 포인트 정리에 활용.",
    deep_summary: null, source_description: null, key_findings: [], action_items: [],
    batch_id: "demo", created_at: "2026-03-28",
  },

  // 🎓 학술 & 리서치 (v2 신규)
  {
    id: "16", title: "Efficient GPU Cluster Scheduling for Large-Scale LLM Training with Heterogeneous Resources",
    url: "https://example.com/16", source: "arXiv (MLSys 2026)", content_type: "research",
    published_at: "2026-03-26", summary: "이기종 GPU 클러스터에서 대규모 LLM 학습 워크로드를 효율적으로 스케줄링하는 새로운 알고리즘 제안.",
    matched_keywords: ["GPU scheduling", "multi-tenant GPU"], category: "tech",
    relevance_score: 9, urgency: "yellow",
    impact_comment: "GPUBASE의 GPU 스케줄링 알고리즘 개선에 직접 적용 가능한 연구. R&D팀 검토 필요.",
    deep_summary: "본 논문은 H100, A100, L40S 등 이기종 GPU가 혼재된 클러스터 환경에서 LLM 학습 워크로드의 최적 배치 문제를 다룬다. 기존 First-Fit-Decreasing 방식 대비 25% 높은 GPU 활용률을 달성하는 Topology-Aware Heterogeneous Scheduling(TAHS) 알고리즘을 제안했다. 특히 NVLink/NVSwitch 토폴로지를 고려한 통신 최적화가 핵심으로, 32~128 GPU 규모 클러스터에서 검증되었다.",
    source_description: "arXiv는 코넬대학교 운영 오픈 액세스 논문 플랫폼으로, ML/AI 분야 최신 연구가 가장 빠르게 공개되는 채널",
    key_findings: ["이기종 GPU 클러스터 스케줄링 TAHS 알고리즘 제안", "기존 대비 GPU 활용률 25% 향상", "NVLink 토폴로지 고려 통신 최적화"],
    action_items: ["R&D팀에 TAHS 알고리즘 GPUBASE 적용 가능성 검토 요청", "논문 저자 컨택하여 기술 협력 가능성 탐색"],
    batch_id: "demo", created_at: "2026-03-28",
  },
  {
    id: "17", title: "MCP-Agent: A Unified Framework for Multi-Tool AI Agent Orchestration",
    url: "https://example.com/17", source: "arXiv (NeurIPS 2026 Workshop)", content_type: "research",
    published_at: "2026-03-25", summary: "MCP 프로토콜 기반 다중 도구 AI 에이전트 오케스트레이션 프레임워크를 제안하고 벤치마크 성능을 비교.",
    matched_keywords: ["AI agent", "MCP protocol", "agent orchestration"], category: "tech",
    relevance_score: 8, urgency: "yellow",
    impact_comment: "AGENTBASE의 MCP 네이티브 에이전트 오케스트레이션 기술과 직결. 최신 벤치마크 반영 검토.",
    deep_summary: null, source_description: null, key_findings: [], action_items: [],
    batch_id: "demo", created_at: "2026-03-28",
  },

  // 💼 컨설팅
  {
    id: "8", title: "Gartner, 2026 AI Infrastructure Magic Quadrant 발표",
    url: "https://example.com/8", source: "Gartner", content_type: "consulting",
    published_at: "2026-03-20", summary: "Gartner가 AI Infrastructure Magic Quadrant를 발표. GPU 오케스트레이션이 핵심 평가 항목으로 신규 추가.",
    matched_keywords: ["Gartner AI", "Magic Quadrant"], category: "market",
    relevance_score: 8, urgency: "yellow",
    impact_comment: "Gartner MQ에 GPU 오케스트레이션 카테고리 추가는 GPUBASE 시장 검증. 마케팅/IR에 적극 인용.",
    deep_summary: null, source_description: "Gartner는 IT 리서치·자문 분야 세계 1위 기관으로 Magic Quadrant 등 업계 표준 평가를 발행",
    key_findings: ["GPU 오케스트레이션 MQ 핵심 평가 항목 신규 추가", "Run:ai(NVIDIA 인수)가 Leaders 사분면 배치"],
    action_items: ["Gartner 분석가 브리핑 요청하여 GPUBASE 인지도 확보"],
    batch_id: "demo", created_at: "2026-03-28",
  },
  {
    id: "9", title: "IDC, 글로벌 GPU 서버 시장 2026년 $150B 전망",
    url: "https://example.com/9", source: "IDC", content_type: "consulting",
    published_at: "2026-03-22", summary: "IDC가 글로벌 GPU 서버 시장이 전년 대비 45% 성장한 $150B에 달할 것으로 전망.",
    matched_keywords: ["IDC GPU forecast", "GPU 시장"], category: "market",
    relevance_score: 7, urgency: "green",
    impact_comment: "IDC 시장 규모 데이터를 TAM/SAM 산출 및 IR 발표 자료에 활용.",
    deep_summary: null, source_description: null, key_findings: [], action_items: [],
    batch_id: "demo", created_at: "2026-03-28",
  },

  // 🏛️ 정부정책 (v2 신규)
  {
    id: "18", title: "과기정통부, AI 국가전략 2.0 발표…GPU 인프라 투자 2조원 확대",
    url: "https://example.com/18", source: "과학기술정보통신부", content_type: "government",
    published_at: "2026-03-28", summary: "과기정통부가 AI 국가전략 2.0을 발표하며 GPU 인프라 투자를 2조원 규모로 확대한다고 밝혔다.",
    matched_keywords: ["AI 국가전략", "GPU 도입", "공공 AI"], category: "regulation",
    relevance_score: 10, urgency: "red",
    impact_comment: "정부 GPU 인프라 대규모 투자는 ACRYL에 직접적 수혜. 나라장터/조달청 입찰 준비 즉시 착수 필요.",
    deep_summary: "과학기술정보통신부가 'AI 국가전략 2.0'을 발표하며 2026~2028년 3개년간 GPU 인프라에 2조원을 투자한다고 밝혔다. 핵심 내용은 (1) 국가 AI 컴퓨팅 센터 3곳 추가 구축(세종, 부산, 광주) (2) 공공기관 AI 인프라 클라우드 전환 의무화 (3) AI 인프라 관리 SW 우선구매제 도입이다. 특히 GPU 오케스트레이션 SW가 '혁신제품' 카테고리에 포함되어 수의계약 대상이 될 전망이다.",
    source_description: "과학기술정보통신부는 대한민국 과학기술·ICT 정책 수립 중앙행정기관으로 AI 정책의 최상위 의사결정 기관",
    key_findings: ["2026-2028 GPU 인프라 투자 2조원 확정", "국가 AI 컴퓨팅 센터 3곳 추가 구축 (세종/부산/광주)", "GPU 오케스트레이션 SW 혁신제품 카테고리 포함 → 수의계약 가능"],
    action_items: ["조달청 혁신제품 등록 갱신 및 GPU 오케스트레이션 카테고리 확인", "국가 AI 컴퓨팅 센터 입찰 참여를 위한 컨소시엄 구성 착수"],
    batch_id: "demo", created_at: "2026-03-28",
  },
  {
    id: "19", title: "AI기본법 국회 본회의 통과…공공 AI 시스템 안전성 평가 의무화",
    url: "https://example.com/19", source: "국회", content_type: "government",
    published_at: "2026-03-27", summary: "AI기본법이 국회 본회의를 통과하며 공공기관 AI 시스템에 대한 안전성 평가가 의무화되었다.",
    matched_keywords: ["AI기본법", "AI 규제"], category: "regulation",
    relevance_score: 8, urgency: "yellow",
    impact_comment: "공공 AI 안전성 평가 의무화로 JONATHAN 플랫폼의 거버넌스/모니터링 기능이 경쟁 우위 요소.",
    deep_summary: null, source_description: null, key_findings: [], action_items: [],
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
    deep_summary: null, source_description: null, key_findings: [], action_items: [],
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
    deep_summary: null, source_description: null, key_findings: [], action_items: [],
    batch_id: "demo", created_at: "2026-03-28",
  },
  {
    id: "13", title: "KOSDAQ AI 인프라 섹터 시가총액 10조원 돌파",
    url: "https://example.com/13", source: "한국거래소", content_type: "investment",
    published_at: "2026-03-27", summary: "KOSDAQ AI 인프라 관련 종목들의 합산 시가총액이 처음으로 10조원을 돌파.",
    matched_keywords: ["KOSDAQ AI 종목", "AI 인프라 상장사"], category: "investment",
    relevance_score: 8, urgency: "yellow",
    impact_comment: "KOSDAQ AI 인프라 섹터 성장은 ACRYL 기업가치 재평가 기대. IR 스토리텔링에 활용.",
    deep_summary: null, source_description: null, key_findings: [], action_items: [],
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
    deep_summary: null, source_description: null, key_findings: [], action_items: [],
    batch_id: "demo", created_at: "2026-03-28",
  },
  {
    id: "15", title: "NVIDIA Blog: CUDA 13.0 릴리즈 - GPU 멀티테넌시 강화",
    url: "https://example.com/15", source: "NVIDIA Blog", content_type: "blog",
    published_at: "2026-03-26", summary: "NVIDIA가 CUDA 13.0을 릴리즈하며 GPU 멀티테넌시와 오케스트레이션 API를 대폭 강화.",
    matched_keywords: ["NVIDIA blog GPU", "CUDA update", "GPU orchestration"], category: "tech",
    relevance_score: 9, urgency: "red",
    impact_comment: "CUDA 13.0의 멀티테넌시 강화는 GPUBASE 핵심 기능과 직결. 즉시 기술검토 및 지원 계획 수립 필요.",
    deep_summary: null, source_description: null, key_findings: [], action_items: [],
    batch_id: "demo", created_at: "2026-03-28",
  },
];

const SAMPLE_TRENDS: Trend[] = [
  {
    id: "t1",
    batch_id: "demo",
    trend_title: "GPU 인프라 투자 급증",
    trend_description: "정부 AI 국가전략 2.0의 2조원 GPU 투자 발표, NVIDIA Blackwell Ultra 양산, CoreWeave $7.5B 펀딩 등 GPU 인프라 투자가 공공·민간 양측에서 동시 급증하고 있다. ACRYL의 GPUBASE는 이 흐름의 직접적 수혜 제품으로, 공공 입찰 및 엔터프라이즈 영업 모두에서 기회가 확대된다.",
    related_article_ids: ["1", "4", "18"],
    category: "market",
    strength: "rising",
    created_at: "2026-03-28",
  },
  {
    id: "t2",
    batch_id: "demo",
    trend_title: "AI 에이전트 생태계 확장",
    trend_description: "KT의 MCP 기반 에이전트 플랫폼 출시, Anthropic의 MCP 가이드 업데이트, 학계의 멀티툴 에이전트 프레임워크 연구 등 AI 에이전트 오케스트레이션 생태계가 빠르게 확장 중이다. AGENTBASE의 MCP 네이티브 지원이 시장 타이밍과 정확히 일치한다.",
    related_article_ids: ["3", "14", "17"],
    category: "tech",
    strength: "rising",
    created_at: "2026-03-28",
  },
  {
    id: "t3",
    batch_id: "demo",
    trend_title: "공공 AI 규제·인증 강화",
    trend_description: "AI기본법 통과, EU AI Act 시행, 공공 AI 안전성 평가 의무화 등 AI 규제 프레임워크가 국내외에서 동시 강화되고 있다. GS인증·혁신제품 등록을 보유한 ACRYL은 규제 강화 환경에서 경쟁 우위를 확보할 수 있다.",
    related_article_ids: ["19", "10", "18"],
    category: "regulation",
    strength: "emerging",
    created_at: "2026-03-28",
  },
  {
    id: "t4",
    batch_id: "demo",
    trend_title: "경쟁사 공공시장 확대",
    trend_description: "제논의 공공 수주 100억 돌파와 GPU 오케스트레이션 SW의 혁신제품 카테고리 포함은 공공 AI 인프라 시장의 경쟁이 본격화되고 있음을 시사한다. 선제적 입찰 전략과 레퍼런스 확보가 핵심이다.",
    related_article_ids: ["2", "18"],
    category: "competitive",
    strength: "rising",
    created_at: "2026-03-28",
  },
];

const SAMPLE_EXECUTIVE_BRIEF = `1. [긴급] 제논 공공 수주 100억 돌파 — 직접 경쟁사가 국방부·한국전력 등 공공 AI 플랫폼 시장을 빠르게 장악 중. ACRYL의 GS인증·혁신제품 장점을 활용한 공공 영업 즉시 강화 필요.
2. [긴급] 정부 AI 국가전략 2.0 발표, GPU 인프라 2조원 투자 확정 — 국가 AI 컴퓨팅 센터 3곳 추가 구축 예정. GPU 오케스트레이션 SW가 혁신제품 카테고리에 포함되어 GPUBASE 직접 수혜.
3. NVIDIA Blackwell Ultra 양산 개시 + CUDA 13.0 멀티테넌시 강화 — GPUBASE의 차세대 GPU 지원이 시급하며, 동시에 Gartner가 GPU 오케스트레이션을 MQ 핵심 평가 항목으로 추가해 시장이 공식 검증됨.`;

export default function DemoPage() {
  const date = new Date().toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "long",
  });

  const html = renderNewsletter({
    articles: SAMPLE_ARTICLES,
    date,
    executiveBrief: SAMPLE_EXECUTIVE_BRIEF,
    trends: SAMPLE_TRENDS,
  });

  return (
    <div
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
