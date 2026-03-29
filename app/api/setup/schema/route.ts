import { NextResponse } from "next/server";
import { readFileSync } from "fs";
import { join } from "path";

export async function GET() {
  try {
    const sql = readFileSync(join(process.cwd(), "lib/schema-full.sql"), "utf-8");
    return new NextResponse(sql, {
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  } catch {
    return new NextResponse("-- schema-full.sql not found", { status: 404 });
  }
}
