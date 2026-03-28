import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export async function GET() {
  // Get latest completed pipeline run
  const { data: run } = await supabase
    .from("pipeline_runs")
    .select("*")
    .eq("status", "completed")
    .order("completed_at", { ascending: false })
    .limit(1)
    .single();

  if (!run) {
    return NextResponse.json({ articles: [], run: null });
  }

  const { data: articles } = await supabase
    .from("articles")
    .select("*")
    .eq("batch_id", run.batch_id)
    .order("relevance_score", { ascending: false });

  return NextResponse.json({ articles: articles || [], run });
}
