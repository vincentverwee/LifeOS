import { PrismaClient } from "@/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
};

function createPrismaClient() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error("DATABASE_URL is not set (see .env.example).");
  // Each serverless instance gets its own pool, and pgbouncer already pools behind it:
  // keep it small, drop idle connections, and fail fast instead of waiting forever.
  const pool = new Pool({ connectionString, max: 3, idleTimeoutMillis: 10_000, connectionTimeoutMillis: 5_000 });
  const adapter = new PrismaPg(pool);
  return new PrismaClient({ adapter });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
