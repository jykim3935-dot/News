/**
 * Auto-migration: creates tables and seeds data on first run.
 * Called once per cold start when Supabase is configured.
 */
import { supabase, isSupabaseConfigured } from "./supabase";
import { DEFAULT_SOURCES, DEFAULT_KEYWORD_GROUPS } from "./default-presets";

let migrationDone = false;

const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS sources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  url text NOT NULL,
  type text NOT NULL,
  content_type text NOT NULL,
  category text NOT NULL,
  enabled boolean NOT NULL DEFAULT true,
  description text,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS keyword_groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_name text NOT NULL,
  category text NOT NULL,
  content_types text[] DEFAULT '{}',
  priority integer NOT NULL,
  keywords text[] NOT NULL,
  enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS pipeline_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id uuid UNIQUE NOT NULL DEFAULT gen_random_uuid(),
  status text NOT NULL DEFAULT 'running',
  started_at timestamptz DEFAULT now(),
  completed_at timestamptz,
  articles_count integer DEFAULT 0,
  error text,
  executive_brief text,
  trend_summary text,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS articles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  url text NOT NULL,
  source text,
  content_type text NOT NULL,
  published_at text,
  summary text,
  matched_keywords text[] DEFAULT '{}',
  category text,
  relevance_score integer,
  urgency text,
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

CREATE TABLE IF NOT EXISTS trends (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id uuid,
  trend_title text NOT NULL,
  trend_description text NOT NULL,
  related_article_ids uuid[] DEFAULT '{}',
  category text,
  strength text,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS recipients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text NOT NULL UNIQUE,
  role text,
  enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_articles_batch_id ON articles(batch_id);
CREATE INDEX IF NOT EXISTS idx_articles_created_at ON articles(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sources_enabled ON sources(enabled);
CREATE INDEX IF NOT EXISTS idx_keyword_groups_enabled ON keyword_groups(enabled);
CREATE INDEX IF NOT EXISTS idx_trends_batch_id ON trends(batch_id);
`;

export async function ensureMigration(): Promise<void> {
  if (migrationDone || !isSupabaseConfigured()) return;

  try {
    // Check if tables exist by trying a simple query
    const { error } = await supabase.from("sources").select("id").limit(1);

    if (error && error.message.includes("does not exist")) {
      console.log("[migrate] Tables not found, creating schema...");
      // Run schema via rpc if available, or use individual creates
      const { error: rpcError } = await supabase.rpc("exec_sql", { sql: SCHEMA_SQL });

      if (rpcError) {
        // rpc not available — try creating tables one by one via REST
        // This won't work for CREATE TABLE, so we fall back to seeding only
        console.log("[migrate] RPC not available, tables must be created via SQL Editor");
        console.log("[migrate] Run lib/schema-full.sql in Supabase SQL Editor");
        migrationDone = true;
        return;
      }
      console.log("[migrate] Schema created successfully");
    }

    // Seed default sources if empty
    const { data: existingSources } = await supabase.from("sources").select("id").limit(1);
    if (!existingSources || existingSources.length === 0) {
      console.log("[migrate] Seeding default sources...");
      const sourcesToInsert = DEFAULT_SOURCES.map((s) => ({
        name: s.name,
        url: s.url,
        type: s.type,
        content_type: s.content_type,
        category: s.category,
        enabled: s.enabled,
        description: s.description,
      }));
      const { error: seedErr } = await supabase.from("sources").insert(sourcesToInsert);
      if (seedErr) console.error("[migrate] Source seed error:", seedErr.message);
      else console.log(`[migrate] Seeded ${sourcesToInsert.length} sources`);
    }

    // Seed default keyword groups if empty
    const { data: existingKw } = await supabase.from("keyword_groups").select("id").limit(1);
    if (!existingKw || existingKw.length === 0) {
      console.log("[migrate] Seeding default keyword groups...");
      const kwToInsert = DEFAULT_KEYWORD_GROUPS.map((k) => ({
        group_name: k.group_name,
        category: k.category,
        content_types: k.content_types,
        priority: k.priority,
        keywords: k.keywords,
        enabled: k.enabled,
      }));
      const { error: seedErr } = await supabase.from("keyword_groups").insert(kwToInsert);
      if (seedErr) console.error("[migrate] Keyword seed error:", seedErr.message);
      else console.log(`[migrate] Seeded ${kwToInsert.length} keyword groups`);
    }

    migrationDone = true;
    console.log("[migrate] Migration check complete");
  } catch (err) {
    console.error("[migrate] Migration error:", err);
    migrationDone = true; // Don't retry on every request
  }
}
