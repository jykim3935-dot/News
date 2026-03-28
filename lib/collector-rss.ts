import RssParser from "rss-parser";
import { supabase } from "./supabase";
import type { Article, Source } from "./supabase";

const parser = new RssParser({
  timeout: 10000,
  headers: {
    "User-Agent": "ACRYL-Intel/1.0",
  },
});

async function fetchRssFeed(
  source: Source,
  keywords: string[]
): Promise<Partial<Article>[]> {
  try {
    const feed = await parser.parseURL(source.url);
    const articles: Partial<Article>[] = [];
    const lowerKeywords = keywords.map((k) => k.toLowerCase());

    for (const item of feed.items.slice(0, 20)) {
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
  const { data: sources } = await supabase
    .from("sources")
    .select("*")
    .eq("type", "rss")
    .eq("enabled", true);

  if (!sources?.length) {
    console.log("[rss] No RSS sources found");
    return [];
  }

  // Get all enabled keywords
  const { data: keywordGroups } = await supabase
    .from("keyword_groups")
    .select("*")
    .eq("enabled", true);

  const allKeywords = (keywordGroups || []).flatMap((g) => g.keywords);
  if (allKeywords.length === 0) return [];

  const allArticles: Partial<Article>[] = [];

  for (const source of sources) {
    const articles = await fetchRssFeed(source, allKeywords);
    allArticles.push(
      ...articles.map((a) => ({ ...a, batch_id: batchId }))
    );
  }

  return allArticles;
}
