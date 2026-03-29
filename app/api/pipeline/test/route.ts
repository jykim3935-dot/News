import { NextRequest, NextResponse } from "next/server";

export const maxDuration = 300;

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();
    if (!email) {
      return NextResponse.json({ error: "email is required" }, { status: 400 });
    }
    const { runPipeline } = await import("@/lib/pipeline");
    const result = await runPipeline(email);
    return NextResponse.json(result);
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ status: "failed", error: msg, errors: [msg] });
  }
}
