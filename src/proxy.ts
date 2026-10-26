import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { crossSiteRejection, isCrossSiteRequest } from "@/lib/api-security";

const MUTATING_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

// Every state-changing API call must come from this site. Route handlers still
// authenticate and authorize on their own; this only blocks cross-site requests.
export function proxy(request: NextRequest) {
  if (MUTATING_METHODS.has(request.method) && isCrossSiteRequest(request)) return crossSiteRejection();
  return NextResponse.next();
}

export const config = {
  matcher: "/api/:path*",
};
