import { NextRequest, NextResponse } from "next/server";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { localStore } from "@/lib/local-store";
import type { KeywordGroup } from "@/lib/supabase";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();

  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase.from("keyword_groups").update(body).eq("id", id).select().single();
      if (!error && data) return NextResponse.json(data);
    } catch { /* fall through */ }
  }

  const updated = localStore.update<KeywordGroup>("keyword_groups", id, body);
  if (!updated) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(updated);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  if (isSupabaseConfigured()) {
    try {
      const { error } = await supabase.from("keyword_groups").delete().eq("id", id);
      if (!error) return NextResponse.json({ success: true });
    } catch { /* fall through */ }
  }

  localStore.delete("keyword_groups", id);
  return NextResponse.json({ success: true });
}
