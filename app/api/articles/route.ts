import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function GET(req: NextRequest) {
  const batchId = req.nextUrl.searchParams.get("batch_id");
  const contentType = req.nextUrl.searchParams.get("content_type");

  let query = supabase
    .from("articles")
    .select("*")
    .order("relevance_score", { ascending: false });

  if (batchId) query = query.eq("batch_id", batchId);
  if (contentType) query = query.eq("content_type", contentType);

  const { data, error } = await query.limit(100);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
