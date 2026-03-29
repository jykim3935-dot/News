import Anthropic from "@anthropic-ai/sdk";
import { RESEARCH_SEARCH_PROMPT } from "./prompts";
import type { Article } from "./supabase";

const anthropic = new Anthropic();

interface RawArticle {
  title: string;
  url: string;
  source: string;
  published_at: string;
  summary: string;
}

function extractJSON(text: string): string {
  const match = text.match(/\{[\s\S]*\}/);
  return match ? match[0] : "{}";
}

const RESEARCH_KEYWORD_SETS = [
  ["GPU scheduling", "GPU cluster management", "multi-tenant GPU", "GPU orchestration"],
  ["model serving", "inference optimization", "LLM deployment", "vLLM", "TensorRT"],
  ["AI agent orchestration", "tool use LLM", "function calling", "MCP protocol"],
  ["medical AI diagnosis", "healthcare AI", "clinical AI", "pathology AI"],
];

export async function collectResearch(
  batchId: string
): Promise<Partial<Article>[]> {
  console.log("[research-collector] Starting research paper collection...");
  const allArticles: Partial<Article>[] = [];

  for (const keywords of RESEARCH_KEYWORD_SETS) {
    try {
      const webSearchTool = {
        type: "web_search_20250305" as const,
        name: "web_search" as const,
        max_uses: 15,
      };
      const response = await anthropic.messages.create({
        model: "claude-sonnet-4-20250514",
        max_tokens: 4096,
        // @ts-expect-error web_search tool type not yet in SDK types
        tools: [webSearchTool],
        messages: [
          {
            role: "user",
            content: `${RESEARCH_SEARCH_PROMPT} ${keywords.join(", ")}`,
          },
        ],
      });

      const textBlock = response.content.find((b) => b.type === "text");
      if (!textBlock || textBlock.type !== "text") continue;

      const parsed = JSON.parse(extractJSON(textBlock.text));
      const articles: RawArticle[] = parsed.articles || [];

      allArticles.push(
        ...articles.map((a) => ({
          title: a.title,
          url: a.url,
          source: a.source,
          content_type: "research" as const,
          published_at: a.published_at,
          summary: a.summary,
          matched_keywords: keywords,
          batch_id: batchId,
        }))
      );
    } catch (error) {
      console.error(`[research-collector] Error:`, error);
    }

    await new Promise((r) => setTimeout(r, 1500));
  }

  console.log(`[research-collector] Collected ${allArticles.length} articles`);
  return allArticles;
}
