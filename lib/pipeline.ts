import { supabase } from "./supabase";
import { collectAll } from "./collector";
import { curateArticles } from "./curator";
import { renderNewsletter } from "./newsletter";
import { sendNewsletter } from "./sender";
import type { Article } from "./supabase";

interface PipelineResult {
  batchId: string;
  articlesCount: number;
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
    // Step 1: Collect
    console.log("[pipeline] Step 1: Collecting...");
    const collected = await collectAll(batchId);
    console.log(`[pipeline] Collected ${collected.length} articles`);

    // Step 2: Curate
    console.log("[pipeline] Step 2: Curating...");
    await curateArticles(batchId);

    // Step 3: Render
    console.log("[pipeline] Step 3: Rendering newsletter...");
    const { data: articles } = await supabase
      .from("articles")
      .select("*")
      .eq("batch_id", batchId)
      .order("relevance_score", { ascending: false });

    const date = new Date().toLocaleDateString("ko-KR", {
      year: "numeric",
      month: "long",
      day: "numeric",
      weekday: "long",
    });

    const html = renderNewsletter((articles as Article[]) || [], date);

    // Step 4: Send
    console.log("[pipeline] Step 4: Sending...");
    const { sent, errors } = await sendNewsletter(html, date, testEmail);

    // Update pipeline run
    await supabase
      .from("pipeline_runs")
      .update({
        status: "completed",
        completed_at: new Date().toISOString(),
        articles_count: articles?.length || 0,
      })
      .eq("id", run.id);

    console.log("[pipeline] Completed successfully");
    return {
      batchId,
      articlesCount: articles?.length || 0,
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
      sent: 0,
      errors: [errorMsg],
      status: "failed",
    };
  }
}
