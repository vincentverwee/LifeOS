import "server-only";
import { cookies } from "next/headers";
import { FALLBACK_TZ, TZ_COOKIE } from "@/lib/timeZone";

// Vercel runs in UTC, but "today" is the user's day. The browser reports its
// timezone in a cookie (see TimeZoneSync); until it has, assume Ireland.

function isValidTimeZone(tz: string): boolean {
  try {
    new Intl.DateTimeFormat("en-CA", { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

export async function getTimeZone(): Promise<string> {
  const tz = (await cookies()).get(TZ_COOKIE)?.value;
  return tz && isValidTimeZone(tz) ? tz : FALLBACK_TZ;
}

/** "YYYY-MM-DD" for the given instant in `tz`. */
export function dayKeyIn(tz: string, date: Date = new Date()): string {
  // en-CA formats as YYYY-MM-DD.
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

/** Today's date ("YYYY-MM-DD") in the user's timezone. Server-only, per request. */
export async function getTodayKey(): Promise<string> {
  return dayKeyIn(await getTimeZone());
}
