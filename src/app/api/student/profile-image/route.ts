import type { RowDataPacket } from "mysql2/promise";
import { getStudentSession } from "@/lib/auth";
import { db } from "@/lib/db";
export const runtime = "nodejs";
export async function GET() {
  const session = await getStudentSession();
  if (!session) return new Response(null, { status: 401 });
  const [rows] = await db.execute<
    (RowDataPacket & { data: Buffer; mime: string })[]
  >(
    `SELECT profile_image data,profile_image_mime mime FROM students WHERE id=? AND profile_image IS NOT NULL LIMIT 1`,
    [session.id],
  );
  const image = rows[0];
  if (!image) return new Response(null, { status: 404 });
  return new Response(new Uint8Array(image.data), {
    headers: {
      "Content-Type": image.mime,
      "Cache-Control": "private, max-age=300",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
