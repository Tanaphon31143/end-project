import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

async function source(path) {
  return readFile(new URL(path, import.meta.url), "utf8");
}

test("login validates JSON, origin, size and uses shared throttling", async () => {
  const [route, security] = await Promise.all([
    source("../src/app/api/login/route.ts"),
    source("../src/lib/login-security.ts"),
  ]);
  assert.match(route, /Buffer\.byteLength\(rawBody/);
  assert.match(route, /consumeLoginAttempt/);
  assert.match(route, /await verifyPassword/);
  assert.match(security, /contentType !== "application\/json"/);
  assert.match(security, /fetchSite === "cross-site"/);
  assert.match(security, /auth_login_limits/);
  assert.match(security, /Retry-After/);
});

test("sessions are server-backed, revocable and recheck active accounts", async () => {
  const [auth, logout, migration] = await Promise.all([
    source("../src/lib/auth.ts"),
    source("../src/app/api/logout/route.ts"),
    source("../database/migrations/20261004_auth_security_up.sql"),
  ]);
  assert.match(auth, /INSERT INTO auth_sessions/);
  assert.match(auth, /revoked_at IS NULL/);
  assert.match(auth, /status='ACTIVE'/);
  assert.match(logout, /await revokeSession/);
  assert.match(migration, /CREATE TABLE IF NOT EXISTS auth_sessions/);
});

test("Google login requires verified email and binds provider subject", async () => {
  const callback = await source("../src/app/api/auth/google/callback/route.ts");
  assert.match(callback, /googleUser\.email_verified !== true/);
  assert.match(callback, /provider_subject/);
  assert.match(callback, /google_link_required/);
});
