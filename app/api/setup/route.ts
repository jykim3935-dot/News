import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { DEFAULT_SOURCES, DEFAULT_KEYWORD_GROUPS } from "@/lib/default-presets";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

const TABLES_SQL = [
  `CREATE TABLE IF NOT EXISTS sources (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL, url text NOT NULL, type text NOT NULL,
    content_type text NOT NULL, category text NOT NULL,
    enabled boolean NOT NULL DEFAULT true, description text,
    created_at timestamptz DEFAULT now()
  )`,
  `CREATE TABLE IF NOT EXISTS keyword_groups (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    group_name text NOT NULL, category text NOT NULL,
    content_types text[] DEFAULT '{}', priority integer NOT NULL,
    keywords text[] NOT NULL, enabled boolean NOT NULL DEFAULT true,
    created_at timestamptz DEFAULT now()
  )`,
  `CREATE TABLE IF NOT EXISTS pipeline_runs (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    batch_id uuid UNIQUE NOT NULL DEFAULT gen_random_uuid(),
    status text NOT NULL DEFAULT 'running',
    started_at timestamptz DEFAULT now(), completed_at timestamptz,
    articles_count integer DEFAULT 0, error text,
    executive_brief text, trend_summary text,
    created_at timestamptz DEFAULT now()
  )`,
  `CREATE TABLE IF NOT EXISTS articles (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    title text NOT NULL, url text NOT NULL, source text,
    content_type text NOT NULL, published_at text, summary text,
    matched_keywords text[] DEFAULT '{}', category text,
    relevance_score integer, urgency text, impact_comment text,
    deep_summary text, source_description text,
    key_findings text[] DEFAULT '{}', action_items text[] DEFAULT '{}',
    title_ko text, summary_ko text, dedup_group text,
    batch_id uuid REFERENCES pipeline_runs(batch_id),
    created_at timestamptz DEFAULT now()
  )`,
  `CREATE TABLE IF NOT EXISTS trends (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    batch_id uuid, trend_title text NOT NULL,
    trend_description text NOT NULL,
    related_article_ids uuid[] DEFAULT '{}',
    category text, strength text,
    created_at timestamptz DEFAULT now()
  )`,
  `CREATE TABLE IF NOT EXISTS recipients (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL, email text NOT NULL UNIQUE,
    role text, enabled boolean NOT NULL DEFAULT true,
    created_at timestamptz DEFAULT now()
  )`,
  `CREATE INDEX IF NOT EXISTS idx_articles_batch_id ON articles(batch_id)`,
  `CREATE INDEX IF NOT EXISTS idx_articles_created_at ON articles(created_at DESC)`,
  `CREATE INDEX IF NOT EXISTS idx_sources_enabled ON sources(enabled)`,
  `CREATE INDEX IF NOT EXISTS idx_trends_batch_id ON trends(batch_id)`,
];

/** Fix old CHECK constraints that block government/research content types */
const FIX_CONSTRAINTS_SQL = [
  `ALTER TABLE articles DROP CONSTRAINT IF EXISTS articles_content_type_check`,
  `ALTER TABLE sources DROP CONSTRAINT IF EXISTS sources_content_type_check`,
  `ALTER TABLE articles DROP CONSTRAINT IF EXISTS articles_urgency_check`,
  `ALTER TABLE articles DROP CONSTRAINT IF EXISTS articles_relevance_score_check`,
];

