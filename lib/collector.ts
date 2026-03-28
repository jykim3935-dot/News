import { supabase } from "./supabase";
import type { Article } from "./supabase";
import { collectViaWebSearch } from "./collector-websearch";
import { collectViaRSS } from "./collector-rss";
import { collectViaDart } from "./collector-dart";
import crypto from "crypto";

function deduplicateArticles(
  articles: Partial<Article>[]
): Partial<Article>[] {
  const seen = new Set<string>();
  return articles.filter((a) => {
    const key = crypto
      .createHash("md5")
      .update((a.title || "").slice(0, 40))
      .digest("hex");
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export async function collectAll(
  batchId: string
): Promise<Partial<Article>[]> {
  console.log("[collector] Starting collection...");

  // Run all collectors in parallel
  const [webArticles, rssArticles, dartArticles] = await Promise.allSettled([
    collectViaWebSearch(batchId),
    collectViaRSS(batchId),
    collectViaDart(batchId),
  ]).then((results) =>
    results.map((r) => (r.status === "fulfilled" ? r.value : []))
  );

  console.log(
    `[collector] Web: ${webArticles.length}, RSS: ${rssArticles.length}, DART: ${dartArticles.length}`
  );

  // Combine and deduplicate
  const allArticles = deduplicateArticles([
    ...webArticles,
    ...rssArticles,
    ...dartArticles,
  ]);

  console.log(`[collector] After dedup: ${allArticles.length} articles`);

  // Save to database
  if (allArticles.length > 0) {
    const { error } = await supabase.from("articles").insert(
      allArticles.map((a) => ({
        title: a.title,
        url: a.url,
        source: a.source,
        content_type: a.content_type,
        published_at: a.published_at,
        summary: a.summary,
        matched_keywords: a.matched_keywords || [],
        batch_id: batchId,
      }))
    );

    if (error) {
      console.error("[collector] Error saving articles:", error);
      throw error;
    }
  }

  return allArticles;
}
