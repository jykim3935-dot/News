import Anthropic from "@anthropic-ai/sdk";
import { CURATION_PROMPT, DEEP_SUMMARY_PROMPT } from "./prompts";
import { supabase, isSupabaseConfigured } from "./supabase";
import { localStore } from "./local-store";
import type { Article, Category, ContentType, Urgency } from "./supabase";

const anthropic = new Anthropic();

interface CurationAnalysis {
  index: number;
  relevance_score: number;
  urgency: Urgency;
  category: Category;
  content_type: ContentType;
  impact_comment: string;
  title_ko: string;
  summary_ko: string;
  dedup_group: string;
}

interface DeepAnalysis {
  index: number;
  deep_summary: string;
  source_description: string;
  key_findings: string[];
  action_items: string[];
}

function extractJSON(text: string): string {
  const match = text.match(/\{[\s\S]*\}/);
  return match ? match[0] : "{}";
}

async function fetchArticlesForCuration(batchId: string): Promise<Article[]> {
  if (isSupabaseConfigured()) {
    try {
      const { data } = await supabase
        .from("articles")
        .select("*")
        .eq("batch_id", batchId)
        .is("relevance_score", null);
      if (data) return data as Article[];
    } catch { /* fall through */ }
  }
  return localStore
    .selectWhere<Article & Record<string, unknown>>("articles", { batch_id: batchId })
    .filter((a) => a.relevance_score === null || a.relevance_score === undefined);
}

async function updateArticle(id: string, updates: Partial<Article>): Promise<void> {
  if (isSupabaseConfigured()) {
    try {
      const { error } = await supabase.from("articles").update(updates).eq("id", id);
      if (!error) return;
    } catch { /* fall through */ }
  }
  localStore.update<Article & { id: string }>("articles", id, updates as Partial<Article & { id: string }>);
}

/**
 * Step A: Basic curation — score, urgency, category, impact for all articles
 */
export async function curateArticles(batchId: string): Promise<void> {
  console.log("[curator] Step A: Basic curation for batch:", batchId);

  const articles = await fetchArticlesForCuration(batchId);

  if (!articles?.length) {
    console.log("[curator] No articles to curate");
    return;
  }

  const batchSize = 20;
  for (let i = 0; i < articles.length; i += batchSize) {
    const batch = articles.slice(i, i + batchSize);
    const batchContent = batch
      .map(
        (a: Article, idx: number) =>
          `[${idx}] [${a.content_type}] ${a.title} (${a.source || "unknown"})${a.summary ? "\n    " + a.summary : ""}`
      )
      .join("\n\n");

    try {
      const response = await anthropic.messages.create({
        model: "claude-sonnet-4-20250514",
        max_tokens: 4096,
        messages: [
          {
            role: "user",
            content: `${CURATION_PROMPT}\n\n${batchContent}`,
          },
        ],
      });

      const textBlock = response.content.find((b) => b.type === "text");
      if (!textBlock || textBlock.type !== "text") continue;

      const parsed = JSON.parse(extractJSON(textBlock.text));
      const analyses: CurationAnalysis[] = parsed.analyses || [];

      for (const analysis of analyses) {
        const article = batch[analysis.index];
        if (!article) continue;

        await updateArticle(article.id, {
          relevance_score: analysis.relevance_score,
          urgency: analysis.urgency,
          category: analysis.category,
          content_type: analysis.content_type || article.content_type,
          impact_comment: analysis.impact_comment,
          title_ko: analysis.title_ko || null,
          summary_ko: analysis.summary_ko || null,
          dedup_group: analysis.dedup_group || null,
        });
      }

      console.log(
        `[curator] Basic batch ${i / batchSize + 1}: ${analyses.length} articles`
      );
    } catch (error) {
      console.error(`[curator] Error in basic curation:`, error);
    }

    if (i + batchSize < articles.length) {
      await new Promise((r) => setTimeout(r, 1500));
    }
  }

  console.log("[curator] Basic curation complete");
}

/**
 * Step B: Deep curation — summaries, source descriptions, findings for high-score articles
 */
export async function deepCurateArticles(batchId: string): Promise<void> {
  console.log("[curator] Step B: Deep curation for batch:", batchId);

  let articles: Article[] | null = null;

  if (isSupabaseConfigured()) {
    try {
      const { data } = await supabase
        .from("articles")
        .select("*")
        .eq("batch_id", batchId)
        .gte("relevance_score", 7)
        .is("deep_summary", null)
        .order("relevance_score", { ascending: false });
      articles = data as Article[] | null;
    } catch { /* fall through */ }
  }

  if (!articles) {
    articles = localStore
      .selectWhere<Article & Record<string, unknown>>("articles", { batch_id: batchId })
      .filter((a) => (a.relevance_score || 0) >= 7 && !a.deep_summary)
      .sort((a, b) => (b.relevance_score || 0) - (a.relevance_score || 0));
  }

  if (!articles?.length) {
    console.log("[curator] No high-score articles for deep curation");
    return;
  }

  console.log(`[curator] Deep curating ${articles.length} high-score articles`);

  // Process in batches of 5 (more detailed analysis per article)
  const batchSize = 5;
  for (let i = 0; i < articles.length; i += batchSize) {
    const batch = articles.slice(i, i + batchSize);
    const batchContent = batch
      .map(
        (a: Article, idx: number) =>
          `[${idx}] [${a.content_type}] [관련도:${a.relevance_score}/10] ${a.title}
    출처: ${a.source || "unknown"}
    URL: ${a.url}
    기본요약: ${a.summary || "없음"}
    임팩트: ${a.impact_comment || "없음"}`
      )
      .join("\n\n");

    try {
      const response = await anthropic.messages.create({
        model: "claude-sonnet-4-20250514",
        max_tokens: 4096,
        messages: [
          {
            role: "user",
            content: `${DEEP_SUMMARY_PROMPT}\n\n${batchContent}`,
          },
        ],
      });

      const textBlock = response.content.find((b) => b.type === "text");
      if (!textBlock || textBlock.type !== "text") continue;

      const parsed = JSON.parse(extractJSON(textBlock.text));
      const analyses: DeepAnalysis[] = parsed.analyses || [];

      for (const analysis of analyses) {
        const article = batch[analysis.index];
        if (!article) continue;

        await updateArticle(article.id, {
          deep_summary: analysis.deep_summary,
          source_description: analysis.source_description,
          key_findings: analysis.key_findings || [],
          action_items: analysis.action_items || [],
        });
      }

      console.log(
        `[curator] Deep batch ${i / batchSize + 1}: ${analyses.length} articles`
      );
    } catch (error) {
      console.error(`[curator] Error in deep curation:`, error);
    }

    if (i + batchSize < articles.length) {
      await new Promise((r) => setTimeout(r, 2000));
    }
  }

  console.log("[curator] Deep curation complete");
}
