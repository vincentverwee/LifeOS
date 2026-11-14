import { PrismaClient } from "@/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
};

function createPrismaClient() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error("DATABASE_URL is not set (see .env.example).");
  // Each serverless instance gets its own pool, and pgbouncer already pools behind it.
  // Home sends ~50 queries per render, so 10 at a time (3 made them queue in ~20 rounds);
  // connections stay a minute so the next tap doesn't reconnect first. The timeout also
  // covers queries waiting for a free connection, so it must outlast a busy render.
  const pool = new Pool({ connectionString, max: 10, idleTimeoutMillis: 60_000, connectionTimeoutMillis: 10_000 });
  // An idle connection the pooler closed (e.g. while the function was frozen) is just dropped.
  pool.on("error", (error) => console.error("Idle database connection failed", error));
  const adapter = new PrismaPg(pool);
  return new PrismaClient({ adapter });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
