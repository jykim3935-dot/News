import Anthropic from "@anthropic-ai/sdk";
import { TREND_DETECTION_PROMPT } from "./prompts";
import { supabase, isSupabaseConfigured } from "./supabase";
import { localStore } from "./local-store";
import type { Article, Trend } from "./supabase";

const anthropic = new Anthropic();

function extractJSON(text: string): string {
  const match = text.match(/\{[\s\S]*\}/);
  return match ? match[0] : "{}";
}

interface RawTrend {
  trend_title: string;
  trend_description: string;
  related_indices: number[];
  category: string;
  strength: "rising" | "stable" | "emerging";
}

export interface DetectedTrends {
  trends: Trend[];
  summary: string;
}

export async function detectTrends(
  articles: Article[],
  batchId: string
): Promise<DetectedTrends> {
  console.log("[trend-detector] Analyzing trends from", articles.length, "articles");

  if (articles.length < 3) {
    return { trends: [], summary: "기사 수가 부족하여 트렌드 분석을 건너뜁니다." };
  }

  // Use top articles for trend detection
  const topArticles = [...articles]
    .sort((a, b) => (b.relevance_score || 0) - (a.relevance_score || 0))
    .slice(0, 60);

  const articleList = topArticles
    .map(
      (a, i) =>
        `[${i}] [${a.content_type}] [${a.category || "-"}] ${a.title} (${a.source || "unknown"})
    ${a.summary || ""}`
    )
    .join("\n\n");

  try {
    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 4096,
      messages: [
        {
          role: "user",
          content: `${TREND_DETECTION_PROMPT}\n\n${articleList}`,
        },
      ],
    });

    const textBlock = response.content.find((b) => b.type === "text");
    if (!textBlock || textBlock.type !== "text") {
      return { trends: [], summary: "트렌드 분석 실패" };
    }

    const parsed = JSON.parse(extractJSON(textBlock.text));
    const rawTrends: RawTrend[] = parsed.trends || [];

    // Map indices to article IDs and save to DB
    const trends: Trend[] = [];
    for (const rt of rawTrends) {
      const relatedIds = rt.related_indices
        .map((idx) => topArticles[idx]?.id)
        .filter(Boolean) as string[];

      const trendRecord = {
        batch_id: batchId,
        trend_title: rt.trend_title,
        trend_description: rt.trend_description,
        related_article_ids: relatedIds,
        category: rt.category,
        strength: rt.strength,
      };

      let saved: Trend | null = null;

      if (isSupabaseConfigured()) {
        try {
          const { data } = await supabase
            .from("trends")
            .insert(trendRecord)
            .select()
            .single();
          saved = data as Trend | null;
        } catch { /* fall through */ }
      }

      if (!saved) {
        saved = localStore.insert<Trend>("trends", trendRecord as Omit<Trend, "id" | "created_at">);
      }

      if (saved) {
        trends.push(saved);
      }
    }

    // Generate summary text
    const summary = rawTrends
      .map(
        (t, i) =>
          `${i + 1}. ${t.strength === "rising" ? "🔥" : t.strength === "emerging" ? "🌱" : "📊"} ${t.trend_title}: ${t.trend_description.slice(0, 100)}`
      )
      .join("\n");

    console.log(`[trend-detector] Detected ${trends.length} trends`);
    return { trends, summary };
  } catch (error) {
    console.error("[trend-detector] Error:", error);
    return { trends: [], summary: "트렌드 분석 중 오류 발생" };
  }
}
