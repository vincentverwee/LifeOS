/** Cookie holding the browser's IANA timezone, so the server knows the user's "today". */
export const TZ_COOKIE = "tz";

/** Assumed until the browser has reported its timezone. */
export const FALLBACK_TZ = "Europe/Brussels";

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
