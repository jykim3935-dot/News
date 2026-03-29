import { NextResponse } from "next/server";
import { isSupabaseConfigured } from "@/lib/supabase";

export const dynamic = "force-dynamic";

const FIX_SQL = [
  "ALTER TABLE articles DROP CONSTRAINT IF EXISTS articles_content_type_check",
  "ALTER TABLE sources DROP CONSTRAINT IF EXISTS sources_content_type_check",
  "ALTER TABLE articles DROP CONSTRAINT IF EXISTS articles_urgency_check",
  "ALTER TABLE articles DROP CONSTRAINT IF EXISTS articles_relevance_score_check",
];

export async function POST() {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "Supabase not configured" }, { status: 400 });
  }

  const url = process.env.SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY!;
  const results: string[] = [];

  for (const sql of FIX_SQL) {
    try {
      const res = await fetch(`${url}/pg-meta/default/query`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${key}`,
          "apikey": key,
        },
        body: JSON.stringify({ query: sql }),
      });
      results.push(res.ok ? `✅ ${sql.slice(0, 60)}` : `⚠️ ${res.status}`);
    } catch {
      results.push(`❌ ${sql.slice(0, 60)}`);
    }
  }

  return NextResponse.json({ results });
}
