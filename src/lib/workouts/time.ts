// Pure: wall-clock time in a time zone ↔ instants (the server runs in UTC).

/** Minutes the zone is ahead of UTC at `instant` (Brussels in summer: 120). */
function offsetMinutes(instant: number, tz: string): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(new Date(instant));
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value);
  const asUtc = Date.UTC(get("year"), get("month") - 1, get("day"), get("hour"), get("minute"), get("second"));
  return Math.round((asUtc - Math.floor(instant / 1000) * 1000) / 60_000);
}

/** The instant `dateKey` + "HH:MM" means on the wall clock in `tz`. */
export function zonedInstant(dateKey: string, time: string, tz: string): Date {
  const [y, m, d] = dateKey.split("-").map(Number);
  const [hh, mm] = time.split(":").map(Number);
  const wall = Date.UTC(y, m - 1, d, hh, mm);
  // Two passes settle the offset around DST changes.
  let instant = wall - offsetMinutes(wall, tz) * 60_000;
  instant = wall - offsetMinutes(instant, tz) * 60_000;
  return new Date(instant);
}

/** "HH:MM" of `instant` on the wall clock in `tz`. */
export function timeOfDayIn(instant: Date, tz: string): string {
  return new Intl.DateTimeFormat("en-GB", { timeZone: tz, hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(instant);
}

/** A valid "HH:MM" (00:00–23:59), or null. */
export function parseTime(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const m = /^(\d{1,2}):(\d{2})$/.exec(raw.trim());
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  return h <= 23 && min <= 59 ? `${String(h).padStart(2, "0")}:${m[2]}` : null;
}

/** "Morning" / "Afternoon" / "Evening" / "Night" for a "HH:MM". */
export function partOfDay(time: string): string {
  const h = Number(time.slice(0, 2));
  if (h < 5) return "Night";
  if (h < 12) return "Morning";
  if (h < 18) return "Afternoon";
  return "Evening";
}
