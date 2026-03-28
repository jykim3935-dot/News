-- ACRYL Intelligence Brief - Database Schema
-- Run this in Supabase SQL Editor

-- Sources table
CREATE TABLE IF NOT EXISTS sources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  url text NOT NULL,
  type text NOT NULL CHECK (type IN ('rss', 'api', 'websearch', 'crawl')),
  content_type text NOT NULL CHECK (content_type IN ('news', 'report', 'consulting', 'global', 'investment', 'blog')),
  category text NOT NULL CHECK (category IN ('competitive', 'market', 'regulation', 'tech', 'customer', 'investment')),
  enabled boolean NOT NULL DEFAULT true,
  description text,
  created_at timestamptz DEFAULT now()
);

-- Keyword groups table
CREATE TABLE IF NOT EXISTS keyword_groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_name text NOT NULL,
  category text NOT NULL CHECK (category IN ('competitive', 'market', 'regulation', 'tech', 'customer', 'investment')),
  content_types text[] DEFAULT '{}',
  priority integer NOT NULL CHECK (priority IN (1, 2, 3)),
  keywords text[] NOT NULL,
  enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Pipeline runs table
CREATE TABLE IF NOT EXISTS pipeline_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id uuid UNIQUE NOT NULL DEFAULT gen_random_uuid(),
  status text NOT NULL CHECK (status IN ('running', 'completed', 'failed')) DEFAULT 'running',
  started_at timestamptz DEFAULT now(),
  completed_at timestamptz,
  articles_count integer DEFAULT 0,
  error text,
  created_at timestamptz DEFAULT now()
);

-- Articles table
CREATE TABLE IF NOT EXISTS articles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  url text NOT NULL,
  source text,
  content_type text NOT NULL CHECK (content_type IN ('news', 'report', 'consulting', 'global', 'investment', 'blog')),
  published_at text,
  summary text,
  matched_keywords text[] DEFAULT '{}',
  category text,
  relevance_score integer CHECK (relevance_score >= 1 AND relevance_score <= 10),
  urgency text CHECK (urgency IN ('red', 'yellow', 'green')),
  impact_comment text,
  batch_id uuid REFERENCES pipeline_runs(batch_id),
  created_at timestamptz DEFAULT now()
);

-- Recipients table
CREATE TABLE IF NOT EXISTS recipients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text NOT NULL UNIQUE,
  role text,
  enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_articles_batch_id ON articles(batch_id);
CREATE INDEX IF NOT EXISTS idx_articles_content_type ON articles(content_type);
CREATE INDEX IF NOT EXISTS idx_articles_created_at ON articles(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sources_enabled ON sources(enabled);
CREATE INDEX IF NOT EXISTS idx_keyword_groups_enabled ON keyword_groups(enabled);
