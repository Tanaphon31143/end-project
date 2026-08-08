import { NextResponse } from "next/server";

export async function POST() {
  const response = NextResponse.json({ ok: true });
  response.cookies.set("school_user", "", { httpOnly: true, expires: new Date(0), path: "/" });
  response.cookies.set("school_os_session", "", { httpOnly: true, expires: new Date(0), path: "/" });
  return response;
}
