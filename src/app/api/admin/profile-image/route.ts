import type { RowDataPacket } from "mysql2/promise";
import { getAdminSession } from "@/lib/auth";
import { db } from "@/lib/db";

export const runtime = "nodejs";

export async function GET(request: Request) {
  if (!(await getAdminSession())) return new Response(null, { status: 401 });
  const reference = new URL(request.url).searchParams.get("ref");
  const match = reference ? /^([ST])([1-9]\d{0,9})$/.exec(reference) : null;
  if (!match) return new Response(null, { status: 400 });
  const table = match[1] === "S" ? "students" : "teachers";
  const [images] = await db.execute<(RowDataPacket & { data: Buffer; mime: string })[]>(
    `SELECT profile_image data,profile_image_mime mime FROM ${table} WHERE id=? AND profile_image IS NOT NULL LIMIT 1`,
    [Number(match[2])],
  );
  const image = images[0];
  if (!image || !["image/jpeg", "image/png", "image/webp"].includes(image.mime)) {
    return new Response(null, { status: 404 });
  }
  return new Response(new Uint8Array(image.data), { headers: {
    "Content-Type": image.mime,
    "Cache-Control": "private, no-store",
    "X-Content-Type-Options": "nosniff",
  } });
}
