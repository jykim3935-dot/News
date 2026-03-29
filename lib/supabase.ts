import { createClient, SupabaseClient } from "@supabase/supabase-js";

// Supabase client - uses service role key if available (bypasses RLS),
// falls back to anon key for backward compatibility
let _supabase: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient {
  if (!_supabase) {
    const url = process.env.SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const anonKey = process.env.SUPABASE_ANON_KEY;

    if (!url) {
      throw new Error("Missing SUPABASE_URL environment variable");
    }

    if (serviceKey) {
      // Production: service role key bypasses RLS
      _supabase = createClient(url, serviceKey, {
        auth: { autoRefreshToken: false, persistSession: false },
      });
    } else if (anonKey) {
      // Fallback: anon key with RLS
      console.warn(
        "[supabase] SUPABASE_SERVICE_ROLE_KEY not set, using anon key"
      );
      _supabase = createClient(url, anonKey);
    } else {
      throw new Error(
        "Missing SUPABASE_SERVICE_ROLE_KEY or SUPABASE_ANON_KEY"
      );
    }
  }
  return _supabase;
}

export const supabase = new Proxy({} as SupabaseClient, {
  get(_target, prop) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (getSupabase() as any)[prop];
  },
});

// Content types
export const CONTENT_TYPES = [
  "news",
  "report",
  "consulting",
  "global",
  "investment",
  "blog",
  "government",
  "research",
] as const;
export type ContentType = (typeof CONTENT_TYPES)[number];

// Categories
export const CATEGORIES = [
  "competitive",
  "market",
  "regulation",
  "tech",
  "customer",
  "investment",
] as const;
export type Category = (typeof CATEGORIES)[number];

// Urgency levels
export type Urgency = "red" | "yellow" | "green";

// Source types
export type SourceType = "rss" | "api" | "websearch" | "crawl";

// Database types
export interface Source {
  id: string;
  name: string;
  url: string;
  type: SourceType;
  content_type: ContentType;
  category: Category;
  enabled: boolean;
  description: string | null;
  created_at: string;
}

export interface KeywordGroup {
  id: string;
  group_name: string;
  category: Category;
  content_types: ContentType[];
  priority: number;
  keywords: string[];
  enabled: boolean;
  created_at: string;
}

export interface Article {
  id: string;
  title: string;
  url: string;
  source: string | null;
  content_type: ContentType;
  published_at: string | null;
  summary: string | null;
  matched_keywords: string[];
  category: Category | null;
  relevance_score: number | null;
  urgency: Urgency | null;
  impact_comment: string | null;
  deep_summary: string | null;
  source_description: string | null;
  key_findings: string[];
  action_items: string[];
  batch_id: string | null;
  original_language: string | null;
  original_title: string | null;
  original_summary: string | null;
  created_at: string;
}

export interface Recipient {
  id: string;
  name: string;
  email: string;
  role: string | null;
  enabled: boolean;
  created_at: string;
}

export interface PipelineRun {
  id: string;
  batch_id: string;
  status: "running" | "completed" | "failed";
  started_at: string;
  completed_at: string | null;
  articles_count: number;
  error: string | null;
  executive_brief: string | null;
  trend_summary: string | null;
  created_at: string;
}

export interface Trend {
  id: string;
  batch_id: string | null;
  trend_title: string;
  trend_description: string;
  related_article_ids: string[];
  category: string | null;
  strength: "rising" | "stable" | "emerging";
  created_at: string;
}
