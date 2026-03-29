import { createClient, SupabaseClient } from "@supabase/supabase-js";

// Server-side client (service role key) - bypasses RLS, for pipeline/API routes
let _supabaseAdmin: SupabaseClient | null = null;

export function getSupabaseAdmin(): SupabaseClient {
  if (!_supabaseAdmin) {
    const url = process.env.SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !serviceKey) {
      throw new Error(
        "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables"
      );
    }
    _supabaseAdmin = createClient(url, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
  }
  return _supabaseAdmin;
}

// Public client (anon key) - respects RLS, for client-side/read-only operations
let _supabasePublic: SupabaseClient | null = null;

export function getSupabasePublic(): SupabaseClient {
  if (!_supabasePublic) {
    const url = process.env.SUPABASE_URL;
    const anonKey = process.env.SUPABASE_ANON_KEY;
    if (!url || !anonKey) {
      throw new Error(
        "Missing SUPABASE_URL or SUPABASE_ANON_KEY environment variables"
      );
    }
    _supabasePublic = createClient(url, anonKey);
  }
  return _supabasePublic;
}

// Default export: admin client for server-side operations (pipeline, API routes)
export const supabase = new Proxy({} as SupabaseClient, {
  get(_target, prop) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (getSupabaseAdmin() as any)[prop];
  },
});

// Public client proxy for read-only / client-facing operations
export const supabasePublic = new Proxy({} as SupabaseClient, {
  get(_target, prop) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (getSupabasePublic() as any)[prop];
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
