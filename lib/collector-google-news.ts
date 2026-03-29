import RssParser from "rss-parser";
import type { Article } from "./supabase";

const parser = new RssParser({
  timeout: 15000,
  headers: {
    "User-Agent": "Mozilla/5.0 (compatible; ACRYL-Intel/1.0)",
  },
});

// Core search queries targeting ACRYL's business domains
const SEARCH_QUERIES = [
  "GPU 클라우드 AI 인프라",
  "AI 에이전트 멀티에이전트",
  "MLOps 모델서빙 vLLM",
  "의료AI 디지털헬스케어",
  "AI반도체 NVIDIA HBM",
  "생성형AI LLM",
  "AI 데이터센터 투자",
  "AI 스타트업 GPU 클라우드",
  "CoreWeave Lambda AI",
];

function buildGoogleNewsUrl(query: string): string {
  const encoded = encodeURIComponent(query);
  return `https://news.google.com/rss/search?q=${encoded}&hl=ko&gl=KR&ceid=KR:ko`;
}

async function fetchGoogleNewsFeed(
  query: string
): Promise<Partial<Article>[]> {
  const url = buildGoogleNewsUrl(query);
  try {
    const feed = await parser.parseURL(url);
    const articles: Partial<Article>[] = [];
    const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    for (const item of feed.items.slice(0, 15)) {
      if (item.isoDate) {
        const pubDate = new Date(item.isoDate);
        if (pubDate < cutoff) continue;
      }

      const title = item.title || "";
      // Google News titles often have " - Source" at the end
      const sourceName = title.includes(" - ")
        ? title.split(" - ").pop()?.trim() || "Google News"
        : "Google News";

      articles.push({
        title,
        url: item.link || "",
        source: sourceName,
        content_type: "news",
        published_at: item.isoDate ? item.isoDate.split("T")[0] : null,
        summary: (item.contentSnippet || "").slice(0, 300),
        matched_keywords: [query],
      });
    }

    return articles;
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error(`[google-news] Error fetching "${query}":`, msg);
    return [];
  }
}

export async function collectViaGoogleNews(
  batchId: string
): Promise<Partial<Article>[]> {
  console.log(`[google-news] Searching ${SEARCH_QUERIES.length} queries...`);

  const allArticles: Partial<Article>[] = [];

  // Process 4 queries at a time
  const concurrency = 4;
  for (let i = 0; i < SEARCH_QUERIES.length; i += concurrency) {
    const batch = SEARCH_QUERIES.slice(i, i + concurrency);
    const results = await Promise.allSettled(
      batch.map((q) => fetchGoogleNewsFeed(q))
    );

    for (const result of results) {
      if (result.status === "fulfilled") {
        allArticles.push(
          ...result.value.map((a) => ({ ...a, batch_id: batchId }))
        );
      }
    }

    // Small delay between batches to be polite
    if (i + concurrency < SEARCH_QUERIES.length) {
      await new Promise((r) => setTimeout(r, 500));
    }
  }

  console.log(`[google-news] Collected ${allArticles.length} articles`);
  return allArticles;
}
