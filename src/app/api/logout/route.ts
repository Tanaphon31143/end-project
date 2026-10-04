import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { revokeSession } from "@/lib/auth";

export async function POST() {
  const cookieStore = await cookies();
  await revokeSession(cookieStore.get("school_os_session")?.value);
  const response = NextResponse.json({ ok: true });
  response.cookies.set("school_user", "", {
    httpOnly: true,
    expires: new Date(0),
    path: "/",
  });
  response.cookies.set("school_os_session", "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    expires: new Date(0),
    path: "/",
  });
  return response;
}
