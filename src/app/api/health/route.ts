import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  try {
    const [rows] = await db.query("SELECT 1 AS connected");
    return NextResponse.json({ ok: true, database: "connected", rows });
  } catch (error) {
    console.error("Database health check failed", error);
    return NextResponse.json(
      { ok: false, database: "disconnected" },
      { status: 503 },
    );
  }
}
