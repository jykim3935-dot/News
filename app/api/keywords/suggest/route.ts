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
          content: `사용자가 뉴스 수집을 위한 키워드 그룹을 추가하려고 합니다. 다음 자연어 요청을 분석하여 적절한 키워드 그룹을 추천하세요.

요청: "${query}"

다음 JSON 형식으로 2-4개의 키워드 그룹을 추천하세요:
{
  "groups": [
    {
      "group_name": "그룹명 (한국어, 간결하게)",
      "category": "competitive|market|regulation|tech|customer|investment 중 택1",
      "content_types": ["news", "research", "blog", "global", "report", "consulting", "government", "investment"],
      "priority": 1 또는 2 또는 3,
      "keywords": ["키워드1", "키워드2", "..."],
      "enabled": true
    }
  ],
  "explanation": "추천 이유 간단 설명 (한국어)"
}

규칙:
- 각 그룹에 8-15개의 키워드를 포함
- 한국어와 영어 키워드를 균형 있게 포함
- ACRYL Inc.(AI 인프라 기업, GPU 클라우드, AI 에이전트, 헬스케어 AI)의 사업 관점에서 유용한 키워드 우선
- priority: 1(핵심 사업 직결), 2(시장/기술 동향), 3(참고)
- content_types: 해당 키워드가 가장 많이 등장할 콘텐츠 유형 2-4개 선택

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
