-- ACRYL Intelligence Brief - Seed Data
-- Run this after schema.sql in Supabase SQL Editor

-- ============================================
-- SOURCES: 뉴스 (news)
-- ============================================
INSERT INTO sources (name, url, type, content_type, category, enabled, description) VALUES
-- 국내 매체
('ZDNet Korea', 'https://zdnet.co.kr/rss/newsall.xml', 'rss', 'news', 'market', true, '국내 IT/AI 종합 뉴스'),
('AI타임스', 'https://www.aitimes.com/rss/allArticle.xml', 'rss', 'news', 'market', true, 'AI 전문 뉴스'),
('전자신문', 'https://rss.etnews.com/Section901.xml', 'rss', 'news', 'market', true, 'IT/전자 산업 뉴스'),
('디지털데일리', 'https://www.ddaily.co.kr/rss/rss.xml', 'rss', 'news', 'market', true, 'IT/디지털 뉴스'),
('IT조선', 'http://it.chosun.com/svc/rss/www_rss.xml', 'rss', 'news', 'market', true, 'IT 뉴스'),
('블로터', 'https://www.bloter.net/feed', 'rss', 'news', 'tech', true, '테크 뉴스'),
('Google News Korea', 'https://news.google.com/rss/search?q=AI+인공지능+한국', 'rss', 'news', 'market', true, '구글 뉴스 AI 검색'),
-- 글로벌 매체
('TechCrunch AI', 'https://techcrunch.com/category/artificial-intelligence/feed/', 'rss', 'news', 'market', true, '글로벌 AI 뉴스'),
('The Verge AI', 'https://www.theverge.com/rss/ai-artificial-intelligence/index.xml', 'rss', 'news', 'tech', true, 'AI 기술 뉴스'),
('VentureBeat AI', 'https://venturebeat.com/category/ai/feed/', 'rss', 'news', 'market', true, 'AI 산업 뉴스'),
('Hacker News AI', 'https://hnrss.org/newest?q=GPU+AI+infrastructure', 'rss', 'news', 'tech', true, '해커뉴스 AI 인프라'),
('Reuters Tech', 'https://www.rss.reuters.com/technology', 'rss', 'news', 'market', true, '로이터 테크');

-- ============================================
-- SOURCES: 리서치 보고서 (report)
-- ============================================
INSERT INTO sources (name, url, type, content_type, category, enabled, description) VALUES
('SPRi (SW정책연구소)', 'https://spri.kr', 'websearch', 'report', 'market', true, 'AI 산업 동향, SW 정책'),
('KIET (산업연구원)', 'https://kiet.re.kr', 'websearch', 'report', 'market', true, '산업 AI 확산, 제조업 AI'),
('ETRI (전자통신연구원)', 'https://etri.re.kr', 'websearch', 'report', 'tech', true, 'AI 기술 동향'),
('IITP (정보통신기획평가원)', 'https://iitp.kr', 'websearch', 'report', 'tech', true, 'ICT R&D 동향, 주간기술동향'),
('NIA (한국지능정보사회진흥원)', 'https://nia.or.kr', 'websearch', 'report', 'market', true, 'AI 활용 사례, 데이터 정책'),
('KDI (한국개발연구원)', 'https://kdi.re.kr', 'websearch', 'report', 'market', true, '경제전망, 산업분석'),
('KISDI (정보통신정책연구원)', 'https://kisdi.re.kr', 'websearch', 'report', 'regulation', true, '디지털 정책, AI 규제'),
('KISA (한국인터넷진흥원)', 'https://kisa.or.kr', 'websearch', 'report', 'regulation', true, 'AI 보안, 개인정보');

-- ============================================
-- SOURCES: 컨설팅 (consulting)
-- ============================================
INSERT INTO sources (name, url, type, content_type, category, enabled, description) VALUES
('McKinsey AI', 'https://mckinsey.com/capabilities/quantumblack/our-insights', 'websearch', 'consulting', 'market', true, 'AI 전략, 디지털전환'),
('BCG AI', 'https://bcg.com/x/artificial-intelligence', 'websearch', 'consulting', 'market', true, '기업 AI 도입'),
('Gartner', 'https://gartner.com/en/newsroom', 'websearch', 'consulting', 'market', true, 'Hype Cycle, Magic Quadrant'),
('IDC', 'https://idc.com', 'websearch', 'consulting', 'market', true, 'GPU 시장, 인프라 전망'),
('Forrester', 'https://forrester.com', 'websearch', 'consulting', 'market', true, 'AI 플랫폼 평가'),
('Deloitte AI', 'https://deloitte.com/insights', 'websearch', 'consulting', 'market', true, 'State of AI, 산업별 AI');

