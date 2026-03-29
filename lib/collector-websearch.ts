import Anthropic from "@anthropic-ai/sdk";
import { WEB_SEARCH_PROMPTS, KEYWORD_EXPANSION_PROMPT } from "./prompts";
import type { ContentType, Article, KeywordGroup, Source } from "./supabase";
import { CONTENT_TYPES, supabase, isSupabaseConfigured } from "./supabase";
import { localStore } from "./local-store";
import { DEFAULT_KEYWORD_GROUPS, DEFAULT_SOURCES } from "./default-presets";

const anthropic = new Anthropic();

interface RawArticle {
  title: string;
  url: string;
  source: string;
  published_at: string;
  summary: string;
}

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

async function getEnabledKeywordGroups(): Promise<KeywordGroup[]> {
  if (isSupabaseConfigured()) {
    try {
      const { data } = await supabase
        .from("keyword_groups")
        .select("*")
        .eq("enabled", true)
        .order("priority", { ascending: true });
      if (data?.length) return data as KeywordGroup[];
    } catch { /* fall through */ }
  }
  const local = localStore
    .select<KeywordGroup>("keyword_groups")
    .filter((g) => g.enabled)
    .sort((a, b) => a.priority - b.priority);
  if (local.length > 0) return local;

  console.log("[websearch] Using built-in default keyword groups");
  return DEFAULT_KEYWORD_GROUPS as unknown as KeywordGroup[];
}

async function getWebSearchSources(): Promise<Source[]> {
  if (isSupabaseConfigured()) {
    try {
      const { data } = await supabase
        .from("sources")
        .select("*")
        .eq("type", "websearch")
        .eq("enabled", true);
      if (data?.length) return data as Source[];
    } catch { /* fall through */ }
  }
  const local = localStore
    .select<Source>("sources")
    .filter((s) => s.type === "websearch" && s.enabled);
  if (local.length > 0) return local;

  // Fallback to built-in defaults
  return DEFAULT_SOURCES.filter((s) => s.type === "websearch" && s.enabled) as unknown as Source[];
}

async function expandKeywords(keywords: string[]): Promise<string[]> {
  try {
    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1024,
      messages: [
        {
          role: "user",
          content: `${KEYWORD_EXPANSION_PROMPT} ${keywords.join(", ")}`,
        },
      ],
    });

    const textBlock = response.content.find((b) => b.type === "text");
    if (!textBlock || textBlock.type !== "text") return [];

    const parsed = safeParseJSON(textBlock.text);
    return (parsed?.expanded_keywords as string[]) || [];
  } catch (error) {
    console.error("[websearch] Keyword expansion error:", error);
    return [];
  }
}

async function searchByContentType(
  contentType: ContentType,
  keywords: string[]
): Promise<Partial<Article>[]> {
  const prompt = WEB_SEARCH_PROMPTS[contentType];
  const keywordStr = keywords.join(", ");

  try {
    const webSearchTool = {
      type: "web_search_20250305" as const,
      name: "web_search" as const,
      max_uses: 20,
    };
    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 4096,
      // @ts-expect-error web_search tool type not yet in SDK types
      tools: [webSearchTool],
      messages: [
        {
          role: "user",
          content: `${prompt}\n\n검색 키워드: ${keywordStr}`,
        },
      ],
    });

    const textBlock = response.content.find((b) => b.type === "text");
    if (!textBlock || textBlock.type !== "text") return [];

    const parsed = safeParseJSON(textBlock.text);
    const articles: RawArticle[] = (parsed?.articles as RawArticle[]) || [];

    return articles.map((a) => ({
      title: a.title,
      url: a.url,
      source: a.source,
      content_type: contentType,
      published_at: a.published_at,
      summary: a.summary,
      matched_keywords: keywords.slice(0, 5),
    }));
  } catch (error) {
    console.error(`[websearch] Error for ${contentType}:`, error);
    return [];
  }
}

/**
 * Search using individual websearch-type source records.
 * Each source has a name/URL that serves as a search query.
 * Sources are batched by content_type to reduce API calls.
 */
