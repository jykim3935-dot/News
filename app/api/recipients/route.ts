import { NextRequest, NextResponse } from "next/server";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { localStore } from "@/lib/local-store";
import type { Recipient } from "@/lib/supabase";

export async function GET() {
  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase.from("recipients").select("*").order("created_at", { ascending: false });
      if (!error && data) return NextResponse.json(data);
    } catch { /* fall through */ }
  }

  const recipients = localStore.select<Recipient>("recipients");
  return NextResponse.json(recipients.sort((a, b) => b.created_at.localeCompare(a.created_at)));
}

export async function POST(req: NextRequest) {
  const body = await req.json();

  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase.from("recipients").insert(body).select().single();
      if (!error && data) return NextResponse.json(data, { status: 201 });
    } catch { /* fall through */ }
  }

  const item = localStore.insert<Recipient>("recipients", { ...body, enabled: true });
  return NextResponse.json(item, { status: 201 });
}
