import { NextResponse } from "next/server";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { generateExecutiveBrief } from "@/lib/executive-brief";
import type { Article } from "@/lib/supabase";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * GET /api/brief/test — 디버그용: 최신 기사로 브리프 생성 테스트
 * API 키, 모델 호출, JSON 파싱 전체 검증
 */
export async function GET() {
  const start = Date.now();
  const result: Record<string, unknown> = {
    step: "init",
    anthropicKeySet: !!process.env.ANTHROPIC_API_KEY,
    anthropicKeyPrefix: process.env.ANTHROPIC_API_KEY?.slice(0, 10) || "NOT_SET",
    supabaseConfigured: isSupabaseConfigured(),
  };

  // Step 1: Load articles
  let articles: Article[] = [];
  try {
    if (isSupabaseConfigured()) {
      const { data: run } = await supabase
        .from("pipeline_runs")
        .select("batch_id")
        .eq("status", "completed")
        .order("completed_at", { ascending: false })
        .limit(1)
        .single();

      if (run) {
        const { data } = await supabase
          .from("articles")
          .select("*")
          .eq("batch_id", run.batch_id)
          .order("relevance_score", { ascending: false })
          .limit(10);
        articles = (data as Article[]) || [];
      }
    }
    result.step = "articles_loaded";
    result.articleCount = articles.length;
    result.sampleTitles = articles.slice(0, 3).map((a) => a.title);
  } catch (e) {
    result.step = "articles_load_failed";
    result.error = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ ...result, elapsed_ms: Date.now() - start });
  }

  if (articles.length === 0) {
    result.step = "no_articles";
    result.error = "수집된 기사가 없습니다. 파이프라인을 먼저 실행하세요.";
    return NextResponse.json({ ...result, elapsed_ms: Date.now() - start });
  }

  // Step 2: Generate brief
  try {
    result.step = "generating_brief";
    const brief = await generateExecutiveBrief(articles);
    result.step = "brief_generated";
    result.success = !!brief;
    result.briefLength = brief.length;
    result.briefPreview = brief.slice(0, 300);
    result.brief = brief;
  } catch (e) {
    result.step = "brief_generation_failed";
    result.success = false;
    result.error = e instanceof Error ? e.message : String(e);
    result.stack = e instanceof Error ? e.stack?.split("\n").slice(0, 5) : undefined;
  }

  result.elapsed_ms = Date.now() - start;
  return NextResponse.json(result);
}
