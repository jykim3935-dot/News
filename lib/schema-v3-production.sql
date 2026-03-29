-- ACRYL Intelligence Brief v3.0 - Production Migration
-- 기존 schema.sql + schema-v2.sql 실행 후 이 파일을 Supabase SQL Editor에서 실행
-- 변경사항: 번역 컬럼 추가, RLS 정책, 인덱스 최적화

-- ============================================
-- 1. articles 테이블: 번역 관련 컬럼 추가
-- ============================================
ALTER TABLE articles ADD COLUMN IF NOT EXISTS original_language text DEFAULT 'ko';
ALTER TABLE articles ADD COLUMN IF NOT EXISTS original_title text;
ALTER TABLE articles ADD COLUMN IF NOT EXISTS original_summary text;

-- 인덱스: 번역 필터링용
CREATE INDEX IF NOT EXISTS idx_articles_original_language ON articles(original_language);

-- ============================================
-- 2. RLS (Row Level Security) 활성화
-- ============================================
-- 모든 테이블에 RLS 활성화
ALTER TABLE sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE keyword_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE articles ENABLE ROW LEVEL SECURITY;
ALTER TABLE recipients ENABLE ROW LEVEL SECURITY;
ALTER TABLE pipeline_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE trends ENABLE ROW LEVEL SECURITY;

-- anon 사용자: 읽기 전용 (대시보드 조회용)
CREATE POLICY IF NOT EXISTS "anon_read_sources" ON sources
  FOR SELECT TO anon USING (true);

CREATE POLICY IF NOT EXISTS "anon_read_keyword_groups" ON keyword_groups
  FOR SELECT TO anon USING (true);

CREATE POLICY IF NOT EXISTS "anon_read_articles" ON articles
  FOR SELECT TO anon USING (true);

CREATE POLICY IF NOT EXISTS "anon_read_pipeline_runs" ON pipeline_runs
  FOR SELECT TO anon USING (true);

CREATE POLICY IF NOT EXISTS "anon_read_trends" ON trends
  FOR SELECT TO anon USING (true);

-- recipients는 anon에서 읽기 차단 (이메일 보호)
-- service_role은 RLS를 무시하므로 별도 정책 불필요

-- service_role: 모든 작업 가능 (RLS bypass 기본 동작)
-- 참고: service_role key는 서버 사이드에서만 사용

-- ============================================
-- 3. 추가 인덱스 (운영 성능 최적화)
-- ============================================
CREATE INDEX IF NOT EXISTS idx_articles_relevance_score ON articles(relevance_score DESC);
CREATE INDEX IF NOT EXISTS idx_articles_urgency ON articles(urgency);
CREATE INDEX IF NOT EXISTS idx_pipeline_runs_status ON pipeline_runs(status);
CREATE INDEX IF NOT EXISTS idx_pipeline_runs_started_at ON pipeline_runs(started_at DESC);
CREATE INDEX IF NOT EXISTS idx_trends_created_at ON trends(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_recipients_enabled ON recipients(enabled);

-- ============================================
-- 4. batch_id에 대한 복합 인덱스 (파이프라인 조회 최적화)
-- ============================================
CREATE INDEX IF NOT EXISTS idx_articles_batch_relevance
  ON articles(batch_id, relevance_score DESC);
