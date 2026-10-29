import "server-only";
import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { THEME } from "@/lib/theme";

/** Device and login bookkeeping, not data anyone logged. */
const EXCLUDED = new Set<Prisma.ModelName>(["LoginThrottle", "PushSent", "PushSubscription"]);

type Delegate = { findMany(args: { orderBy: { id: "asc" } }): Promise<unknown[]> };

/**
 * Every table as plain rows, for "Download everything" on /settings. Walks
 * Prisma.ModelName so tables added later are included without touching this.
 * Decimals become strings and dates ISO strings in JSON.
 */
export async function exportEverything() {
  const tables: Record<string, unknown[]> = {};
  // One table at a time: the pool is small and this is a rare, manual request.
  for (const name of Object.values(Prisma.ModelName)) {
    if (EXCLUDED.has(name)) continue;
    const key = name[0].toLowerCase() + name.slice(1);
    const delegate = (prisma as unknown as Record<string, Delegate>)[key];
    tables[name] = await delegate.findMany({ orderBy: { id: "asc" } });
  }
  return { app: "LifeOS", version: 1, theme: THEME, exportedAt: new Date().toISOString(), tables };
}
