import "server-only";
import mysql, { type Pool } from "mysql2/promise";

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("DATABASE_URL is not configured");
}

const parsedUrl = new URL(databaseUrl);

const POOL_VERSION = 5;

const globalForDatabase = globalThis as typeof globalThis & {
  mysqlPool?: Pool;
  mysqlPoolVersion?: number;
};

// Reset pool if code was updated during hot reloading in development
if (
  globalForDatabase.mysqlPool &&
  globalForDatabase.mysqlPoolVersion !== POOL_VERSION
) {
  try {
    globalForDatabase.mysqlPool.end().catch(() => {});
  } catch {}
  globalForDatabase.mysqlPool = undefined;
}

function isTransientError(err: unknown): boolean {
  if (!err || typeof err !== "object") return false;
  const error = err as { code?: string; message?: string; errno?: number | string };
  const code = String(error.code || "");
  const msg = typeof error.message === "string" ? error.message : "";
  return (
    code === "ECONNRESET" ||
    code === "PROTOCOL_CONNECTION_LOST" ||
    code === "ETIMEDOUT" ||
    code === "EPIPE" ||
    code === "PROTOCOL_ENQUEUE_AFTER_FATAL_ERROR" ||
    code === "ER_CLIENT_INTERACTION_TIMEOUT" ||
    code === "ER_SERVER_SHUTDOWN" ||
    msg.includes("ECONNRESET") ||
    msg.includes("Connection lost") ||
    msg.includes("closed") ||
    msg.includes("ETIMEDOUT") ||
    msg.includes("The server closed the connection")
  );
}

async function retryOperation<T>(
  operation: () => Promise<T>,
  maxRetries = 5,
): Promise<T> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (err) {
      lastError = err;
      if (!isTransientError(err) || attempt === maxRetries) {
        throw err;
      }
      // A remote TLS endpoint can take a moment to retire the broken socket and
      // accept a fresh connection. A short exponential backoff avoids hammering
      // the same pool while keeping normal requests fast.
      await new Promise((resolve) => setTimeout(resolve, 250 * 2 ** (attempt - 1)));
    }
  }
  throw lastError;
}

function createDatabasePool(): Pool {
  if (
    process.env.NODE_ENV === "production" &&
    process.env.DATABASE_SSL_REJECT_UNAUTHORIZED === "false"
  ) {
    throw new Error(
      "DATABASE_SSL_REJECT_UNAUTHORIZED=false is not allowed in production",
    );
  }
  const pool = mysql.createPool({
    host: parsedUrl.hostname,
    port: Number(parsedUrl.port || 3306),
    user: decodeURIComponent(parsedUrl.username),
    password: decodeURIComponent(parsedUrl.password),
    database: parsedUrl.pathname.replace(/^\//, ""),
    ssl: {
      minVersion: "TLSv1.2",
      rejectUnauthorized:
        process.env.DATABASE_SSL_REJECT_UNAUTHORIZED !== "false",
    },
    connectionLimit: 10,
    // TiDB Cloud may close an idle TLS socket before the client notices. Retire
    // idle connections sooner so the next request gets a fresh socket instead of
    // surfacing ECONNRESET from a stale pooled connection.
    maxIdle: 2,
    idleTimeout: 120_000,
    waitForConnections: true,
    queueLimit: 0,
    connectTimeout: 10_000,
    enableKeepAlive: true,
    keepAliveInitialDelay: 0,
  });

  const rawExecute = pool.execute.bind(pool);
  // @ts-expect-error mysql2 overloaded execute
  pool.execute = (...args: Parameters<typeof rawExecute>) => {
    return retryOperation(() => rawExecute(...args));
  };

  const rawQuery = pool.query.bind(pool);
  // @ts-expect-error mysql2 overloaded query
  pool.query = (...args: Parameters<typeof rawQuery>) => {
    return retryOperation(() => rawQuery(...args));
  };

  const rawGetConnection = pool.getConnection.bind(pool);
  pool.getConnection = async () => {
    return await retryOperation(async () => {
      const conn = await rawGetConnection();
      try {
        await conn.ping();
      } catch (err) {
        try {
          conn.destroy();
        } catch {}
        if (isTransientError(err)) {
          throw err;
        }
      }
      return conn;
    });
  };

  return pool;
}

export const db = globalForDatabase.mysqlPool ?? createDatabasePool();

if (process.env.NODE_ENV !== "production") {
  globalForDatabase.mysqlPool = db;
  globalForDatabase.mysqlPoolVersion = POOL_VERSION;
}
