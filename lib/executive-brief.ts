import Anthropic from "@anthropic-ai/sdk";
import { EXECUTIVE_BRIEF_PROMPT } from "./prompts";
import type { Article } from "./supabase";

const anthropic = new Anthropic();

function safeParseJSON(text: string): Record<string, unknown> | null {
  const trimmed = text.trim();
  try {
    return JSON.parse(trimmed);
  } catch { /* fallback */ }

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

/**
 * Extract brief text from AI response using multiple strategies:
 * 1. JSON parse → executive_brief key
 * 2. Tag-based extraction from raw text
 * 3. Raw text fallback if it looks like a brief
 */
function extractBrief(rawText: string): string {
  const text = rawText.trim();
  if (!text) return "";

  // Strategy 1: JSON parse
  const parsed = safeParseJSON(text);
  if (parsed && typeof parsed.executive_brief === "string" && parsed.executive_brief.length > 10) {
    console.log("[executive-brief] Extracted via JSON parse");
    return parsed.executive_brief;
  }

  // Strategy 2: Look for tagged sections in raw text
  const TAG_PATTERN = /\[(긴급 대응|시장 시그널|기회 포착|주간 맥락)\]/;
  if (TAG_PATTERN.test(text)) {
    const firstTag = text.search(TAG_PATTERN);
    let briefText = text.slice(firstTag);
    // Remove trailing JSON artifacts like `"}` or `"}`
    briefText = briefText.replace(/["\s}]+$/, "").trim();
    if (briefText.length > 20) {
      console.log("[executive-brief] Extracted via tag pattern");
      return briefText;
    }
  }

  // Strategy 3: Look for "executive_brief" value in text even if JSON is malformed
  const kvMatch = text.match(/"executive_brief"\s*:\s*"([\s\S]+?)(?:"\s*}|"$)/);
  if (kvMatch && kvMatch[1].length > 20) {
    const unescaped = kvMatch[1].replace(/\\n/g, "\n").replace(/\\"/g, '"').replace(/\\\\/g, "\\");
    console.log("[executive-brief] Extracted via regex key-value match");
    return unescaped;
  }

  // Strategy 4: If the text itself looks like a brief (has Korean text, reasonable length)
  const plainText = text.replace(/^[{\s"]+/, "").replace(/[}\s"]+$/, "");
  if (plainText.length > 50 && /[가-힣]/.test(plainText) && !plainText.startsWith("{")) {
    console.log("[executive-brief] Using cleaned plain text as brief");
    return plainText;
  }

  console.error("[executive-brief] All extraction strategies failed. Raw text length:", text.length);
  console.error("[executive-brief] Raw text preview:", text.slice(0, 200));
  return "";
}

export async function generateExecutiveBrief(
  articles: Article[]
): Promise<string> {
  console.log("[executive-brief] Generating brief from", articles.length, "articles");

  if (articles.length === 0) return "";

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
    console.log("[executive-brief] Calling Anthropic API...");
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

    console.log("[executive-brief] API response received, stop_reason:", response.stop_reason);

    const textBlock = response.content.find((b) => b.type === "text");
    if (!textBlock || textBlock.type !== "text") {
      console.error("[executive-brief] No text block in response. Content types:", response.content.map(b => b.type));
      return "";
    }

    console.log("[executive-brief] Raw response length:", textBlock.text.length);
    const brief = extractBrief(textBlock.text);
    if (brief) {
      console.log("[executive-brief] Successfully generated brief, length:", brief.length);
    } else {
      console.error("[executive-brief] extractBrief returned empty");
    }
    return brief;
  } catch (error) {
    console.error("[executive-brief] API Error:", error instanceof Error ? error.message : String(error));
    return "";
  }
}
