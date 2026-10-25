import { Prisma } from "@/generated/prisma/client";

type KnownCode = "P2002" | "P2003" | "P2025";

/**
 * For the catch of a write in a server action: turns the Prisma errors that mean
 * "someone changed the data underneath you" (unique clash, row in use, row gone)
 * into a `{ ok: false }` result, and rethrows anything else.
 */
export function knownError(e: unknown, messages: Partial<Record<KnownCode, string>>): { ok: false; error: string } {
  if (e instanceof Prisma.PrismaClientKnownRequestError) {
    const message = messages[e.code as KnownCode];
    if (message) return { ok: false, error: message };
  }
  throw e;
}
