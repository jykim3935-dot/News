/**
 * Claude 기반 기사 분석기
 * 수집한 기사를 관련성 판단 + 요약 + 시사점 + 중요도 + 분류로 가공합니다.
 */
import Anthropic from "@anthropic-ai/sdk";
import {
  CLAUDE_MODEL,
  CATEGORY_OPTIONS,
  COMPANY_OPTIONS,
  IMPORTANCE_OPTIONS,
} from "./config";
import type { RawArticle, AnalyzedArticle } from "./types";

const anthropic = new Anthropic();

// 한 번의 호출에 넣을 기사 수 (토큰 관리)
const BATCH_SIZE = 15;

const SYSTEM_PROMPT = `당신은 AI 인프라 기업 '아크릴(ACRYL)'의 시장 인텔리전스 분석가입니다.
반도체, 생성형 AI, AI 스타트업/투자 동향, 그리고 주요 AI 기업(노타, 래블업, 마키나락스, 베슬AI, 업스테이지, 사이오닉AI 등)의 뉴스를 클리핑합니다.

각 기사에 대해 다음을 판단하세요:
- relevant: 위 주제와 실질적으로 관련 있고 클리핑할 가치가 있으면 true. 광고, 단순 시세, 무관한 동음이의어("노타"가 음악/필기 앱 등 다른 의미)면 false.
- summary(핵심요약): 기사의 핵심을 2~3문장으로 객관적으로 요약 (한국어).
- insight(시사점): 아크릴/AI 인프라 산업 관점에서의 함의 1~2문장 (한국어).
- importance(중요도): "★★★"(매우 중요/시장 판도 변화), "★★☆"(주목할 만함), "★☆☆"(참고).
- categories(카테고리): 다음 중 해당하는 것 모두 (배열). [${CATEGORY_OPTIONS.join(", ")}]
  · 자사 = 아크릴 직접 언급, 경쟁사 = 동종 AI 인프라/모델 경쟁사, 효율화기술 = 모델/추론 최적화·반도체 기술, 정책규제 = 정부정책/규제, 논문/오픈소스 = 연구·오픈소스 공개, 기타산업 = 그 외.
- companies(언급기업): 기사에 실제 언급된 기업 중 다음 목록에 있는 것만 (배열, 없으면 빈 배열). [${COMPANY_OPTIONS.join(", ")}]

반드시 입력 기사 순서대로, 동일한 개수의 JSON 배열만 출력하세요. 설명·마크다운 없이 JSON만.`;

interface AnalysisResult {
  relevant: boolean;
  summary: string;
  insight: string;
  importance: string;
  categories: string[];
  companies: string[];
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

function sanitize(r: Partial<AnalysisResult>): AnalysisResult {
  const importance = (IMPORTANCE_OPTIONS as readonly string[]).includes(
    r.importance || ""
  )
    ? (r.importance as string)
    : "★☆☆";
  return {
    relevant: r.relevant !== false,
    summary: r.summary || "",
    insight: r.insight || "",
    importance,
    categories: (r.categories || []).filter((c) =>
      (CATEGORY_OPTIONS as readonly string[]).includes(c)
    ),
    companies: (r.companies || []).filter((c) =>
      (COMPANY_OPTIONS as readonly string[]).includes(c)
    ),
  };
}

async function analyzeBatch(
  articles: RawArticle[]
): Promise<AnalyzedArticle[]> {
  const input = articles.map((a, i) => ({
    index: i,
    검색어: a.query,
    제목: a.title,
    내용: a.description,
    발행일: a.publishedAt,
  }));

  const response = await anthropic.messages.create({
    model: CLAUDE_MODEL,
    max_tokens: 4096,
    system: SYSTEM_PROMPT,
    messages: [
      {
        role: "user",
        content: `다음 ${articles.length}개 기사를 분석하세요:\n\n${JSON.stringify(
          input,
          null,
          2
        )}`,
      },
    ],
  });

  const textBlock = response.content.find((b) => b.type === "text");
  const raw = textBlock && textBlock.type === "text" ? textBlock.text : "[]";
  const parsed = extractJsonArray(raw) as Partial<AnalysisResult>[];

  return articles.map((article, i) => {
    const result = sanitize(parsed[i] || {});
    // 검색어에 기업이 매핑돼 있으면 언급기업에 보강
    const companies = new Set(result.companies);
    if (article.company) companies.add(article.company);
    return {
      ...article,
      relevant: result.relevant,
      summary: result.summary,
      insight: result.insight,
      importance: result.importance as AnalyzedArticle["importance"],
      categories: result.categories,
      companies: [...companies],
    };
  });
}

/** 기사 목록을 분석하고 relevant=true 인 것만 반환 */
export async function analyzeArticles(
  articles: RawArticle[]
): Promise<AnalyzedArticle[]> {
  if (articles.length === 0) return [];
  console.log(`[analyze] ${articles.length}건 분석 시작...`);

  const analyzed: AnalyzedArticle[] = [];
  for (let i = 0; i < articles.length; i += BATCH_SIZE) {
    const batch = articles.slice(i, i + BATCH_SIZE);
    try {
      analyzed.push(...(await analyzeBatch(batch)));
    } catch (e) {
      console.warn(`[analyze] 배치 ${i / BATCH_SIZE} 실패: ${e}`);
    }
  }

  const relevant = analyzed.filter((a) => a.relevant && a.summary);
  console.log(
    `[analyze] 분석 완료: ${analyzed.length}건 중 ${relevant.length}건 채택`
  );
  // 중요도 높은 순 정렬
  const order: Record<string, number> = { "★★★": 0, "★★☆": 1, "★☆☆": 2 };
  return relevant.sort((a, b) => order[a.importance] - order[b.importance]);
}
