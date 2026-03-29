import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic();

function extractJSON(text: string): string {
  const match = text.match(/\{[\s\S]*\}/);
  return match ? match[0] : "{}";
}

export async function POST(req: NextRequest) {
  try {
    const { query } = await req.json();
    if (!query || typeof query !== "string") {
      return NextResponse.json({ error: "query is required" }, { status: 400 });
    }

    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 2048,
      messages: [
        {
          role: "user",
          content: `사용자가 뉴스 수집 소스를 추가하려고 합니다. 다음 자연어 요청을 분석하여 적절한 RSS 피드나 웹 소스를 추천하세요.

요청: "${query}"

다음 JSON 형식으로 3-5개의 소스를 추천하세요:
{
  "sources": [
    {
      "name": "소스명",
      "url": "RSS 피드 URL 또는 웹사이트 URL",
      "type": "rss 또는 websearch",
      "content_type": "news|report|consulting|global|investment|blog|government|research 중 택1",
      "category": "competitive|market|regulation|tech|customer|investment 중 택1",
      "description": "이 소스가 무엇을 다루는지 1문장 설명"
    }
  ],
  "explanation": "추천 이유 간단 설명 (한국어)"
}

규칙:
- RSS 피드가 있는 경우 실제 존재할 가능성이 높은 RSS URL을 제공 (일반적인 RSS 경로 패턴 활용)
- RSS가 없는 사이트는 type을 "websearch"로 설정
- 한국어 사이트와 영어 사이트를 균형 있게 추천
- ACRYL Inc.(AI 인프라 기업, GPU 클라우드, AI 에이전트, 헬스케어 AI)의 사업 관점에서 유용한 소스 우선

JSON만 반환하세요.`,
        },
      ],
    });

    const textBlock = response.content.find((b) => b.type === "text");
    if (!textBlock || textBlock.type !== "text") {
      return NextResponse.json({ error: "AI 응답 파싱 실패" }, { status: 500 });
    }

    const parsed = JSON.parse(extractJSON(textBlock.text));
    return NextResponse.json(parsed);
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
