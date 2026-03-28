import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { renderNewsletter } from "@/lib/newsletter";
import type { Article, Trend } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export async function GET() {
  // Get latest completed pipeline run
  const { data: run } = await supabase
    .from("pipeline_runs")
    .select("*")
    .eq("status", "completed")
    .order("completed_at", { ascending: false })
    .limit(1)
    .single();

  if (!run) {
    return new NextResponse(
      "<html><body style='background:#0F172A;color:#64748B;display:flex;align-items:center;justify-content:center;height:100vh;font-family:sans-serif'><p>아직 수집된 데이터가 없습니다. 파이프라인을 먼저 실행하세요.</p></body></html>",
      { headers: { "Content-Type": "text/html; charset=utf-8" } }
    );
  }

  const { data: articles } = await supabase
    .from("articles")
    .select("*")
    .eq("batch_id", run.batch_id)
    .order("relevance_score", { ascending: false });

  const { data: trends } = await supabase
    .from("trends")
    .select("*")
    .eq("batch_id", run.batch_id);

  const date = new Date(run.completed_at || run.started_at).toLocaleDateString(
    "ko-KR",
    { year: "numeric", month: "long", day: "numeric", weekday: "long" }
  );

  const html = renderNewsletter({
    articles: (articles as Article[]) || [],
    date,
    executiveBrief: run.executive_brief || undefined,
    trends: (trends as Trend[]) || [],
  });

  return new NextResponse(html, {
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}
