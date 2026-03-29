import { supabase, isSupabaseConfigured } from "./supabase";
import { localStore } from "./local-store";
import { collectAll } from "./collector";
import { curateArticles, deepCurateArticles } from "./curator";
import { renderNewsletter } from "./newsletter";
import { sendNewsletter } from "./sender";
import { generateExecutiveBrief } from "./executive-brief";
import { detectTrends } from "./trend-detector";
import type { Article, PipelineRun, Trend } from "./supabase";
import { randomUUID } from "crypto";

interface PipelineResult {
  batchId: string;
  articlesCount: number;
  deepCuratedCount: number;
  trendsCount: number;
  sent: number;
  errors: string[];
  status: "completed" | "failed";
  articles: Article[];
  executiveBrief: string;
  trends: Trend[];
}

async function createPipelineRun(): Promise<{ id: string; batch_id: string }> {
  const fallbackBatchId = randomUUID();
  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase
        .from("pipeline_runs")
        .insert({ status: "running" })
        .select()
        .single();
      if (!error && data) return data as { id: string; batch_id: string };
    } catch { /* fall through */ }
    // Retry with explicit batch_id
    try {
      const { data, error } = await supabase
        .from("pipeline_runs")
        .insert({ status: "running", batch_id: fallbackBatchId })
        .select()
        .single();
      if (!error && data) return data as { id: string; batch_id: string };
    } catch { /* fall through */ }
  }
  const run = localStore.insert<PipelineRun>("pipeline_runs", {
    status: "running",
    batch_id: fallbackBatchId,
    started_at: new Date().toISOString(),
    completed_at: null,
    articles_count: 0,
    error: null,
    executive_brief: null,
    trend_summary: null,
  } as Omit<PipelineRun, "id" | "created_at">);
  return { id: run.id, batch_id: run.batch_id };
}

async function updatePipelineRun(id: string, updates: Partial<PipelineRun>): Promise<void> {
  if (isSupabaseConfigured()) {
    try {
      const { error } = await supabase.from("pipeline_runs").update(updates).eq("id", id);
      if (!error) return;
    } catch { /* fall through */ }
  }
  localStore.update<PipelineRun & { id: string }>("pipeline_runs", id, updates as Partial<PipelineRun & { id: string }>);
}

