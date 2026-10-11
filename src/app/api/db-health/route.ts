import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const started = performance.now();
  const timingHeaders = () => ({
    "Server-Timing": `db;dur=${(performance.now() - started).toFixed(1)}`,
    "Cache-Control": "no-store",
    ...(process.env.VERCEL_REGION ? { "X-App-Region": process.env.VERCEL_REGION } : {}),
  });
  try {
    await db.query("SELECT 1 AS ok");
    return NextResponse.json({ connected: true }, { headers: timingHeaders() });
  } catch (error) {
    console.error("Database health check failed", error);
    return NextResponse.json(
      { connected: false, error: "Database connection failed" },
      { status: 503, headers: timingHeaders() },
    );
  }
}
