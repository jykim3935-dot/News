-- ACRYL Intelligence Brief v2.0 Schema Migration
-- 기존 schema.sql 실행 후 이 파일을 Supabase SQL Editor에서 실행

-- articles 테이블: 심층 분석 필드 추가
ALTER TABLE articles ADD COLUMN IF NOT EXISTS deep_summary text;
ALTER TABLE articles ADD COLUMN IF NOT EXISTS source_description text;
ALTER TABLE articles ADD COLUMN IF NOT EXISTS key_findings text[] DEFAULT '{}';
ALTER TABLE articles ADD COLUMN IF NOT EXISTS action_items text[] DEFAULT '{}';

-- articles content_type 제약 업데이트 (government, research 추가)
ALTER TABLE articles DROP CONSTRAINT IF EXISTS articles_content_type_check;
ALTER TABLE articles ADD CONSTRAINT articles_content_type_check
  CHECK (content_type IN ('news','report','consulting','global','investment','blog','government','research'));

-- sources content_type 제약 업데이트
ALTER TABLE sources DROP CONSTRAINT IF EXISTS sources_content_type_check;
ALTER TABLE sources ADD CONSTRAINT sources_content_type_check
  CHECK (content_type IN ('news','report','consulting','global','investment','blog','government','research'));

-- pipeline_runs 테이블: 경영진 브리프 + 트렌드 요약
ALTER TABLE pipeline_runs ADD COLUMN IF NOT EXISTS executive_brief text;
ALTER TABLE pipeline_runs ADD COLUMN IF NOT EXISTS trend_summary text;

-- trends 테이블 (신규)
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

CREATE INDEX IF NOT EXISTS idx_trends_batch_id ON trends(batch_id);
