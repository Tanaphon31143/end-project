import { createHash, createHmac, randomBytes } from "node:crypto";

/**
 * Sign a session cookie the way src/lib/auth.ts does and register it in auth_sessions,
 * since the server rejects any cookie whose sessionId has no live row there.
 * Call the returned `revoke` in a finally block to remove the row again.
 */
export async function createTestSession(connection, account, { maxAgeMs = 5 * 60_000 } = {}) {
  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new Error("AUTH_SECRET is not configured");
  const sessionId = randomBytes(32).toString("base64url");
  const sessionHash = createHash("sha256").update(sessionId).digest("hex");
  await connection.execute(
    "INSERT INTO auth_sessions (session_hash, account_id, account_role, expires_at) VALUES (?, ?, ?, ?)",
    [sessionHash, account.id, account.role, new Date(Date.now() + maxAgeMs)],
  );
  const payload = Buffer.from(JSON.stringify({
    id: account.id,
    role: account.role,
    name: account.name,
    email: account.email,
    sessionId,
    exp: Date.now() + maxAgeMs,
  })).toString("base64url");
  const signature = createHmac("sha256", secret).update(payload).digest("base64url");
  return {
    cookie: `school_os_session=${payload}.${signature}`,
    revoke: () => connection.execute("DELETE FROM auth_sessions WHERE session_hash=?", [sessionHash]),
  };
}
