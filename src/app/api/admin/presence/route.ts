import { getAdminSession } from "@/lib/auth";
import { getLoggedInAccountIdentities } from "@/lib/admin-presence";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const privateHeaders = {
  "Cache-Control": "private, no-store",
  Pragma: "no-cache",
  Vary: "Cookie",
};

export async function GET() {
  try {
    if (!(await getAdminSession())) {
      return Response.json(
        { error: "Unauthorized" },
        { status: 401, headers: privateHeaders },
      );
    }

    const accounts = await getLoggedInAccountIdentities();
    return Response.json({ accounts }, { headers: privateHeaders });
  } catch {
    return Response.json(
      { error: "Unable to read login status" },
      { status: 500, headers: privateHeaders },
    );
  }
}
