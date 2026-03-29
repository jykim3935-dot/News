import RssParser from "rss-parser";
import { supabase, isSupabaseConfigured } from "./supabase";
import { localStore } from "./local-store";
import { DEFAULT_SOURCES, DEFAULT_KEYWORD_GROUPS } from "./default-presets";
import type { Article, Source, KeywordGroup } from "./supabase";

const parser = new RssParser({
  timeout: 10000,
  headers: {
    "User-Agent": "ACRYL-Intel/1.0",
  },
});

async function getEnabledRssSources(): Promise<Source[]> {
  if (isSupabaseConfigured()) {
    try {
      const { data } = await supabase
        .from("sources")
        .select("*")
        .eq("type", "rss")
        .eq("enabled", true);
      if (data?.length) return data as Source[];
    } catch { /* fall through */ }
  }
  const local = localStore
    .select<Source>("sources")
    .filter((s) => s.type === "rss" && s.enabled);
  if (local.length > 0) return local;

  // Fallback to built-in defaults
  console.log("[rss] Using built-in default RSS sources");
  return DEFAULT_SOURCES.filter((s) => s.type === "rss" && s.enabled) as unknown as Source[];
}

async function getEnabledKeywords(): Promise<string[]> {
  if (isSupabaseConfigured()) {
    try {
      const { data } = await supabase
        .from("keyword_groups")
        .select("*")
        .eq("enabled", true);
      if (data?.length) return (data as KeywordGroup[]).flatMap((g) => g.keywords);
    } catch { /* fall through */ }
  }
  const local = localStore
    .select<KeywordGroup>("keyword_groups")
    .filter((g) => g.enabled)
    .flatMap((g) => g.keywords);
  if (local.length > 0) return local;

  // Fallback to built-in defaults
  console.log("[rss] Using built-in default keywords");
  return DEFAULT_KEYWORD_GROUPS.flatMap((g) => g.keywords);
}

async function fetchRssFeed(
  source: Source,
  keywords: string[]
): Promise<Partial<Article>[]> {
  try {
    const feed = await parser.parseURL(source.url);
    const articles: Partial<Article>[] = [];
    const lowerKeywords = keywords.map((k) => k.toLowerCase());
    // Only accept articles from the last 7 days
    const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    for (const item of feed.items.slice(0, 30)) {
      // Date filter
      if (item.isoDate) {
        const pubDate = new Date(item.isoDate);
        if (pubDate < cutoff) continue;
      }

      const title = item.title || "";
      const content = item.contentSnippet || item.content || "";
      const text = `${title} ${content}`.toLowerCase();

      const matched = lowerKeywords.filter((k) => text.includes(k));
      if (matched.length === 0) continue;

      articles.push({
        title,
        url: item.link || "",
        source: source.name,
        content_type: source.content_type,
        published_at: item.isoDate
          ? item.isoDate.split("T")[0]
          : null,
        summary: (item.contentSnippet || "").slice(0, 300),
        matched_keywords: matched,
      });
    }

    return articles;
  } catch (error) {
    console.error(`[rss] Error fetching ${source.name}:`, error);
    return [];
  }
}

export async function collectViaRSS(
  batchId: string
): Promise<Partial<Article>[]> {
  // Get enabled RSS sources
  const sources = await getEnabledRssSources();

  if (!sources?.length) {
    console.log("[rss] No RSS sources found");
    return [];
  }

  // Get all enabled keywords
  const allKeywords = await getEnabledKeywords();
  if (allKeywords.length === 0) {
    console.log("[rss] No keywords found");
    return [];
  }

  const allArticles: Partial<Article>[] = [];

  for (const source of sources) {
    const articles = await fetchRssFeed(source, allKeywords);
    allArticles.push(
      ...articles.map((a) => ({ ...a, batch_id: batchId }))
    );
  }

  return allArticles;
}
