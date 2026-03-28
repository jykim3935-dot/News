import Anthropic from "@anthropic-ai/sdk";
import { WEB_SEARCH_PROMPTS } from "./prompts";
import type { ContentType, Article } from "./supabase";
import { CONTENT_TYPES, supabase } from "./supabase";

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

async function searchByContentType(
  contentType: ContentType,
  keywords: string[]
): Promise<Partial<Article>[]> {
  const prompt = WEB_SEARCH_PROMPTS[contentType];
  const keywordStr = keywords.join(", ");

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 4096,
      tools: [
        {
          type: "web_search_20250305",
          name: "web_search",
          max_uses: 10,
        } as any,
      ],
      messages: [
        {
          role: "user",
          content: `${prompt}\n\n검색 키워드: ${keywordStr}`,
        },
      ],
    });

    const textBlock = response.content.find((b) => b.type === "text");
    if (!textBlock || textBlock.type !== "text") return [];

    const parsed = JSON.parse(extractJSON(textBlock.text));
    const articles: RawArticle[] = parsed.articles || [];

    return articles.map((a) => ({
      title: a.title,
      url: a.url,
      source: a.source,
      content_type: contentType,
      published_at: a.published_at,
      summary: a.summary,
      matched_keywords: keywords.slice(0, 5),
    }));
  } catch (error) {
    console.error(`[websearch] Error for ${contentType}:`, error);
    return [];
  }
}

export async function collectViaWebSearch(
  batchId: string
): Promise<Partial<Article>[]> {
  // Get enabled keyword groups from DB
  const { data: keywordGroups } = await supabase
    .from("keyword_groups")
    .select("*")
    .eq("enabled", true)
    .order("priority", { ascending: true });

  if (!keywordGroups?.length) {
    console.log("[websearch] No keyword groups found");
    return [];
  }

  const allArticles: Partial<Article>[] = [];

  // For each content type, gather relevant keywords and search
  for (const ct of CONTENT_TYPES) {
    const relevantGroups = keywordGroups.filter(
      (g) =>
        g.content_types.length === 0 || g.content_types.includes(ct)
    );

    if (relevantGroups.length === 0) continue;

    // Combine keywords from all relevant groups (max 10)
    const keywords = relevantGroups
      .flatMap((g) => g.keywords)
      .slice(0, 10);

    const articles = await searchByContentType(ct, keywords);
    allArticles.push(
      ...articles.map((a) => ({ ...a, batch_id: batchId }))
    );

    // Rate limit: 1-2s between API calls
    await new Promise((r) => setTimeout(r, 1500));
  }

  return allArticles;
}
