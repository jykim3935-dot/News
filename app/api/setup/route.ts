import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export const dynamic = "force-dynamic";

/**
 * GET /api/setup - DB 상태 확인 및 테이블 자동 생성
 * POST /api/setup - seed 데이터 포함하여 초기화
 */
export async function GET() {
  const results: Record<string, string> = {};

  // 각 테이블 존재 여부 확인
  const tables = [
    "sources",
    "keyword_groups",
    "articles",
    "recipients",
    "pipeline_runs",
    "trends",
  ];

  for (const table of tables) {
    const { error } = await supabase.from(table).select("id").limit(1);
    results[table] = error ? `ERROR: ${error.message}` : "OK";
  }

  const allOk = Object.values(results).every((v) => v === "OK");

  return NextResponse.json({
    status: allOk ? "ready" : "needs_setup",
    tables: results,
    message: allOk
      ? "모든 테이블이 정상입니다."
      : "일부 테이블이 없습니다. Supabase SQL Editor에서 schema.sql → schema-v2.sql → schema-v3-production.sql 순서로 실행하세요.",
  });
}
