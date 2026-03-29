-- ============================================================
-- ACRYL Intelligence Brief — Full Schema (v3)
-- Supabase SQL Editor에서 한 번에 실행하세요.
-- ============================================================

-- 1. Sources (RSS/API 소스 관리)
CREATE TABLE IF NOT EXISTS sources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  url text NOT NULL,
  type text NOT NULL CHECK (type IN ('rss', 'api', 'websearch', 'crawl')),
  content_type text NOT NULL CHECK (content_type IN ('news','report','consulting','global','investment','blog','government','research')),
  category text NOT NULL CHECK (category IN ('competitive','market','regulation','tech','customer','investment')),
  enabled boolean NOT NULL DEFAULT true,
  description text,
  created_at timestamptz DEFAULT now()
);

-- 2. Keyword Groups (검색 키워드 그룹)
CREATE TABLE IF NOT EXISTS keyword_groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_name text NOT NULL,
  category text NOT NULL CHECK (category IN ('competitive','market','regulation','tech','customer','investment')),
  content_types text[] DEFAULT '{}',
  priority integer NOT NULL CHECK (priority IN (1, 2, 3)),
  keywords text[] NOT NULL,
  enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- 3. Pipeline Runs (파이프라인 실행 이력)
CREATE TABLE IF NOT EXISTS pipeline_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id uuid UNIQUE NOT NULL DEFAULT gen_random_uuid(),
  status text NOT NULL CHECK (status IN ('running', 'completed', 'failed')) DEFAULT 'running',
  started_at timestamptz DEFAULT now(),
  completed_at timestamptz,
  articles_count integer DEFAULT 0,
  error text,
  executive_brief text,
  trend_summary text,
  created_at timestamptz DEFAULT now()
);

-- 4. Articles (수집된 기사)
CREATE TABLE IF NOT EXISTS articles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  url text NOT NULL,
  source text,
  content_type text NOT NULL CHECK (content_type IN ('news','report','consulting','global','investment','blog','government','research')),
  published_at text,
  summary text,
  matched_keywords text[] DEFAULT '{}',
  category text,
  relevance_score integer CHECK (relevance_score >= 1 AND relevance_score <= 10),
  urgency text CHECK (urgency IN ('red', 'yellow', 'green')),
  impact_comment text,
  deep_summary text,
  source_description text,
  key_findings text[] DEFAULT '{}',
  action_items text[] DEFAULT '{}',
  title_ko text,
  summary_ko text,
  dedup_group text,
  batch_id uuid REFERENCES pipeline_runs(batch_id),
  created_at timestamptz DEFAULT now()
);

-- 5. Trends (트렌드 분석)
CREATE TABLE IF NOT EXISTS trends (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id uuid,
  trend_title text NOT NULL,
  trend_description text NOT NULL,
  related_article_ids uuid[] DEFAULT '{}',
  category text,
  strength text CHECK (strength IN ('rising','stable','emerging')),
  created_at timestamptz DEFAULT now()
);

-- 6. Recipients (뉴스레터 수신자)
CREATE TABLE IF NOT EXISTS recipients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text NOT NULL UNIQUE,
  role text,
  enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- ============================================================
-- Indexes
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_articles_batch_id ON articles(batch_id);
CREATE INDEX IF NOT EXISTS idx_articles_content_type ON articles(content_type);
CREATE INDEX IF NOT EXISTS idx_articles_created_at ON articles(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_articles_dedup ON articles(dedup_group);
CREATE INDEX IF NOT EXISTS idx_sources_enabled ON sources(enabled);
CREATE INDEX IF NOT EXISTS idx_keyword_groups_enabled ON keyword_groups(enabled);
CREATE INDEX IF NOT EXISTS idx_trends_batch_id ON trends(batch_id);
CREATE INDEX IF NOT EXISTS idx_pipeline_runs_status ON pipeline_runs(status);

-- ============================================================
-- RLS (Row Level Security) — 서비스 키 사용 시 bypass됨
-- API에서 service_role key를 쓰므로 간단하게 설정
-- ============================================================
ALTER TABLE sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE keyword_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE pipeline_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE articles ENABLE ROW LEVEL SECURITY;
ALTER TABLE trends ENABLE ROW LEVEL SECURITY;
ALTER TABLE recipients ENABLE ROW LEVEL SECURITY;

-- Service role은 RLS를 자동 bypass하므로 별도 policy 불필요
-- anon key로 읽기만 허용 (프론트엔드 직접 접근 시)
CREATE POLICY "anon_read_sources" ON sources FOR SELECT USING (true);
CREATE POLICY "anon_read_keyword_groups" ON keyword_groups FOR SELECT USING (true);
CREATE POLICY "anon_read_articles" ON articles FOR SELECT USING (true);
CREATE POLICY "anon_read_trends" ON trends FOR SELECT USING (true);
CREATE POLICY "anon_read_pipeline_runs" ON pipeline_runs FOR SELECT USING (true);
CREATE POLICY "anon_read_recipients" ON recipients FOR SELECT USING (true);
