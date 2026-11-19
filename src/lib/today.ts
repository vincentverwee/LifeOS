import "server-only";
import { cookies } from "next/headers";
import { dayKeyIn, FALLBACK_TZ, TZ_COOKIE } from "@/lib/timeZone";
import { parseDateKey } from "@/lib/format";

export { dayKeyIn };

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

/** Today's date ("YYYY-MM-DD") in the user's timezone. Server-only, per request. */
export async function getTodayKey(): Promise<string> {
  return dayKeyIn(await getTimeZone());
}

/** A "YYYY-MM-DD" from a form that may not be after today: the key, or an error to show. */
export async function readPastDate(raw: unknown): Promise<string | { error: string }> {
  const date = parseDateKey(raw);
  if (!date) return { error: "That date isn't valid." };
  if (date > (await getTodayKey())) return { error: "That date is in the future." };
  return date;
}
