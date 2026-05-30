/**
 * Notion "일일 뉴스클리핑" DB 기록기
 */
import { Client } from "@notionhq/client";
import { NOTION_DATABASE_ID } from "./config";
import type { AnalyzedArticle } from "./types";

function client(): Client {
  const auth = process.env.NOTION_API_KEY;
  if (!auth) throw new Error("NOTION_API_KEY 환경변수가 필요합니다.");
  return new Client({ auth });
}

/** 이미 같은 원문 URL이 DB에 있는지 확인 (중복 방지) */
async function urlExists(notion: Client, url: string): Promise<boolean> {
  const res = await notion.databases.query({
    database_id: NOTION_DATABASE_ID,
    filter: { property: "원문", url: { equals: url } },
    page_size: 1,
  });
  return res.results.length > 0;
}

function buildProperties(a: AnalyzedArticle) {
  return {
    제목: { title: [{ text: { content: a.title.slice(0, 2000) } }] },
    원문: { url: a.url },
    매체: { select: { name: a.media } },
    중요도: { select: { name: a.importance } },
    핵심요약: {
      rich_text: [{ text: { content: a.summary.slice(0, 2000) } }],
    },
    시사점: {
      rich_text: [{ text: { content: a.insight.slice(0, 2000) } }],
    },
    일자: { date: { start: a.publishedAt } },
    카테고리: { multi_select: a.categories.map((name) => ({ name })) },
    언급기업: { multi_select: a.companies.map((name) => ({ name })) },
  };
}

/** 분석된 기사들을 Notion에 저장. 반환: 저장 건수 / 중복 스킵 건수 */
export async function saveToNotion(
  articles: AnalyzedArticle[]
): Promise<{ saved: number; skipped: number }> {
  const notion = client();
  let saved = 0;
  let skipped = 0;

  for (const article of articles) {
    try {
      if (await urlExists(notion, article.url)) {
        skipped++;
        continue;
      }
      await notion.pages.create({
        parent: { database_id: NOTION_DATABASE_ID },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        properties: buildProperties(article) as any,
      });
      saved++;
      console.log(`[notion] 저장: ${article.title}`);
    } catch (e) {
      console.warn(`[notion] 저장 실패 (${article.title}): ${e}`);
    }
  }

  console.log(`[notion] 완료: ${saved}건 저장, ${skipped}건 중복 스킵`);
  return { saved, skipped };
}
