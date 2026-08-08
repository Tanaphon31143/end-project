import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await db.query("SELECT 1 AS ok");
    return NextResponse.json({ connected: true });
  } catch (error) {
    console.error("Database health check failed", error);
    return NextResponse.json(
      { connected: false, error: "Database connection failed" },
      { status: 503 },
    );
  }
}