async function searchBySourceRecords(
  sources: Source[]
): Promise<Partial<Article>[]> {
  if (sources.length === 0) return [];

  // Group sources by content_type to batch searches
  const byType = new Map<ContentType, Source[]>();
  for (const s of sources) {
    const group = byType.get(s.content_type) || [];
    group.push(s);
    byType.set(s.content_type, group);
  }

  const allArticles: Partial<Article>[] = [];

  for (const [contentType, typeSources] of byType) {
    // Batch up to 4 sources per search to reduce API calls
    for (let i = 0; i < typeSources.length; i += 4) {
      const batch = typeSources.slice(i, i + 4);
      const sourceNames = batch.map((s) => s.name).join(", ");
      const searchTerms = batch.map((s) => s.url).join(" | ");

      const prompt = `당신은 ACRYL Inc.의 시장 인텔리전스 분석가입니다.
다음 기관/출처에서 최근 7일 이내 발표된 최신 콘텐츠를 검색하세요:
${batch.map((s) => `- ${s.name}: ${s.description || ""} (${s.url})`).join("\n")}

AI 인프라, GPU 클라우드, MLOps, AI 에이전트, 헬스케어 AI와 관련된 내용을 우선 수집하세요.

각 항목에 대해 다음 JSON 형식으로 반환하세요:
{
  "articles": [
    {
      "title": "제목",
      "url": "URL",
      "source": "출처/기관명",
      "published_at": "날짜 (YYYY-MM-DD)",
      "summary": "핵심 내용 3-4문장 요약"
    }
  ]
}

10건 이내로 반환하세요. JSON만 반환하세요.`;

      try {
        const webSearchTool = {
          type: "web_search_20250305" as const,
          name: "web_search" as const,
          max_uses: 20,
        };
        const response = await anthropic.messages.create({
          model: "claude-sonnet-4-20250514",
          max_tokens: 4096,
          // @ts-expect-error web_search tool type not yet in SDK types
          tools: [webSearchTool],
          messages: [
            {
              role: "user",
              content: `${prompt}\n\n검색 대상: ${sourceNames}\n검색어: ${searchTerms}`,
            },
          ],
        });

        const textBlock = response.content.find((b) => b.type === "text");
        if (textBlock && textBlock.type === "text") {
          const parsed = safeParseJSON(textBlock.text);
          const articles: RawArticle[] = (parsed?.articles as RawArticle[]) || [];

          allArticles.push(
            ...articles.map((a) => ({
              title: a.title,
              url: a.url,
              source: a.source,
              content_type: contentType,
              published_at: a.published_at,
              summary: a.summary,
              matched_keywords: [sourceNames],
            }))
          );
          console.log(`[websearch] Source batch [${sourceNames}]: ${articles.length} articles`);
        }
      } catch (error) {
        console.error(`[websearch] Source search error [${sourceNames}]:`, error);
      }

      await new Promise((r) => setTimeout(r, 1500));
    }
  }

  return allArticles;
}

export async function collectViaWebSearch(
  batchId: string
): Promise<Partial<Article>[]> {
  const allArticles: Partial<Article>[] = [];

  // Part 1: Keyword-based content type searches
  const keywordGroups = await getEnabledKeywordGroups();

  if (keywordGroups?.length) {
    for (const ct of CONTENT_TYPES) {
      const relevantGroups = keywordGroups.filter(
        (g) =>
          g.content_types.length === 0 || g.content_types.includes(ct)
      );

      if (relevantGroups.length === 0) continue;

      const keywords = relevantGroups
        .flatMap((g) => g.keywords)
        .slice(0, 10);

      // Round 1: Search with original keywords
      const round1 = await searchByContentType(ct, keywords);
      allArticles.push(
        ...round1.map((a) => ({ ...a, batch_id: batchId }))
      );
      console.log(`[websearch] Content type [${ct}]: ${round1.length} articles`);

      await new Promise((r) => setTimeout(r, 1500));

      // Round 2: Expand keywords for high-priority types
      if (["news", "report", "consulting", "government", "research"].includes(ct)) {
        const expanded = await expandKeywords(keywords.slice(0, 5));
        if (expanded.length > 0) {
          await new Promise((r) => setTimeout(r, 1000));
          const round2 = await searchByContentType(ct, expanded);
          allArticles.push(
            ...round2.map((a) => ({ ...a, batch_id: batchId }))
          );
          if (round2.length > 0) {
            console.log(`[websearch] Content type [${ct}] expanded: ${round2.length} articles`);
          }
        }
        await new Promise((r) => setTimeout(r, 1500));
      }
    }
  } else {
    console.log("[websearch] No keyword groups found, skipping keyword-based search");
  }

  // Part 2: Source-record-based searches (websearch type sources)
  const webSources = await getWebSearchSources();
  if (webSources.length > 0) {
    console.log(`[websearch] Searching ${webSources.length} websearch source records...`);
    const sourceArticles = await searchBySourceRecords(webSources);
    allArticles.push(
      ...sourceArticles.map((a) => ({ ...a, batch_id: batchId }))
    );
    console.log(`[websearch] Source records total: ${sourceArticles.length} articles`);
  }

  console.log(`[websearch] Total collected: ${allArticles.length} articles`);
  return allArticles;
}
