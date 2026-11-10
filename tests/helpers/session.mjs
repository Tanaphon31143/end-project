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

/** Connection to the integration database (TEST_DATABASE_URL first, then DATABASE_URL). */
export async function connectTestDatabase() {
  const { default: mysql } = await import("mysql2/promise");
  const parsed = new URL(process.env.TEST_DATABASE_URL || process.env.DATABASE_URL);
  return mysql.createConnection({
    host: parsed.hostname,
    port: Number(parsed.port || 3306),
    user: decodeURIComponent(parsed.username),
    password: decodeURIComponent(parsed.password),
    database: parsed.pathname.slice(1),
    ssl: { rejectUnauthorized: process.env.DATABASE_SSL_REJECT_UNAUTHORIZED === "true" },
  });
}

/** First ACTIVE account of a role; `where` adds conditions on alias `a`. */
export async function firstActiveAccount(connection, role, where = "") {
  const table = role === "admin" ? "admins" : role === "teacher" ? "teachers" : "students";
  const [[account]] = await connection.query(
    `SELECT a.id,a.full_name name,a.email FROM ${table} a WHERE a.status='ACTIVE' ${where ? `AND ${where}` : ""} ORDER BY a.id LIMIT 1`,
  );
  return account ? { ...account, role } : null;
}
