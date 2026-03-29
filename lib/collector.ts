import { supabase, isSupabaseConfigured } from "./supabase";
import { localStore } from "./local-store";
import type { Article } from "./supabase";
import { collectViaWebSearch } from "./collector-websearch";
import { collectViaRSS } from "./collector-rss";
import { collectViaDart } from "./collector-dart";
import { collectGovPolicy } from "./collector-gov";
import { collectResearch } from "./collector-research";
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
  console.log("[collector] Starting collection (5 collectors)...");

  // Run all 5 collectors in parallel
  const [webArticles, rssArticles, dartArticles, govArticles, researchArticles] =
    await Promise.allSettled([
      collectViaWebSearch(batchId),
      collectViaRSS(batchId),
      collectViaDart(batchId),
      collectGovPolicy(batchId),
      collectResearch(batchId),
    ]).then((results) =>
      results.map((r) => (r.status === "fulfilled" ? r.value : []))
    );

  console.log(
    `[collector] Web: ${webArticles.length}, RSS: ${rssArticles.length}, DART: ${dartArticles.length}, Gov: ${govArticles.length}, Research: ${researchArticles.length}`
  );

  // Combine and deduplicate
  const allArticles = deduplicateArticles([
    ...webArticles,
    ...rssArticles,
    ...dartArticles,
    ...govArticles,
    ...researchArticles,
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
