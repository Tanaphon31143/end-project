import { NextResponse } from "next/server";
import { randomBytes } from "node:crypto";
import { buildGoogleAuthUrl } from "@/lib/google-auth";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const state = randomBytes(24).toString("hex");
    const authUrl = buildGoogleAuthUrl(state, request.url);

    const response = NextResponse.redirect(authUrl);

    // Set state cookie to prevent CSRF attacks (valid for 10 minutes)
    response.cookies.set("google_oauth_state", state, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 600,
    });

    return response;
  } catch (error) {
    console.error("Error initiating Google login:", error);
    const url = new URL("/", request.url);
    url.searchParams.set("error", "google_config_error");
    return NextResponse.redirect(url);
  }
}
