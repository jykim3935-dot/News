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
  const defaults = DEFAULT_SOURCES.filter(
    (s) => s.type === "rss" && s.enabled
  ) as unknown as Source[];

  let dbSources: Source[] = [];
  if (isSupabaseConfigured()) {
    try {
      const { data } = await supabase
        .from("sources")
        .select("*")
        .eq("type", "rss")
        .eq("enabled", true);
      if (data?.length) dbSources = data as Source[];
    } catch { /* fall through */ }
  }
  if (dbSources.length === 0) {
    const local = localStore
      .select<Source>("sources")
      .filter((s) => s.type === "rss" && s.enabled);
    if (local.length > 0) dbSources = local;
  }
  if (dbSources.length === 0) return defaults;

  // DB에 없는 defaults 병합
  const existingNames = new Set(dbSources.map((s) => s.name));
  const missing = defaults.filter((s) => !existingNames.has(s.name));
  if (missing.length > 0) {
    console.log(`[rss] Merging ${missing.length} new default sources`);
  }
  return [...dbSources, ...missing];
}

async function getEnabledKeywords(): Promise<string[]> {
  const defaultGroups = DEFAULT_KEYWORD_GROUPS.filter((g) => g.enabled);

  let dbGroups: KeywordGroup[] = [];
  if (isSupabaseConfigured()) {
    try {
      const { data } = await supabase
        .from("keyword_groups")
        .select("*")
        .eq("enabled", true);
      if (data?.length) dbGroups = data as KeywordGroup[];
    } catch { /* fall through */ }
  }
  if (dbGroups.length === 0) {
    const local = localStore
      .select<KeywordGroup>("keyword_groups")
      .filter((g) => g.enabled);
    if (local.length > 0) dbGroups = local;
  }
  if (dbGroups.length === 0) return defaultGroups.flatMap((g) => g.keywords);

  // DB에 없는 default keyword groups 병합
  const existingNames = new Set(dbGroups.map((g) => g.group_name));
  const missingGroups = defaultGroups.filter((g) => !existingNames.has(g.group_name));
  if (missingGroups.length > 0) {
    console.log(`[rss] Merging ${missingGroups.length} new default keyword groups`);
  }
  const allGroups = [...dbGroups, ...(missingGroups as unknown as KeywordGroup[])];
  return allGroups.flatMap((g) => g.keywords);
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
    const cutoff = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);

    for (const item of feed.items.slice(0, 50)) {
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
