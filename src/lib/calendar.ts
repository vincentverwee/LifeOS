const MS_PER_DAY = 86_400_000;

export type CalendarDay = { key: string; inRange: boolean };

/** The days from `startKey` to `endKey` as Monday-first weeks, padded to whole weeks (`inRange` false). */
export function calendarWeeks(startKey: string, endKey: string): CalendarDay[][] {
  const startMs = Date.parse(`${startKey}T00:00:00Z`);
  const endMs = Date.parse(`${endKey}T00:00:00Z`);
  // Monday on or before the start, Sunday on or after the end.
  const gridStart = startMs - ((new Date(startMs).getUTCDay() + 6) % 7) * MS_PER_DAY;
  const gridEnd = endMs + ((7 - new Date(endMs).getUTCDay()) % 7) * MS_PER_DAY;
  const weeks: CalendarDay[][] = [];
  for (let ms = gridStart; ms <= gridEnd; ms += MS_PER_DAY) {
    if (weeks.length === 0 || weeks.at(-1)!.length === 7) weeks.push([]);
    weeks.at(-1)!.push({ key: new Date(ms).toISOString().slice(0, 10), inRange: ms >= startMs && ms <= endMs });
  }
  return weeks;
}
