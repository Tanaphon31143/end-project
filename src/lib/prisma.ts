import "server-only";
import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function prismaDatabaseUrl() {
  const value = process.env.DATABASE_URL;
  if (!value) throw new Error("DATABASE_URL is not configured");
  const url = new URL(value);
  if (!url.searchParams.has("sslaccept")) url.searchParams.set("sslaccept", "strict");
  return url.toString();
}

export const prisma = globalForPrisma.prisma ?? new PrismaClient({
  datasources: { db: { url: prismaDatabaseUrl() } },
});

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
