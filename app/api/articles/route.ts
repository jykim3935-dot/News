import { NextRequest, NextResponse } from "next/server";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { localStore } from "@/lib/local-store";
import type { Article } from "@/lib/supabase";

export async function GET(req: NextRequest) {
  const batchId = req.nextUrl.searchParams.get("batch_id");
  const contentType = req.nextUrl.searchParams.get("content_type");

  // Try Supabase first
  if (isSupabaseConfigured()) {
    try {
      let query = supabase
        .from("articles")
        .select("*")
        .order("relevance_score", { ascending: false });

      if (batchId) query = query.eq("batch_id", batchId);
      if (contentType) query = query.eq("content_type", contentType);

      const { data, error } = await query.limit(100);
      if (!error && data) return NextResponse.json(data);
    } catch { /* fall through */ }
  }

  // Fallback to local store
  let articles = localStore.select<Article>("articles");

  if (batchId) articles = articles.filter((a) => a.batch_id === batchId);
  if (contentType) articles = articles.filter((a) => a.content_type === contentType);

  articles = articles
    .sort((a, b) => (b.relevance_score || 0) - (a.relevance_score || 0))
    .slice(0, 100);

  return NextResponse.json(articles);
}
