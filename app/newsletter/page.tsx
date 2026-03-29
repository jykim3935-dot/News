import Link from "next/link";
import { renderNewsletter } from "@/lib/newsletter";
import { generateExecutiveBrief } from "@/lib/executive-brief";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { localStore } from "@/lib/local-store";
import type { Article, Trend, PipelineRun } from "@/lib/supabase";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

async function getNewsletterData() {
  let run: PipelineRun | null = null;
  let articles: Article[] = [];
  let trends: Trend[] = [];

  // Try Supabase first
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
    } catch { /* fall through to local store */ }
  }

  // Fallback to local store
  if (!run) {
    const runs = localStore
      .select<PipelineRun>("pipeline_runs")
      .filter((r) => r.status === "completed")
      .sort(
        (a, b) =>
          new Date(b.completed_at || b.created_at).getTime() -
          new Date(a.completed_at || a.created_at).getTime()
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

  // Generate brief on-the-fly if missing
  let executiveBrief = run?.executive_brief || "";
  if (!executiveBrief && articles.length > 0) {
    try {
      executiveBrief = await generateExecutiveBrief(articles);
      // Save to DB for future use
      if (executiveBrief && run && isSupabaseConfigured()) {
        await supabase
          .from("pipeline_runs")
          .update({ executive_brief: executiveBrief })
          .eq("id", run.id);
      }
    } catch (e) {
      console.error("[newsletter] Brief generation failed:", e);
    }
  }

  return { run, articles, trends, executiveBrief };
}

export default async function NewsletterPage() {
  const { run, articles, trends, executiveBrief } = await getNewsletterData();

  if (!run || articles.length === 0) {
    return (
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "center",
        height: "100vh", background: "#f4f4f5", fontFamily: "sans-serif",
      }}>
        <div style={{ textAlign: "center", color: "#71717a" }}>
          <p style={{ fontSize: 18, fontWeight: 600 }}>수집된 데이터가 없습니다</p>
          <p style={{ fontSize: 14, marginTop: 8 }}>
            대시보드에서 파이프라인을 먼저 실행하세요.
          </p>
          <Link
            href="/"
            style={{
              display: "inline-block", marginTop: 16, padding: "8px 20px",
              background: "#18181b", color: "#fff", borderRadius: 6,
              textDecoration: "none", fontSize: 13,
            }}
          >
            대시보드로 이동
          </Link>
        </div>
      </div>
    );
  }

  const date = new Date(
    run.completed_at || run.started_at || run.created_at
  ).toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "long",
  });

  const html = renderNewsletter({ articles, date, executiveBrief, trends });

  return <div dangerouslySetInnerHTML={{ __html: html }} />;
}