-- ============================================
-- SOURCES: 글로벌 기관 (global)
-- ============================================
INSERT INTO sources (name, url, type, content_type, category, enabled, description) VALUES
('OECD AI Policy', 'https://oecd.ai', 'websearch', 'global', 'regulation', true, 'AI 정책 비교, 규제 동향'),
('Stanford HAI', 'https://hai.stanford.edu/news', 'websearch', 'global', 'tech', true, 'AI Index, 연구 트렌드'),
('World Economic Forum', 'https://weforum.org', 'websearch', 'global', 'regulation', true, 'AI 거버넌스, 글로벌 트렌드'),
('MIT Technology Review', 'https://www.technologyreview.com/feed/', 'rss', 'global', 'tech', true, 'AI 기술 심층 분석'),
('arXiv AI', 'http://arxiv.org/rss/cs.AI', 'rss', 'global', 'tech', false, '최신 AI 논문 (Phase 3)');

-- ============================================
-- SOURCES: 투자/IR (investment)
-- ============================================
INSERT INTO sources (name, url, type, content_type, category, enabled, description) VALUES
('DART 공시', 'https://opendart.fss.or.kr/api/', 'api', 'investment', 'investment', false, '경쟁사/동종업계 공시 (DART API 필요)'),
('한국거래소 KIND', 'https://kind.krx.co.kr', 'websearch', 'investment', 'investment', true, 'KOSDAQ AI 종목 공시'),
('CB Insights', 'https://cbinsights.com', 'websearch', 'investment', 'investment', true, 'AI 스타트업 투자 트렌드'),
('Crunchbase', 'https://crunchbase.com', 'websearch', 'investment', 'investment', true, 'AI 인프라 VC/PE 딜'),
('NVIDIA IR', 'https://nvidianews.nvidia.com', 'websearch', 'investment', 'investment', true, 'NVIDIA 실적, 전략, 파트너십');

-- ============================================
-- SOURCES: 기업/기술 블로그 (blog)
-- ============================================
INSERT INTO sources (name, url, type, content_type, category, enabled, description) VALUES
('NVIDIA Blog', 'https://blogs.nvidia.com', 'websearch', 'blog', 'tech', true, 'GPU 기술, 파트너 사례'),
('Anthropic Blog', 'https://anthropic.com/news', 'websearch', 'blog', 'tech', true, 'Claude, AI Safety'),
('OpenAI Blog', 'https://openai.com/blog', 'websearch', 'blog', 'tech', true, 'GPT, API 업데이트'),
('Google AI Blog', 'https://blog.google/technology/ai/', 'websearch', 'blog', 'tech', true, 'Gemini, TPU, AI 인프라'),
('Hugging Face Blog', 'https://huggingface.co/blog', 'websearch', 'blog', 'tech', true, '오픈소스 AI, 모델 트렌드'),
('a16z AI Blog', 'https://a16z.com/artificial-intelligence/', 'websearch', 'blog', 'investment', true, 'AI 투자, 시장 분석');

-- ============================================
-- KEYWORD GROUPS: 뉴스/경쟁 키워드
-- ============================================
INSERT INTO keyword_groups (group_name, category, content_types, priority, keywords, enabled) VALUES
('직접경쟁사', 'competitive', '{}', 1, ARRAY['제논', 'GenOn', '마인즈앤컴퍼니', '코어에이아이'], true),
('GPU클라우드 경쟁', 'competitive', '{}', 1, ARRAY['Run:ai', 'NVIDIA DGX Cloud', 'CoreWeave', 'Lambda Labs'], true),
('AI 인프라 시장', 'market', '{}', 1, ARRAY['AI 인프라', 'GPU 클러스터', 'AI 데이터센터', 'NVIDIA 실적'], true),
('에이전트 AI', 'market', '{}', 1, ARRAY['AI 에이전트', 'Agentic AI', 'MCP 프로토콜', '멀티에이전트'], true),
('헬스케어 AI', 'market', '{}', 1, ARRAY['의료AI', '디지털 헬스케어', 'SaMD', '디지털치료제'], true),
('정부 AI 정책', 'regulation', '{}', 1, ARRAY['AI 국가전략', 'GPU 도입', '공공 AI', '디지털플랫폼정부'], true),
('조달/입찰', 'regulation', '{}', 2, ARRAY['나라장터', '조달청 AI', '혁신제품', 'GS인증'], true),
('LLM/파운데이션', 'tech', '{}', 2, ARRAY['LLM', 'sLLM', 'RAG', '파인튜닝'], true),
('MLOps', 'tech', '{}', 2, ARRAY['MLOps', 'Kubernetes GPU', '모델서빙'], true),
('주요 파트너', 'customer', '{}', 2, ARRAY['KT AI', '삼성SDS AI', '메가존클라우드'], true),
('주요 고객사', 'customer', '{}', 2, ARRAY['강원랜드', '한국가스기술공사', 'KODATA', '아산병원'], true);

