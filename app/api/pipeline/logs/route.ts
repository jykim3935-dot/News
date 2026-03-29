import { NextResponse } from "next/server";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { localStore } from "@/lib/local-store";
import type { PipelineRun } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export async function GET() {
  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase
        .from("pipeline_runs")
        .select("*")
        .order("started_at", { ascending: false })
        .limit(50);
      if (!error && data) return NextResponse.json(data);
    } catch { /* fall through */ }
  }

  const runs = localStore.select<PipelineRun>("pipeline_runs")
    .sort((a, b) => new Date(b.started_at || b.created_at).getTime() - new Date(a.started_at || a.created_at).getTime())
    .slice(0, 50);

  return NextResponse.json(runs);
}
