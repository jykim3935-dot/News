/**
 * 해외 기사 수집기 — Claude web_search 툴 사용
 * 영문 검색어로 글로벌 AI/반도체 뉴스를 수집합니다.
 */
import Anthropic from "@anthropic-ai/sdk";
import { CLAUDE_MODEL, GLOBAL_QUERIES, MAX_AGE_DAYS } from "./config";
import type { RawArticle } from "./types";

const anthropic = new Anthropic();

interface RawItem {
  title: string;
  url: string;
  source: string;
  published_at: string;
  summary: string;
}

function extractJsonArray(text: string): unknown[] {
  const match = text.match(/\[[\s\S]*\]/);
  if (!match) return [];
  try {
    return JSON.parse(match[0]);
  } catch {
    return [];
  }
}

async function searchGlobal(query: string): Promise<RawArticle[]> {
  const webSearchTool = {
    type: "web_search_20250305" as const,
    name: "web_search" as const,
    max_uses: 5,
  };

  const response = await anthropic.messages.create({
    model: CLAUDE_MODEL,
    max_tokens: 3072,
    // @ts-expect-error web_search tool type not yet in SDK types
    tools: [webSearchTool],
    messages: [
      {
        role: "user",
        content: `Search for the most recent (within ${MAX_AGE_DAYS} days) global news about: ${query}.
Focus on AI infrastructure, semiconductors, GPU cloud, frontier models, and AI startup funding.
Return ONLY a JSON array, each item: {"title","url","source","published_at":"YYYY-MM-DD","summary"}.
Translate title and summary into Korean. No markdown, JSON only.`,
      },
    ],
  });

  const textBlock = response.content.find((b) => b.type === "text");
  const raw = textBlock && textBlock.type === "text" ? textBlock.text : "[]";
  const items = extractJsonArray(raw) as RawItem[];

  return items
    .filter((it) => it.url && it.title)
    .map((it) => ({
      title: it.title,
      url: it.url,
      description: it.summary || "",
      publishedAt: it.published_at || new Date().toISOString().slice(0, 10),
      media: "기타",
      query,
    }));
}

/** 모든 글로벌 검색어를 수집하고 URL 기준 중복 제거 */
export async function collectGlobal(): Promise<RawArticle[]> {
  console.log(`[global] ${GLOBAL_QUERIES.length}개 영문 검색어 수집 시작...`);

  const all: RawArticle[] = [];
  for (const query of GLOBAL_QUERIES) {
    try {
      const articles = await searchGlobal(query);
      console.log(`[global]   "${query}": ${articles.length}건`);
      all.push(...articles);
    } catch (e) {
      console.warn(`[global]   "${query}" 실패: ${e}`);
    }
    // rate limit
    await new Promise((r) => setTimeout(r, 1500));
  }

  const seen = new Set<string>();
  const deduped = all.filter((a) => {
    if (seen.has(a.url)) return false;
    seen.add(a.url);
    return true;
  });

  console.log(`[global] 총 ${all.length}건, 중복 제거 후 ${deduped.length}건`);
  return deduped;
}
