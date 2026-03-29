import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic();

export async function POST(req: NextRequest) {
  const { query, type } = await req.json();

  if (!query || !type) {
    return NextResponse.json(
      { error: "query and type are required" },
      { status: 400 }
    );
  }

  try {
    if (type === "sources") {
      const response = await anthropic.messages.create({
        model: "claude-sonnet-4-20250514",
        max_tokens: 2048,
        messages: [
          {
            role: "user",
            content: `사용자가 "${query}" 관련 뉴스/정보 소스를 찾고 있습니다.
관련된 RSS 피드, 웹사이트, API 소스를 추천해주세요.

다음 JSON 형식으로 정확히 반환하세요:
{
  "suggestions": [
    {
      "name": "소스 이름",
      "url": "RSS 피드 또는 웹사이트 URL",
      "type": "rss|api|websearch|crawl",
      "content_type": "news|report|consulting|global|investment|blog|government|research",
      "category": "competitive|market|regulation|tech|customer|investment",
      "description": "이 소스에 대한 간단한 설명",
      "enabled": true
    }
  ]
}

규칙:
- 실제 존재하는 유효한 URL만 추천 (존재하지 않는 URL 생성 금지)
- RSS 피드가 있는 경우 RSS URL 우선
- 한국어/영어 소스 모두 포함
- 5-8개 추천
- JSON만 반환

JSON만 반환하세요.`,
          },
        ],
      });

      const textBlock = response.content.find((b) => b.type === "text");
      if (!textBlock || textBlock.type !== "text") {
        return NextResponse.json({ suggestions: [] });
      }

      const match = textBlock.text.match(/\{[\s\S]*\}/);
      const parsed = match ? JSON.parse(match[0]) : { suggestions: [] };
      return NextResponse.json(parsed);
    }

    if (type === "keywords") {
      const response = await anthropic.messages.create({
        model: "claude-sonnet-4-20250514",
        max_tokens: 2048,
        messages: [
          {
            role: "user",
            content: `사용자가 "${query}" 관련 뉴스/정보를 모니터링하려 합니다.
관련된 키워드 그룹을 추천해주세요.

다음 JSON 형식으로 정확히 반환하세요:
{
  "suggestions": [
    {
      "group_name": "키워드 그룹명",
      "category": "competitive|market|regulation|tech|customer|investment",
      "content_types": ["news", "report"],
      "priority": 1,
      "keywords": ["키워드1", "키워드2", "키워드3", "..."],
      "enabled": true
    }
  ]
}

규칙:
- 각 그룹에 5-10개의 관련 키워드 포함
- 한국어 + 영어 키워드 혼합
- 동의어, 약어, 관련 용어 포함
- 3-5개의 키워드 그룹 추천
- priority: 1(핵심), 2(보통), 3(참고)
- JSON만 반환

JSON만 반환하세요.`,
          },
        ],
      });

      const textBlock = response.content.find((b) => b.type === "text");
      if (!textBlock || textBlock.type !== "text") {
        return NextResponse.json({ suggestions: [] });
      }

      const match = textBlock.text.match(/\{[\s\S]*\}/);
      const parsed = match ? JSON.parse(match[0]) : { suggestions: [] };
      return NextResponse.json(parsed);
    }

    return NextResponse.json({ error: "Invalid type" }, { status: 400 });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
