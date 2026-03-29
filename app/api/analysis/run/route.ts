import { NextResponse } from "next/server";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { localStore } from "@/lib/local-store";
import { generateExecutiveBrief } from "@/lib/executive-brief";
import type { Article, PipelineRun } from "@/lib/supabase";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST() {
  const start = Date.now();

  let runId: string | null = null;
  let articles: Article[] = [];

  // Load latest articles
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
        runId = run.id;
        const { data } = await supabase
          .from("articles")
          .select("*")
          .eq("batch_id", run.batch_id)
          .order("relevance_score", { ascending: false });
        articles = (data as Article[]) || [];
      }
    } catch { /* fall through */ }
  }

  if (!articles.length) {
    const runs = localStore
      .select<PipelineRun>("pipeline_runs")
      .filter((r) => r.status === "completed")
      .sort(
        (a, b) =>
          new Date(b.completed_at || b.created_at).getTime() -
          new Date(a.completed_at || a.created_at).getTime()
      );
    const run = runs[0];
    if (run) {
      runId = run.id;
      articles = localStore
        .select<Article>("articles")
        .filter((a) => a.batch_id === run.batch_id)
        .sort((a, b) => (b.relevance_score || 0) - (a.relevance_score || 0));
    }
  }

  if (articles.length === 0) {
    return NextResponse.json({
      brief: "",
      articleCount: 0,
      error: "수집된 기사가 없습니다. 먼저 파이프라인을 실행하세요.",
      elapsed_ms: Date.now() - start,
    });
  }

  // Generate brief
  try {
    const brief = await generateExecutiveBrief(articles);

    if (!brief) {
      return NextResponse.json({
        brief: "",
        articleCount: articles.length,
        error: "AI 분석 결과가 비어있습니다. Anthropic API 키를 확인하세요.",
        elapsed_ms: Date.now() - start,
      });
    }

    // Save to DB
    if (runId && isSupabaseConfigured()) {
      try {
        await supabase
          .from("pipeline_runs")
          .update({ executive_brief: brief })
          .eq("id", runId);
      } catch (err) {
        console.error("[analysis] Failed to save brief to DB:", err);
      }
    }

    return NextResponse.json({
      brief,
      articleCount: articles.length,
      elapsed_ms: Date.now() - start,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[analysis] Brief generation failed:", msg);
    return NextResponse.json({
      brief: "",
      articleCount: articles.length,
      error: `AI 분석 실패: ${msg}`,
      elapsed_ms: Date.now() - start,
    });
  }
}
