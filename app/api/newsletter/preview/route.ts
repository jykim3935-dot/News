import { NextRequest, NextResponse } from "next/server";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { localStore } from "@/lib/local-store";
import { renderNewsletter } from "@/lib/newsletter";
import { generateExecutiveBrief } from "@/lib/executive-brief";
import type { Article, Trend, PipelineRun } from "@/lib/supabase";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

function htmlResponse(html: string) {
  return new NextResponse(html, {
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}

function emptyPage() {
  return htmlResponse(
    `<html><body style='background:#F8FAFC;color:#94A3B8;display:flex;align-items:center;justify-content:center;height:100vh;font-family:sans-serif'>
      <p>아직 수집된 데이터가 없습니다. 파이프라인을 먼저 실행하세요.</p>
    </body></html>`
  );
}

/** POST: frontend sends articles directly (Vercel /tmp safe) */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const articles: Article[] = body.articles || [];
    let executiveBrief: string = body.executiveBrief || "";
    const trends: Trend[] = body.trends || [];
    const runId: string | null = body.runId || null;
    let briefError: string | null = null;

    if (articles.length === 0) {
      return NextResponse.json({ html: "", executiveBrief: "", briefError: "기사가 없습니다" });
    }

    // If no brief available, generate on-the-fly
    let briefGenerated = false;
    if (!executiveBrief.trim() && articles.length > 0) {
      console.log("[preview] No brief found, generating on-the-fly from", articles.length, "articles...");
      try {
        executiveBrief = await generateExecutiveBrief(articles);
        if (executiveBrief) {
          briefGenerated = true;
          console.log("[preview] Brief generated successfully, length:", executiveBrief.length);

          // Await DB save to ensure persistence before response returns
          if (runId && isSupabaseConfigured()) {
            try {
              await supabase
                .from("pipeline_runs")
                .update({ executive_brief: executiveBrief })
                .eq("id", runId);
              console.log("[preview] Brief saved to DB");
            } catch (err) {
              console.error("[preview] Failed to save brief:", err);
            }
          }
        } else {
          briefError = "AI 브리프 생성 결과가 비어있습니다. Vercel 로그를 확인하세요.";
          console.error("[preview] generateExecutiveBrief returned empty string");
        }
      } catch (e) {
        briefError = `AI 브리프 생성 실패: ${e instanceof Error ? e.message : String(e)}`;
        console.error("[preview] Brief generation failed:", e);
      }
    }

    const date = new Date().toLocaleDateString("ko-KR", {
      year: "numeric", month: "long", day: "numeric", weekday: "long",
    });

    const html = renderNewsletter({ articles, date, executiveBrief, trends });

    return NextResponse.json({
      html,
      executiveBrief: briefGenerated ? executiveBrief : undefined,
      briefError,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[preview] Top-level error:", msg);
    return NextResponse.json({ html: "", executiveBrief: "", briefError: `미리보기 오류: ${msg}` });
  }
}

/** GET: tries Supabase → local store (works when data persists) */
export async function GET() {
  let run: PipelineRun | null = null;
  let articles: Article[] = [];
  let trends: Trend[] = [];

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

  if (!run) {
    const runs = localStore.select<PipelineRun>("pipeline_runs")
      .filter((r) => r.status === "completed")
      .sort((a, b) =>
        new Date(b.completed_at || b.created_at).getTime() -
        new Date(a.completed_at || a.created_at).getTime()
      );
    run = runs[0] || null;
    if (run) {
      articles = localStore.select<Article>("articles")
        .filter((a) => a.batch_id === run!.batch_id)
        .sort((a, b) => (b.relevance_score || 0) - (a.relevance_score || 0));
      trends = localStore.select<Trend>("trends")
        .filter((t) => t.batch_id === run!.batch_id);
    }
  }

  if (!run || articles.length === 0) return emptyPage();

  // Generate brief on-the-fly if missing
  let executiveBrief = run.executive_brief || "";
  if (!executiveBrief && articles.length > 0) {
    try {
      executiveBrief = await generateExecutiveBrief(articles);
      if (executiveBrief && isSupabaseConfigured()) {
        supabase
          .from("pipeline_runs")
          .update({ executive_brief: executiveBrief })
          .eq("id", run.id);
      }
    } catch { /* proceed without brief */ }
  }

  const date = new Date(run.completed_at || run.started_at || run.created_at).toLocaleDateString(
    "ko-KR",
    { year: "numeric", month: "long", day: "numeric", weekday: "long" }
  );

  const html = renderNewsletter({
    articles,
    date,
    executiveBrief: executiveBrief || undefined,
    trends,
  });

  return htmlResponse(html);
}