/** Execute SQL via Supabase's internal pg-meta API (same as SQL Editor) */
async function execSQL(url: string, serviceKey: string, sql: string): Promise<{ ok: boolean; error?: string }> {
  // Try multiple known Supabase SQL endpoints
  const endpoints = [
    `${url}/pg-meta/default/query`,
    `${url}/rest/v1/rpc/exec_sql`,
  ];

  for (const endpoint of endpoints) {
    try {
      const body = endpoint.includes("pg-meta")
        ? JSON.stringify({ query: sql })
        : JSON.stringify({ sql });

      const res = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${serviceKey}`,
          "apikey": serviceKey,
        },
        body,
      });

      if (res.ok) return { ok: true };

      const text = await res.text();
      // 404 means this endpoint doesn't exist, try next
      if (res.status === 404) continue;
      // Other errors
      return { ok: false, error: `${res.status}: ${text.slice(0, 200)}` };
    } catch {
      continue;
    }
  }

  return { ok: false, error: "SQL 실행 엔드포인트를 찾을 수 없습니다" };
}

export async function POST(req: NextRequest) {
  try {
    const { url, serviceKey } = await req.json();
    if (!url || !serviceKey) {
      return NextResponse.json({ error: "url과 serviceKey가 필요합니다" }, { status: 400 });
    }

    const steps: string[] = [];
    const sb = createClient(url, serviceKey);

    // 0. Fix old CHECK constraints that block government/research types
    for (const sql of FIX_CONSTRAINTS_SQL) {
      await execSQL(url, serviceKey, sql);
    }
    steps.push("✅ 제약조건 정리 완료");

    // 1. Test connection — try querying sources table
    const { error: testErr } = await sb.from("sources").select("id").limit(1);

    if (testErr) {
      // Table doesn't exist → create tables
      steps.push("📡 Supabase 연결 성공, 테이블 생성 시작...");

      let allCreated = true;
      for (const sql of TABLES_SQL) {
        const result = await execSQL(url, serviceKey, sql);
        if (!result.ok) {
          allCreated = false;
          steps.push(`⚠️ SQL 실행 실패: ${result.error}`);
          break;
        }
      }

      if (allCreated) {
        steps.push("✅ 테이블 6개 + 인덱스 4개 생성 완료!");
      } else {
        // Fallback: check if tables were actually created despite errors
        const { error: recheck } = await sb.from("sources").select("id").limit(1);
        if (!recheck) {
          steps.push("✅ 테이블이 이미 존재합니다");
        } else {
          steps.push("❌ 자동 테이블 생성 실패 — 아래 SQL을 Supabase SQL Editor에 붙여넣어주세요");
          return NextResponse.json({ success: false, steps, needsManualSQL: true });
        }
      }
    } else {
      steps.push("✅ 테이블 존재 확인");
    }

    // 2. Seed default sources
    const { data: existingSrc } = await sb.from("sources").select("id").limit(1);
    if (!existingSrc || existingSrc.length === 0) {
      const { error: seedErr } = await sb.from("sources").insert(
        DEFAULT_SOURCES.map((s) => ({
          name: s.name, url: s.url, type: s.type,
          content_type: s.content_type, category: s.category,
          enabled: s.enabled, description: s.description,
        }))
      );
      steps.push(seedErr
        ? `⚠️ 소스 시딩 실패: ${seedErr.message}`
        : `✅ 기본 소스 ${DEFAULT_SOURCES.length}개 추가`
      );
    } else {
      steps.push("✅ 소스 데이터 존재");
    }

    // 3. Seed default keyword groups
    const { data: existingKw } = await sb.from("keyword_groups").select("id").limit(1);
    if (!existingKw || existingKw.length === 0) {
      const { error: seedErr } = await sb.from("keyword_groups").insert(
        DEFAULT_KEYWORD_GROUPS.map((k) => ({
          group_name: k.group_name, category: k.category,
          content_types: k.content_types, priority: k.priority,
          keywords: k.keywords, enabled: k.enabled,
        }))
      );
      steps.push(seedErr
        ? `⚠️ 키워드 시딩 실패: ${seedErr.message}`
        : `✅ 기본 키워드 ${DEFAULT_KEYWORD_GROUPS.length}개 추가`
      );
    } else {
      steps.push("✅ 키워드 데이터 존재");
    }

    return NextResponse.json({ success: true, steps });
  } catch (err) {
    return NextResponse.json({ error: "설정 실패", detail: String(err) }, { status: 500 });
  }
}

export async function GET() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

  if (!url || !key) {
    return NextResponse.json({
      configured: false,
      message: "SUPABASE_URL과 SUPABASE_SERVICE_ROLE_KEY 환경변수가 필요합니다",
    });
  }

  try {
    const sb = createClient(url, key);
    const { error } = await sb.from("sources").select("id").limit(1);
    if (error) {
      return NextResponse.json({ configured: true, tablesExist: false, message: error.message });
    }
    const { count } = await sb.from("articles").select("id", { count: "exact", head: true });
    return NextResponse.json({ configured: true, tablesExist: true, articlesCount: count || 0, message: "정상" });
  } catch (err) {
    return NextResponse.json({ configured: true, tablesExist: false, message: String(err) });
  }
}
