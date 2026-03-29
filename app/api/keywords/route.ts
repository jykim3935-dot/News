import { NextRequest, NextResponse } from "next/server";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { localStore } from "@/lib/local-store";
import type { KeywordGroup } from "@/lib/supabase";

export async function GET() {
  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase.from("keyword_groups").select("*").order("priority", { ascending: true });
      if (!error && data) return NextResponse.json(data);
    } catch { /* fall through */ }
  }

  const groups = localStore.select<KeywordGroup>("keyword_groups");
  return NextResponse.json(groups.sort((a, b) => a.priority - b.priority));
}

export async function POST(req: NextRequest) {
  const body = await req.json();

  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase.from("keyword_groups").insert(body).select().single();
      if (!error && data) return NextResponse.json(data, { status: 201 });
    } catch { /* fall through */ }
  }

  const item = localStore.insert<KeywordGroup>("keyword_groups", body);
  return NextResponse.json(item, { status: 201 });
}
