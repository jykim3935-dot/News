import Anthropic from "@anthropic-ai/sdk";
import { WEB_SEARCH_PROMPTS, KEYWORD_EXPANSION_PROMPT } from "./prompts";
import type { ContentType, Article, KeywordGroup } from "./supabase";
import { CONTENT_TYPES, supabase, isSupabaseConfigured } from "./supabase";
import { localStore } from "./local-store";
import { DEFAULT_KEYWORD_GROUPS } from "./default-presets";

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

async function getEnabledKeywordGroups(): Promise<KeywordGroup[]> {
  if (isSupabaseConfigured()) {
    try {
      const { data } = await supabase
        .from("keyword_groups")
        .select("*")
        .eq("enabled", true)
        .order("priority", { ascending: true });
      if (data?.length) return data as KeywordGroup[];
    } catch { /* fall through */ }
  }
  const local = localStore
    .select<KeywordGroup>("keyword_groups")
    .filter((g) => g.enabled)
    .sort((a, b) => a.priority - b.priority);
  if (local.length > 0) return local;

  // Fallback to built-in defaults
  console.log("[websearch] Using built-in default keyword groups");
  return DEFAULT_KEYWORD_GROUPS as unknown as KeywordGroup[];
}

async function expandKeywords(keywords: string[]): Promise<string[]> {
  try {
    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1024,
      messages: [
        {
          role: "user",
          content: `${KEYWORD_EXPANSION_PROMPT} ${keywords.join(", ")}`,
        },
      ],
    });

    const textBlock = response.content.find((b) => b.type === "text");
    if (!textBlock || textBlock.type !== "text") return [];

    const parsed = JSON.parse(extractJSON(textBlock.text));
    return parsed.expanded_keywords || [];
  } catch (error) {
    console.error("[websearch] Keyword expansion error:", error);
    return [];
  }
}

async function searchByContentType(
  contentType: ContentType,
  keywords: string[]
): Promise<Partial<Article>[]> {
  // Skip government and research — handled by dedicated collectors
  if (contentType === "government" || contentType === "research") return [];

  const prompt = WEB_SEARCH_PROMPTS[contentType];
  const keywordStr = keywords.join(", ");

  try {
    const webSearchTool = {
      type: "web_search_20250305" as const,
      name: "web_search" as const,
      max_uses: 20,
    };
    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 4096,
      // @ts-expect-error web_search tool type not yet in SDK types
      tools: [webSearchTool],
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
  // Get enabled keyword groups from DB or local store
  const keywordGroups = await getEnabledKeywordGroups();

  if (!keywordGroups?.length) {
    console.log("[websearch] No keyword groups found");
    return [];
  }

  const allArticles: Partial<Article>[] = [];

  // For each content type, gather relevant keywords and search
  for (const ct of CONTENT_TYPES) {
    // Skip government/research — dedicated collectors handle these
    if (ct === "government" || ct === "research") continue;

    const relevantGroups = keywordGroups.filter(
      (g) =>
        g.content_types.length === 0 || g.content_types.includes(ct)
    );

    if (relevantGroups.length === 0) continue;

    // Combine keywords from all relevant groups (max 10)
    const keywords = relevantGroups
      .flatMap((g) => g.keywords)
      .slice(0, 10);

    // Round 1: Search with original keywords
    const round1 = await searchByContentType(ct, keywords);
    allArticles.push(
      ...round1.map((a) => ({ ...a, batch_id: batchId }))
    );

    // Rate limit
    await new Promise((r) => setTimeout(r, 1500));

    // Round 2: Expand keywords and search again (for high-priority types)
    if (["news", "report", "consulting"].includes(ct)) {
      const expanded = await expandKeywords(keywords.slice(0, 5));
      if (expanded.length > 0) {
        await new Promise((r) => setTimeout(r, 1000));
        const round2 = await searchByContentType(ct, expanded);
        allArticles.push(
          ...round2.map((a) => ({ ...a, batch_id: batchId }))
        );
      }
      await new Promise((r) => setTimeout(r, 1500));
    }
  }

  return allArticles;
}
