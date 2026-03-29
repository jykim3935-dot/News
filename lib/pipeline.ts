import { supabase } from "./supabase";
import { collectAll } from "./collector";
import { translateArticles } from "./translator";
import { curateArticles, deepCurateArticles } from "./curator";
import { renderNewsletter } from "./newsletter";
import { sendNewsletter } from "./sender";
import { generateExecutiveBrief } from "./executive-brief";
import { detectTrends } from "./trend-detector";
import type { Article } from "./supabase";

interface PipelineResult {
  batchId: string;
  articlesCount: number;
  translatedCount: number;
  deepCuratedCount: number;
  trendsCount: number;
  sent: number;
  errors: string[];
  status: "completed" | "failed";
}

export async function runPipeline(
  testEmail?: string
): Promise<PipelineResult> {
  // Create pipeline run
  const { data: run, error: runError } = await supabase
    .from("pipeline_runs")
    .insert({ status: "running" })
    .select()
    .single();

  if (runError || !run) {
    throw new Error(`Failed to create pipeline run: ${runError?.message}`);
  }

  const batchId = run.batch_id;
  console.log(`[pipeline] Started batch: ${batchId}`);

  try {
    // Step 1: Collect (5 collectors in parallel)
    console.log("[pipeline] Step 1/7: Collecting (5 collectors)...");
    const collected = await collectAll(batchId);
    console.log(`[pipeline] Collected ${collected.length} articles`);

    // Step 2: Translate English articles to Korean
    console.log("[pipeline] Step 2/8: Translating English articles...");
    const translatedCount = await translateArticles(batchId);
    console.log(`[pipeline] Translated ${translatedCount} English articles`);

    // Step 3: Basic Curation
    console.log("[pipeline] Step 3/8: Basic curation...");
    await curateArticles(batchId);

    // Step 4: Deep Curation (score >= 7 only)
    console.log("[pipeline] Step 4/8: Deep curation (high-score articles)...");
    await deepCurateArticles(batchId);

    // Fetch curated articles
    const { data: articles } = await supabase
      .from("articles")
      .select("*")
      .eq("batch_id", batchId)
      .order("relevance_score", { ascending: false });

    const allArticles = (articles as Article[]) || [];
    const deepCount = allArticles.filter((a) => a.deep_summary).length;

    // Step 5: Trend Detection
    console.log("[pipeline] Step 5/8: Detecting trends...");
    const { trends, summary: trendSummary } = await detectTrends(allArticles, batchId);

    // Step 6: Executive Brief
    console.log("[pipeline] Step 6/8: Generating executive brief...");
    const executiveBrief = await generateExecutiveBrief(allArticles);

    // Save brief + trend summary to pipeline run
    await supabase
      .from("pipeline_runs")
      .update({
        executive_brief: executiveBrief,
        trend_summary: trendSummary,
      })
      .eq("id", run.id);

    // Step 7: Render Newsletter
    console.log("[pipeline] Step 7/8: Rendering newsletter...");
    const date = new Date().toLocaleDateString("ko-KR", {
      year: "numeric",
      month: "long",
      day: "numeric",
      weekday: "long",
    });

    const html = renderNewsletter({
      articles: allArticles,
      date,
      executiveBrief,
      trends,
    });

    // Step 8: Send
    console.log("[pipeline] Step 8/8: Sending...");
    const { sent, errors } = await sendNewsletter(html, date, testEmail);

    // Update pipeline run
    await supabase
      .from("pipeline_runs")
      .update({
        status: "completed",
        completed_at: new Date().toISOString(),
        articles_count: allArticles.length,
      })
      .eq("id", run.id);

    console.log("[pipeline] Completed successfully");
    return {
      batchId,
      articlesCount: allArticles.length,
      translatedCount,
      deepCuratedCount: deepCount,
      trendsCount: trends.length,
      sent,
      errors,
      status: "completed",
    };
  } catch (error) {
    const errorMsg =
      error instanceof Error ? error.message : String(error);

    await supabase
      .from("pipeline_runs")
      .update({
        status: "failed",
        completed_at: new Date().toISOString(),
        error: errorMsg,
      })
      .eq("id", run.id);

    console.error("[pipeline] Failed:", errorMsg);
    return {
      batchId,
      articlesCount: 0,
      translatedCount: 0,
      deepCuratedCount: 0,
      trendsCount: 0,
      sent: 0,
      errors: [errorMsg],
      status: "failed",
    };
  }
}
