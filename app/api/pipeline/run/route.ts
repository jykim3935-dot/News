import { NextResponse } from "next/server";
import { runPipeline } from "@/lib/pipeline";

export const maxDuration = 300;

export async function POST() {
  try {
    const result = await runPipeline();
    return NextResponse.json(result);
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
