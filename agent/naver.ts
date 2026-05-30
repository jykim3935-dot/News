/**
 * 네이버 뉴스 검색 API 수집기
 * https://developers.naver.com/docs/serviceapi/search/news/news.md
 */
import {
  KEYWORDS,
  ARTICLES_PER_KEYWORD,
  MAX_AGE_DAYS,
  DOMAIN_TO_MEDIA,
} from "./config";
import type { RawArticle } from "./types";

const NAVER_ENDPOINT = "https://openapi.naver.com/v1/search/news.json";

interface NaverItem {
  title: string;
  originallink: string;
  link: string;
  description: string;
  pubDate: string; // RFC-1123, 예: "Mon, 26 May 2025 09:00:00 +0900"
}

function stripHtml(s: string): string {
  return s
    .replace(/<[^>]+>/g, "")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ")
    .trim();
}

function domainOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

function mediaFromUrl(url: string): string {
  const domain = domainOf(url);
  for (const [d, media] of Object.entries(DOMAIN_TO_MEDIA)) {
    if (domain.endsWith(d)) return media;
  }
  // 네이버 뉴스 자체 링크면 "네이버", 그 외 "기타"
  return domain.includes("naver.com") ? "네이버" : "기타";
}

async function searchKeyword(
  clientId: string,
  clientSecret: string,
  query: string,
  company: string | undefined
): Promise<RawArticle[]> {
  const params = new URLSearchParams({
    query,
    display: String(ARTICLES_PER_KEYWORD),
    sort: "date", // 최신순
  });

  const res = await fetch(`${NAVER_ENDPOINT}?${params}`, {
    headers: {
      "X-Naver-Client-Id": clientId,
      "X-Naver-Client-Secret": clientSecret,
    },
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`네이버 API 오류 (${query}): ${res.status} ${body}`);
  }

  const data = (await res.json()) as { items?: NaverItem[] };
  const items = data.items || [];

  const cutoff = Date.now() - MAX_AGE_DAYS * 24 * 60 * 60 * 1000;

  return items
    .map((item): RawArticle | null => {
      const url = item.originallink || item.link;
      const published = new Date(item.pubDate);
      if (isNaN(published.getTime()) || published.getTime() < cutoff) {
        return null; // 너무 오래된 기사 제외
      }
      return {
        title: stripHtml(item.title),
        url,
        description: stripHtml(item.description),
        publishedAt: published.toISOString().slice(0, 10),
        media: mediaFromUrl(url),
        query,
        company,
      };
    })
    .filter((a): a is RawArticle => a !== null);
}

/** 모든 키워드를 수집하고 URL 기준으로 중복 제거 */
export async function collectNaver(): Promise<RawArticle[]> {
  const clientId = process.env.NAVER_CLIENT_ID;
  const clientSecret = process.env.NAVER_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error(
      "NAVER_CLIENT_ID / NAVER_CLIENT_SECRET 환경변수가 필요합니다."
    );
  }

  console.log(`[naver] ${KEYWORDS.length}개 키워드 수집 시작...`);

  const results = await Promise.allSettled(
    KEYWORDS.map((k) => searchKeyword(clientId, clientSecret, k.query, k.company))
  );

  const all: RawArticle[] = [];
  results.forEach((r, i) => {
    if (r.status === "fulfilled") {
      console.log(`[naver]   "${KEYWORDS[i].query}": ${r.value.length}건`);
      all.push(...r.value);
    } else {
      console.warn(`[naver]   "${KEYWORDS[i].query}" 실패: ${r.reason}`);
    }
  });

  // URL 기준 중복 제거
  const seen = new Set<string>();
  const deduped = all.filter((a) => {
    if (seen.has(a.url)) return false;
    seen.add(a.url);
    return true;
  });

  console.log(
    `[naver] 총 ${all.length}건 수집, 중복 제거 후 ${deduped.length}건`
  );
  return deduped;
}
