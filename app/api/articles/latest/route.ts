import { NextResponse } from "next/server";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { localStore } from "@/lib/local-store";
import type { PipelineRun, Article } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export async function GET() {
  // Try Supabase first
  if (isSupabaseConfigured()) {
    try {
      const { data: run } = await supabase
        .from("pipeline_runs")
        .select("*")
        .eq("status", "completed")
        .order("completed_at", { ascending: false })
        .limit(1)
        .single();

      if (run) {
        const { data: articles } = await supabase
          .from("articles")
          .select("*")
          .eq("batch_id", run.batch_id)
          .order("relevance_score", { ascending: false });

        return NextResponse.json({ articles: articles || [], run });
      }
    } catch { /* fall through */ }
  }

  // Fallback to local store
  const runs = localStore.select<PipelineRun>("pipeline_runs")
    .filter((r) => r.status === "completed")
    .sort((a, b) =>
      new Date(b.completed_at || b.created_at).getTime() -
      new Date(a.completed_at || a.created_at).getTime()
    );

  const latestRun = runs[0] || null;
  if (!latestRun) {
    return NextResponse.json({ articles: [], run: null });
  }

  const articles = localStore.select<Article>("articles")
    .filter((a) => a.batch_id === latestRun.batch_id)
    .sort((a, b) => (b.relevance_score || 0) - (a.relevance_score || 0));

  return NextResponse.json({ articles, run: latestRun });
}
