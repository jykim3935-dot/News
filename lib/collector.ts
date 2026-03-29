import { supabase, isSupabaseConfigured } from "./supabase";
import { localStore } from "./local-store";
import type { Article } from "./supabase";
import { collectViaWebSearch } from "./collector-websearch";
import { collectViaRSS } from "./collector-rss";
import { collectViaDart } from "./collector-dart";
import { collectGovPolicy } from "./collector-gov";
import { collectResearch } from "./collector-research";
import { collectViaGoogleNews } from "./collector-google-news";

/**
 * Normalize URL for dedup: remove query params, trailing slash, fragment
 */
function normalizeUrl(url: string): string {
  try {
    const u = new URL(url);
    u.search = "";
    u.hash = "";
    const path = u.pathname.replace(/\/+$/, "");
    return `${u.hostname.toLowerCase()}${path}`;
  } catch {
    return url.toLowerCase().trim();
  }
}

/**
 * Normalize title for dedup: remove spaces/punctuation, lowercase, first 60 chars
 */
function normalizeTitle(title: string): string {
  return title
    .toLowerCase()
    .replace(/[\s\-_:;,.!?'"()\[\]{}|\/\\@#$%^&*+=~`<>]/g, "")
    .slice(0, 60);
}

function deduplicateArticles(
  articles: Partial<Article>[]
): Partial<Article>[] {
  const seenUrls = new Set<string>();
  const seenTitles = new Set<string>();

  return articles.filter((a) => {
    // URL-based dedup
    if (a.url) {
      const normUrl = normalizeUrl(a.url);
      if (seenUrls.has(normUrl)) return false;
      seenUrls.add(normUrl);
    }

    // Title-based dedup
    const normTitle = normalizeTitle(a.title || "");
    if (normTitle.length > 5) {
      if (seenTitles.has(normTitle)) return false;
      seenTitles.add(normTitle);
    }

    return true;
  });
}

export async function collectAll(
  batchId: string
): Promise<Partial<Article>[]> {
  console.log("[collector] Starting collection (6 collectors)...");

  // Run all 6 collectors in parallel
  const [webArticles, rssArticles, dartArticles, govArticles, researchArticles, googleNewsArticles] =
    await Promise.allSettled([
      collectViaWebSearch(batchId),
      collectViaRSS(batchId),
      collectViaDart(batchId),
      collectGovPolicy(batchId),
      collectResearch(batchId),
      collectViaGoogleNews(batchId),
    ]).then((results) =>
      results.map((r) => (r.status === "fulfilled" ? r.value : []))
    );

  console.log(
    `[collector] Web: ${webArticles.length}, RSS: ${rssArticles.length}, DART: ${dartArticles.length}, Gov: ${govArticles.length}, Research: ${researchArticles.length}, GoogleNews: ${googleNewsArticles.length}`
  );

  // Combine and deduplicate
  const allArticles = deduplicateArticles([
    ...webArticles,
    ...rssArticles,
    ...dartArticles,
    ...govArticles,
    ...researchArticles,
    ...googleNewsArticles,
  ]);

  console.log(`[collector] After dedup: ${allArticles.length} articles`);

  // Save to database
  if (allArticles.length > 0) {
    const records = allArticles.map((a) => ({
      title: a.title,
      url: a.url,
      source: a.source,
      content_type: a.content_type,
      published_at: a.published_at,
      summary: a.summary,
      matched_keywords: a.matched_keywords || [],
      batch_id: batchId,
    }));

    if (isSupabaseConfigured()) {
      try {
        const { error } = await supabase.from("articles").insert(records);
        if (error) {
          console.error("[collector] Supabase insert error:", error.message, error.details, error.hint);
          throw error;
        }
        console.log(`[collector] Inserted ${records.length} articles into Supabase (batch: ${batchId})`);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error("[collector] Supabase insert failed, falling back to local store:", msg);
        localStore.insertMany<Article>("articles", records as Omit<Article, "id" | "created_at">[]);
      }
    } else {
      localStore.insertMany<Article>("articles", records as Omit<Article, "id" | "created_at">[]);
    }
  }

  return allArticles;
}