export async function runPipeline(
  testEmail?: string
): Promise<PipelineResult> {
  const errors: string[] = [];
  let batchId: string = randomUUID();
  let runId = "";

  // Pre-flight checks
  if (!process.env.ANTHROPIC_API_KEY) {
    console.error("[pipeline] ANTHROPIC_API_KEY not set — AI curation/analysis will fail");
    errors.push("ANTHROPIC_API_KEY가 설정되지 않았습니다. 환경변수를 확인하세요.");
  }
  if (!process.env.RESEND_API_KEY) {
    console.warn("[pipeline] RESEND_API_KEY not set — 이메일 발송을 건너뜁니다");
  }
  if (!isSupabaseConfigured()) {
    console.warn("[pipeline] Supabase not configured — local store 사용");
  }

  // Create pipeline run
  try {
    const run = await createPipelineRun();
    batchId = run.batch_id;
    runId = run.id;
    console.log(`[pipeline] Pipeline run created: id=${runId}, batch=${batchId}`);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    errors.push(`Pipeline run 생성 실패: ${msg}`);
    console.error("[pipeline] createPipelineRun failed:", msg);
  }
  console.log(`[pipeline] Started batch: ${batchId}`);

  // Step 1: Collect — this is the critical step, must not lose results
  console.log("[pipeline] Step 1: Collecting...");
  let collectedArticles: Article[] = [];
  try {
    const rawCollected = await collectAll(batchId);
    console.log(`[pipeline] collectAll returned ${rawCollected.length} articles`);

    // collector.ts already inserted articles into DB — read them back with DB-generated IDs
    if (isSupabaseConfigured()) {
      try {
        const { data } = await supabase
          .from("articles")
          .select("*")
          .eq("batch_id", batchId);
        if (data?.length) {
          collectedArticles = data as Article[];
          console.log(`[pipeline] Loaded ${collectedArticles.length} articles from DB`);
        }
      } catch { /* fall through to memory fallback */ }
    }

    // Fallback: if DB read failed, build Article objects from memory
    if (collectedArticles.length === 0 && rawCollected.length > 0) {
      console.log("[pipeline] DB read failed, using memory fallback");
      collectedArticles = rawCollected.map((a) => ({
        id: randomUUID(),
        title: a.title || "",
        url: a.url || "",
        source: a.source || null,
        content_type: a.content_type || "news",
        published_at: a.published_at || null,
        summary: a.summary || null,
        matched_keywords: a.matched_keywords || [],
        category: null,
        relevance_score: null,
        urgency: null,
        impact_comment: null,
        deep_summary: null,
        source_description: null,
        key_findings: [],
        action_items: [],
        batch_id: batchId,
        created_at: new Date().toISOString(),
        title_ko: null,
        summary_ko: null,
        dedup_group: null,
      })) as Article[];
    }
    console.log(`[pipeline] Collected ${collectedArticles.length} articles`);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    errors.push(`수집 실패: ${msg}`);
    console.error("[pipeline] Collection failed:", msg);
  }

  // If no articles collected, return early
  if (collectedArticles.length === 0) {
    if (runId) {
      await updatePipelineRun(runId, {
        status: "completed",
        completed_at: new Date().toISOString(),
        articles_count: 0,
      } as Partial<PipelineRun>).catch(() => {});
    }
    return {
      batchId,
      articlesCount: 0,
      deepCuratedCount: 0,
      trendsCount: 0,
      sent: 0,
      errors: errors.length > 0 ? errors : ["수집된 기사가 없습니다"],
      status: errors.length > 0 ? "failed" : "completed",
      articles: [],
      executiveBrief: "",
      trends: [],
    };
  }

  // Steps 2-7: Try each step, but don't let failures lose collected articles
  let finalArticles = collectedArticles;
  let deepCount = 0;
  let trendsCount = 0;
  let sent = 0;
  let executiveBrief = "";
  let detectedTrends: Trend[] = [];

  // Step 2-3: Curation (requires Anthropic API)
  try {
    console.log("[pipeline] Step 2: Basic curation...");
    const curationResult = await curateArticles(batchId);
    if (curationResult.failed > 0) {
      errors.push(`큐레이션: ${curationResult.scored}건 성공, ${curationResult.failed}건 실패`);
    }
    console.log("[pipeline] Step 3: Deep curation...");
    await deepCurateArticles(batchId);

    // Try to read curated articles from store
    if (isSupabaseConfigured()) {
      try {
        const { data } = await supabase
          .from("articles")
          .select("*")
          .eq("batch_id", batchId)
          .order("relevance_score", { ascending: false });
        if (data?.length) finalArticles = data as Article[];
      } catch { /* use collectedArticles */ }
    } else {
      const stored = localStore
        .selectWhere<Article & Record<string, unknown>>("articles", { batch_id: batchId })
        .sort((a, b) => (b.relevance_score || 0) - (a.relevance_score || 0));
      if (stored.length > 0) finalArticles = stored;
    }
    deepCount = finalArticles.filter((a) => a.deep_summary).length;

    // Dedup: keep highest-scored article per group, mark others
    const grouped = new Map<string, Article[]>();
    for (const a of finalArticles) {
      if (a.dedup_group) {
        const group = grouped.get(a.dedup_group) || [];
        group.push(a);
        grouped.set(a.dedup_group, group);
      }
    }
    if (grouped.size > 0) {
      const removedIds = new Set<string>();
      for (const [, group] of grouped) {
        if (group.length <= 1) continue;
        // Sort by relevance_score desc, keep best
        group.sort((a, b) => (b.relevance_score || 0) - (a.relevance_score || 0));
        const best = group[0];
        const others = group.slice(1);
        // Merge sources info into best article's summary
        const otherSources = others.map((o) => o.source).filter(Boolean).join(", ");
        if (otherSources && best.summary_ko) {
          best.summary_ko += ` (관련 보도: ${otherSources})`;
        }
        for (const o of others) removedIds.add(o.id);
      }
      if (removedIds.size > 0) {
        console.log(`[pipeline] Dedup: removed ${removedIds.size} duplicate articles`);
        finalArticles = finalArticles.filter((a) => !removedIds.has(a.id));
      }
    }
  } catch (e) {
    errors.push(`큐레이션 실패: ${e instanceof Error ? e.message : String(e)}`);
    console.error("[pipeline] Curation failed:", e);
  }

  // Step 4: Trend Detection
  try {
    console.log("[pipeline] Step 4: Detecting trends...");
    const { trends, summary: trendSummary } = await detectTrends(finalArticles, batchId);
    trendsCount = trends.length;
    detectedTrends = trends;
    if (runId && trendSummary) {
      await updatePipelineRun(runId, { trend_summary: trendSummary } as Partial<PipelineRun>).catch(() => {});
    }
  } catch (e) {
    errors.push(`트렌드 분석 실패: ${e instanceof Error ? e.message : String(e)}`);
    console.error("[pipeline] Trend detection failed:", e);
  }

  // Step 5: Executive Brief
  try {
    console.log("[pipeline] Step 5: Generating executive brief...");
    executiveBrief = await generateExecutiveBrief(finalArticles);
    if (executiveBrief) {
      console.log(`[pipeline] Executive brief generated (${executiveBrief.length} chars)`);
      if (runId) {
        await updatePipelineRun(runId, { executive_brief: executiveBrief } as Partial<PipelineRun>).catch(() => {});
      }
    } else {
      console.warn("[pipeline] Executive brief returned empty");
      errors.push("AI 브리프 생성 결과가 비어있습니다");
    }
  } catch (e) {
    errors.push(`브리프 생성 실패: ${e instanceof Error ? e.message : String(e)}`);
    console.error("[pipeline] Executive brief failed:", e);
  }

  // Step 6-7: Newsletter & Send
  try {
    if (process.env.RESEND_API_KEY) {
      console.log("[pipeline] Step 6: Rendering newsletter...");
      const date = new Date().toLocaleDateString("ko-KR", {
        year: "numeric", month: "long", day: "numeric", weekday: "long",
      });
      const html = renderNewsletter({ articles: finalArticles, date, executiveBrief, trends: detectedTrends });
      console.log(`[pipeline] Step 7: Sending newsletter (${html.length} bytes)...`);
      const sendResult = await sendNewsletter(html, date, testEmail);
      sent = sendResult.sent;
      if (sendResult.errors.length > 0) errors.push(...sendResult.errors);
      console.log(`[pipeline] Newsletter sent to ${sent} recipients`);
    } else {
      errors.push("RESEND_API_KEY 미설정 — 이메일 발송 건너뜀");
    }
  } catch (e) {
    errors.push(`발송 실패: ${e instanceof Error ? e.message : String(e)}`);
    console.error("[pipeline] Send failed:", e);
  }

  // Update pipeline run
  if (runId) {
    await updatePipelineRun(runId, {
      status: "completed",
      completed_at: new Date().toISOString(),
      articles_count: finalArticles.length,
    } as Partial<PipelineRun>).catch(() => {});
  }

  console.log(`[pipeline] Done: ${finalArticles.length} articles, ${errors.length} errors`);
  return {
    batchId,
    articlesCount: finalArticles.length,
    deepCuratedCount: deepCount,
    trendsCount,
    sent,
    errors,
    status: "completed",
    articles: finalArticles,
    executiveBrief,
    trends: detectedTrends,
  };
}
