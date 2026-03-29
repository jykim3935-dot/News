import Anthropic from "@anthropic-ai/sdk";
import { EXECUTIVE_BRIEF_PROMPT } from "./prompts";
import type { Article } from "./supabase";

const anthropic = new Anthropic();

function safeParseJSON(text: string): Record<string, unknown> | null {
  // Try direct parse first (Claude usually returns clean JSON)
  const trimmed = text.trim();
  try {
    return JSON.parse(trimmed);
  } catch { /* fallback */ }

  // Try extracting JSON block between first { and its matching }
  const start = trimmed.indexOf("{");
  if (start === -1) return null;

  let depth = 0;
  for (let i = start; i < trimmed.length; i++) {
    if (trimmed[i] === "{") depth++;
    else if (trimmed[i] === "}") depth--;
    if (depth === 0) {
      try {
        return JSON.parse(trimmed.slice(start, i + 1));
      } catch {
        return null;
      }
    }
  }
  return null;
}

export async function generateExecutiveBrief(
  articles: Article[]
): Promise<string> {
  console.log("[executive-brief] Generating brief from", articles.length, "articles");

  if (articles.length === 0) return "";

  // Sort by relevance and take top articles for brief
  const topArticles = [...articles]
    .sort((a, b) => (b.relevance_score || 0) - (a.relevance_score || 0))
    .slice(0, 50);

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
    if (!textBlock || textBlock.type !== "text") {
      console.error("[executive-brief] No text block in response");
      return "";
    }

    const parsed = safeParseJSON(textBlock.text);
    if (!parsed || !parsed.executive_brief) {
      console.error("[executive-brief] Failed to parse JSON or missing executive_brief key");
      // Try to use raw text if it contains tags
      const raw = textBlock.text.trim();
      if (raw.includes("[시장 시그널]") || raw.includes("[기회 포착]")) {
        return raw;
      }
      return "";
    }

    return parsed.executive_brief as string;
  } catch (error) {
    console.error("[executive-brief] Error:", error);
    return "";
  }
}
