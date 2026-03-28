import Anthropic from "@anthropic-ai/sdk";
import { EXECUTIVE_BRIEF_PROMPT } from "./prompts";
import type { Article } from "./supabase";

const anthropic = new Anthropic();

function extractJSON(text: string): string {
  const match = text.match(/\{[\s\S]*\}/);
  return match ? match[0] : "{}";
}

export async function generateExecutiveBrief(
  articles: Article[]
): Promise<string> {
  console.log("[executive-brief] Generating brief from", articles.length, "articles");

  if (articles.length === 0) return "수집된 기사가 없습니다.";

  // Sort by relevance and take top articles for brief
  const topArticles = [...articles]
    .sort((a, b) => (b.relevance_score || 0) - (a.relevance_score || 0))
    .slice(0, 30);

  const articleList = topArticles
    .map(
      (a, i) =>
        `[${i}] [${a.content_type}] [${a.urgency || "green"}] [${a.relevance_score || 0}/10] ${a.title} (${a.source || "unknown"})
    ${a.impact_comment || a.summary || ""}`
    )
    .join("\n\n");

  try {
    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 2048,
      messages: [
        {
          role: "user",
          content: `${EXECUTIVE_BRIEF_PROMPT}\n\n${articleList}`,
        },
      ],
    });

    const textBlock = response.content.find((b) => b.type === "text");
    if (!textBlock || textBlock.type !== "text") return "브리프 생성 실패";

    const parsed = JSON.parse(extractJSON(textBlock.text));
    return parsed.executive_brief || "브리프 생성 실패";
  } catch (error) {
    console.error("[executive-brief] Error:", error);
    return "브리프 생성 중 오류 발생";
  }
}
