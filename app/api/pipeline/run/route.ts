import { NextResponse } from "next/server";
import { ensureMigration } from "@/lib/migrate";

export const maxDuration = 300;

export async function POST() {
  try {
    await ensureMigration();
    const { runPipeline } = await import("@/lib/pipeline");
    const result = await runPipeline();
    return NextResponse.json(result);
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({
      status: "failed",
      error: msg,
      errors: [msg],
    });
  }
}
