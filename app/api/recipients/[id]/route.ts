import { NextRequest, NextResponse } from "next/server";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { localStore } from "@/lib/local-store";
import type { Recipient } from "@/lib/supabase";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();

  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase.from("recipients").update(body).eq("id", id).select().single();
      if (!error && data) return NextResponse.json(data);
    } catch { /* fall through */ }
  }

  const updated = localStore.update<Recipient>("recipients", id, body);
  if (!updated) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(updated);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  if (isSupabaseConfigured()) {
    try {
      const { error } = await supabase.from("recipients").delete().eq("id", id);
      if (!error) return NextResponse.json({ success: true });
    } catch { /* fall through */ }
  }

  localStore.delete("recipients", id);
  return NextResponse.json({ success: true });
}
