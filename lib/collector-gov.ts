import Anthropic from "@anthropic-ai/sdk";
import { GOV_SEARCH_PROMPT } from "./prompts";
import type { Article } from "./supabase";

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

const GOV_KEYWORD_SETS = [
  ["AI 정책", "인공지능 정책", "과기정통부 AI", "AI기본법", "디지털플랫폼정부"],
  ["공공 AI 인프라", "나라장터 GPU", "공공 클라우드", "AI 데이터센터 구축", "국가 AI 컴퓨팅"],
  ["AI 규제", "AI 윤리", "AI 안전", "디지털뉴딜", "국가AI위원회"],
];

export async function collectGovPolicy(
  batchId: string
): Promise<Partial<Article>[]> {
  console.log("[gov-collector] Starting government policy collection...");
  const allArticles: Partial<Article>[] = [];

  for (const keywords of GOV_KEYWORD_SETS) {
    try {
      const webSearchTool = {
        type: "web_search_20250305" as const,
        name: "web_search" as const,
        max_uses: 15,
      };
      const response = await anthropic.messages.create({
        model: "claude-sonnet-4-20250514",
        max_tokens: 4096,
        // @ts-expect-error web_search tool type not yet in SDK types
        tools: [webSearchTool],
        messages: [
          {
            role: "user",
            content: `${GOV_SEARCH_PROMPT} ${keywords.join(", ")}`,
          },
        ],
      });

      const textBlock = response.content.find((b) => b.type === "text");
      if (!textBlock || textBlock.type !== "text") continue;

      const parsed = JSON.parse(extractJSON(textBlock.text));
      const articles: RawArticle[] = parsed.articles || [];

      allArticles.push(
        ...articles.map((a) => ({
          title: a.title,
          url: a.url,
          source: a.source,
          content_type: "government" as const,
          published_at: a.published_at,
          summary: a.summary,
          matched_keywords: keywords,
          batch_id: batchId,
        }))
      );
    } catch (error) {
      console.error(`[gov-collector] Error:`, error);
    }

    await new Promise((r) => setTimeout(r, 1500));
  }

  console.log(`[gov-collector] Collected ${allArticles.length} articles`);
  return allArticles;
}
