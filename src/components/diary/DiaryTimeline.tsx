import Link from "next/link";
import type { DiaryRow } from "@/lib/data/diary";
import { diaryBits, moodOf } from "@/lib/diary/onThisDay";
import { formatDay } from "@/lib/reminders/schedule";

const monthFormatter = new Intl.DateTimeFormat("en-GB", { month: "long", year: "numeric", timeZone: "UTC" });

/** Diary days (each bit on its own line) grouped by month, newest first (they arrive newest first). */
export function DiaryTimeline({ rows }: { rows: DiaryRow[] }) {
  const months: { label: string; rows: DiaryRow[] }[] = [];
  for (const row of rows) {
    const label = monthFormatter.format(new Date(`${row.date}T00:00:00Z`));
    if (months.at(-1)?.label !== label) months.push({ label, rows: [] });
    months.at(-1)!.rows.push(row);
  }

  return (
    <div className="flex flex-col gap-5">
      {months.map((month) => (
        <section key={month.label}>
          <h3 className="text-sm font-medium text-ink-muted">{month.label}</h3>
          <ul className="mt-1 flex flex-col">
            {month.rows.map((row) => {
              const mood = moodOf(row.mood);
              return (
                <li key={row.id}>
                  <Link href={`/diary/${row.date}`} className="tap -mx-2 flex min-h-11 items-start gap-3 rounded-lg px-2 py-2">
                    <span className="w-20 shrink-0 pt-0.5 text-sm tabular-nums text-ink-muted">{formatDay(row.date)}</span>
                    <span className="flex min-w-0 flex-1 flex-col gap-1 text-foreground">
                      {diaryBits(row.text).map((bit, i) => (
                        <span key={i}>{bit}</span>
                      ))}
                    </span>
                    {mood && (
                      <span className="shrink-0" role="img" aria-label={mood.label}>
                        {mood.face}
                      </span>
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </div>
  );
}
