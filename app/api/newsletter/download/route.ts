import { NextResponse } from "next/server";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { localStore } from "@/lib/local-store";
import { generateExecutiveBrief } from "@/lib/executive-brief";
import { renderNewsletterMarkdown } from "@/lib/newsletter-markdown";
import type { Article, Trend, PipelineRun } from "@/lib/supabase";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET() {
  let run: PipelineRun | null = null;
  let articles: Article[] = [];
  let trends: Trend[] = [];

  // Supabase first
  if (isSupabaseConfigured()) {
    try {
      const { data } = await supabase
        .from("pipeline_runs")
        .select("*")
        .eq("status", "completed")
        .order("completed_at", { ascending: false })
        .limit(1)
        .single();
      if (data) {
        run = data as PipelineRun;
        const { data: arts } = await supabase
          .from("articles")
          .select("*")
          .eq("batch_id", run.batch_id)
          .order("relevance_score", { ascending: false });
        articles = (arts as Article[]) || [];
        const { data: trds } = await supabase
          .from("trends")
          .select("*")
          .eq("batch_id", run.batch_id);
        trends = (trds as Trend[]) || [];
      }
    } catch { /* fall through */ }
  }

  // Fallback: local store
  if (!run) {
    const runs = localStore
      .select<PipelineRun>("pipeline_runs")
      .filter((r) => r.status === "completed")
      .sort(
        (a, b) =>
          new Date(b.completed_at || b.created_at).getTime() -
          new Date(a.completed_at || a.created_at).getTime(),
      );
    run = runs[0] || null;
    if (run) {
      articles = localStore
        .select<Article>("articles")
        .filter((a) => a.batch_id === run!.batch_id)
        .sort((a, b) => (b.relevance_score || 0) - (a.relevance_score || 0));
      trends = localStore
        .select<Trend>("trends")
        .filter((t) => t.batch_id === run!.batch_id);
    }
  }

  if (!run || articles.length === 0) {
    return NextResponse.json(
      { error: "수집된 데이터가 없습니다. 파이프라인을 먼저 실행하세요." },
      { status: 404 },
    );
  }

  // Generate brief if missing
  let executiveBrief = run.executive_brief || "";
  if (!executiveBrief && articles.length > 0) {
    try {
      executiveBrief = await generateExecutiveBrief(articles);
      if (executiveBrief && isSupabaseConfigured()) {
        await supabase
          .from("pipeline_runs")
          .update({ executive_brief: executiveBrief })
          .eq("id", run.id);
      }
    } catch { /* proceed without brief */ }
  }

  const runDate = new Date(run.completed_at || run.started_at || run.created_at);
  const date = runDate.toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "long",
  });

  const md = renderNewsletterMarkdown({
    articles,
    date,
    executiveBrief: executiveBrief || undefined,
    trends,
  });

  const isoDate = runDate.toISOString().slice(0, 10);
  const filename = `acryl-brief-${isoDate}.md`;

  return new NextResponse(md, {
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