-- ============================================
-- KEYWORD GROUPS: 보고서/컨설팅 키워드 (v2)
-- ============================================
INSERT INTO keyword_groups (group_name, category, content_types, priority, keywords, enabled) VALUES
('GPU 시장 리서치', 'market', ARRAY['report', 'consulting'], 1, ARRAY['GPU market forecast', 'AI accelerator market', 'GPU-as-a-Service'], true),
('AI 인프라 리서치', 'market', ARRAY['report', 'consulting'], 1, ARRAY['AI infrastructure report', 'data center AI', 'AI cloud market'], true),
('Gartner AI', 'market', ARRAY['consulting'], 1, ARRAY['Gartner AI', 'Magic Quadrant AI', 'Hype Cycle AI infrastructure'], true),
('McKinsey AI', 'market', ARRAY['consulting'], 2, ARRAY['McKinsey AI', 'BCG artificial intelligence', 'Deloitte AI'], true),
('IDC GPU', 'market', ARRAY['consulting'], 1, ARRAY['IDC GPU forecast', 'IDC AI infrastructure', 'IDC server market'], true);

-- ============================================
-- KEYWORD GROUPS: 글로벌 기관 키워드 (v2)
-- ============================================
INSERT INTO keyword_groups (group_name, category, content_types, priority, keywords, enabled) VALUES
('OECD AI', 'regulation', ARRAY['global'], 2, ARRAY['OECD AI policy', 'AI governance framework'], true),
('Stanford HAI', 'tech', ARRAY['global'], 2, ARRAY['Stanford HAI AI Index', 'AI research trends'], true),
('글로벌 AI 규제', 'regulation', ARRAY['global'], 1, ARRAY['EU AI Act', 'AI regulation', 'AI safety framework'], true);

-- ============================================
-- KEYWORD GROUPS: 투자/IR 키워드 (v2)
-- ============================================
INSERT INTO keyword_groups (group_name, category, content_types, priority, keywords, enabled) VALUES
('AI 인프라 투자', 'investment', ARRAY['investment'], 1, ARRAY['AI infrastructure investment', 'GPU startup funding', 'AI VC deal'], true),
('KOSDAQ AI', 'investment', ARRAY['investment'], 1, ARRAY['KOSDAQ AI 종목', 'AI 인프라 상장사', 'GPU 관련주'], true),
('NVIDIA IR', 'investment', ARRAY['investment'], 1, ARRAY['NVIDIA earnings', 'NVIDIA revenue GPU', 'NVIDIA data center'], true),
('경쟁사 IR', 'investment', ARRAY['investment'], 1, ARRAY['제논 실적', 'GenOn 공시', 'AI 플랫폼 기업 실적'], true),
('디지털헬스 투자', 'investment', ARRAY['investment'], 2, ARRAY['digital health investment', '의료AI 투자', 'SaMD funding'], true);

-- ============================================
-- KEYWORD GROUPS: 기술 블로그 키워드 (v2)
-- ============================================
INSERT INTO keyword_groups (group_name, category, content_types, priority, keywords, enabled) VALUES
('GPU/인프라 블로그', 'tech', ARRAY['blog'], 2, ARRAY['NVIDIA blog GPU', 'CUDA update', 'GPU orchestration'], true),
('AI 에이전트 블로그', 'tech', ARRAY['blog'], 1, ARRAY['MCP server', 'AI agent framework', 'tool use API'], true),
('LLM 블로그', 'tech', ARRAY['blog'], 2, ARRAY['Claude update', 'GPT release', 'open source LLM'], true);
