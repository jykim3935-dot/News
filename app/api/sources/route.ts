import { NextRequest, NextResponse } from "next/server";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { localStore } from "@/lib/local-store";
import type { Source } from "@/lib/supabase";

export async function GET(req: NextRequest) {
  const contentType = req.nextUrl.searchParams.get("content_type");

  if (isSupabaseConfigured()) {
    try {
      let query = supabase.from("sources").select("*").order("created_at", { ascending: false });
      if (contentType) query = query.eq("content_type", contentType);
      const { data, error } = await query;
      if (!error && data) return NextResponse.json(data);
    } catch { /* fall through to local store */ }
  }

  const sources = localStore.select<Source>("sources");
  const filtered = contentType ? sources.filter((s) => s.content_type === contentType) : sources;
  return NextResponse.json(filtered.sort((a, b) => b.created_at.localeCompare(a.created_at)));
}

export async function POST(req: NextRequest) {
  const body = await req.json();

  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase.from("sources").insert(body).select().single();
      if (error) {
        console.error("[sources POST] Supabase error:", error.message);
        // If constraint error, return details to help debug
        return NextResponse.json({ error: error.message }, { status: 400 });
      }
      if (data) return NextResponse.json(data, { status: 201 });
    } catch (err) {
      console.error("[sources POST] exception:", err);
    }
  }

  const item = localStore.insert<Source>("sources", body);
  return NextResponse.json(item, { status: 201 });
}
