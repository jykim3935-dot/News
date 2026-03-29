import Anthropic from "@anthropic-ai/sdk";
import { supabase } from "./supabase";
import type { Article } from "./supabase";

const anthropic = new Anthropic();

/**
 * 영어 텍스트인지 감지 (간단한 휴리스틱: 라틴 문자 비율 기반)
 */
function isEnglish(text: string): boolean {
  if (!text) return false;
  const latinChars = text.match(/[a-zA-Z]/g)?.length || 0;
  const totalChars = text.replace(/[\s\d\W]/g, "").length || 1;
  return latinChars / totalChars > 0.7;
}

/**
 * 기사 배열에서 영문 기사를 감지하고 한국어로 번역
 */
interface TranslationItem {
  index: number;
  title: string;
  summary: string;
}

interface TranslationResult {
  index: number;
  title_ko: string;
  summary_ko: string;
}

function extractJSON(text: string): string {
  const match = text.match(/\{[\s\S]*\}/);
  return match ? match[0] : "{}";
}

const TRANSLATION_PROMPT = `당신은 전문 기술 번역가입니다. 아래 영문 기사의 제목과 요약을 자연스러운 한국어로 번역하세요.

규칙:
- 기술 용어(AI, GPU, MLOps, MCP, LLM 등)는 원문 그대로 유지
- 기업명, 인명은 원문 유지 (예: NVIDIA, OpenAI, Anthropic)
- 자연스러운 한국어 문체 사용 (직역 금지)
- 제목은 간결하게, 요약은 원문의 핵심 정보를 모두 포함

다음 JSON 형식으로 반환하세요:
{
  "translations": [
    {
      "index": 0,
      "title_ko": "번역된 제목",
      "summary_ko": "번역된 요약"
    }
  ]
}

JSON만 반환하세요.

번역할 기사:`;

/**
 * 수집된 기사에서 영문을 감지하여 한국어로 번역
 * - 원문은 original_title, original_summary에 보존
 * - title, summary를 번역된 한국어로 교체
 */
export async function translateArticles(batchId: string): Promise<number> {
  const { data: articles } = await supabase
    .from("articles")
    .select("*")
    .eq("batch_id", batchId)
    .is("original_language", null);

  if (!articles?.length) {
    // original_language가 이미 설정된 경우, 아직 설정 안 된 것만 처리
    const { data: untagged } = await supabase
      .from("articles")
      .select("*")
      .eq("batch_id", batchId);

    if (!untagged?.length) {
      console.log("[translator] No articles to process");
      return 0;
    }

    // 언어 태그가 아직 없는 기사들 처리
    return await processArticles(untagged as Article[]);
  }

  return await processArticles(articles as Article[]);
}

async function processArticles(articles: Article[]): Promise<number> {
  // 영어 기사 식별
  const englishArticles: { article: Article; idx: number }[] = [];
  const koreanArticles: Article[] = [];

  for (const article of articles) {
    if (isEnglish(article.title)) {
      englishArticles.push({ article, idx: englishArticles.length });
    } else {
      koreanArticles.push(article);
    }
  }

  // 한국어 기사는 original_language만 태그
  if (koreanArticles.length > 0) {
    for (const article of koreanArticles) {
      await supabase
        .from("articles")
        .update({ original_language: "ko" })
        .eq("id", article.id);
    }
  }

  if (englishArticles.length === 0) {
    console.log("[translator] No English articles to translate");
    return 0;
  }

  console.log(
    `[translator] Found ${englishArticles.length} English articles, translating...`
  );

  let translatedCount = 0;

  // 10개씩 배치 번역
  const batchSize = 10;
  for (let i = 0; i < englishArticles.length; i += batchSize) {
    const batch = englishArticles.slice(i, i + batchSize);

    const items: TranslationItem[] = batch.map((b, idx) => ({
      index: idx,
      title: b.article.title,
      summary: b.article.summary || "",
    }));

    const batchContent = items
      .map(
        (item) =>
          `[${item.index}] 제목: ${item.title}\n    요약: ${item.summary || "(없음)"}`
      )
      .join("\n\n");

    try {
      const response = await anthropic.messages.create({
        model: "claude-sonnet-4-20250514",
        max_tokens: 4096,
        messages: [
          {
            role: "user",
            content: `${TRANSLATION_PROMPT}\n\n${batchContent}`,
          },
        ],
      });

      const textBlock = response.content.find((b) => b.type === "text");
      if (!textBlock || textBlock.type !== "text") continue;

      const parsed = JSON.parse(extractJSON(textBlock.text));
      const translations: TranslationResult[] = parsed.translations || [];

      for (const tr of translations) {
        const entry = batch[tr.index];
        if (!entry) continue;

        await supabase
          .from("articles")
          .update({
            original_language: "en",
            original_title: entry.article.title,
            original_summary: entry.article.summary,
            title: tr.title_ko,
            summary: tr.summary_ko,
          })
          .eq("id", entry.article.id);

        translatedCount++;
      }

      console.log(
        `[translator] Batch ${Math.floor(i / batchSize) + 1}: ${translations.length} translated`
      );
    } catch (error) {
      console.error("[translator] Translation error:", error);
    }

    if (i + batchSize < englishArticles.length) {
      await new Promise((r) => setTimeout(r, 1500));
    }
  }

  console.log(`[translator] Total translated: ${translatedCount}`);
  return translatedCount;
}
