import Anthropic from "@anthropic-ai/sdk";
import { CURATION_PROMPT } from "./prompts";
import { supabase } from "./supabase";
import type { Article, Category, ContentType, Urgency } from "./supabase";

const anthropic = new Anthropic();

interface CurationAnalysis {
  index: number;
  relevance_score: number;
  urgency: Urgency;
  category: Category;
  content_type: ContentType;
  impact_comment: string;
}

function extractJSON(text: string): string {
  const match = text.match(/\{[\s\S]*\}/);
  return match ? match[0] : "{}";
}

export async function curateArticles(batchId: string): Promise<void> {
  console.log("[curator] Starting curation for batch:", batchId);

  // Get uncurated articles for this batch
  const { data: articles } = await supabase
    .from("articles")
    .select("*")
    .eq("batch_id", batchId)
    .is("relevance_score", null);

  if (!articles?.length) {
    console.log("[curator] No articles to curate");
    return;
  }

  // Process in batches of 20
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

      // Update each article
      for (const analysis of analyses) {
        const article = batch[analysis.index];
        if (!article) continue;

        await supabase
          .from("articles")
          .update({
            relevance_score: analysis.relevance_score,
            urgency: analysis.urgency,
            category: analysis.category,
            content_type: analysis.content_type || article.content_type,
            impact_comment: analysis.impact_comment,
          })
          .eq("id", article.id);
      }

      console.log(
        `[curator] Curated batch ${i / batchSize + 1}: ${analyses.length} articles`
      );
    } catch (error) {
      console.error(`[curator] Error curating batch:`, error);
    }

    // Rate limit
    if (i + batchSize < articles.length) {
      await new Promise((r) => setTimeout(r, 1500));
    }
  }

  console.log("[curator] Curation complete");
}
