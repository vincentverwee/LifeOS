import "server-only";
import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { THEME } from "@/lib/theme";

/**
 * Device and login bookkeeping, not data anyone logged, plus the wardrobe photos
 * (megabytes of bytes as JSON; they stay in the weekly database backups).
 */
const EXCLUDED = new Set<Prisma.ModelName>(["LoginThrottle", "PushSent", "PushSubscription", "ClothingPhoto", "StickerPhoto"]);

type Delegate = { findMany(args?: { orderBy: Record<string, "asc"> }): Promise<unknown[]> };

/**
 * The column to sort a table by: `id`, else its first column (WeekReview is keyed by
 * `weekStart`, join tables like OutfitItem by a pair). Read from the generated
 * `<Model>ScalarFieldEnum`, so it follows the schema.
 */
function sortColumn(name: Prisma.ModelName): string | null {
  const fields = (Prisma as unknown as Record<string, Record<string, string> | undefined>)[`${name}ScalarFieldEnum`];
  if (!fields) return null;
  return "id" in fields ? "id" : (Object.values(fields)[0] ?? null);
}

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
    const column = sortColumn(name);
    tables[name] = await delegate.findMany(column ? { orderBy: { [column]: "asc" } } : undefined);
  }
  return { app: "LifeOS", version: 1, theme: THEME, exportedAt: new Date().toISOString(), tables };
}
