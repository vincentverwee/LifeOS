import { moodOf } from "@/lib/diary/onThisDay";
import { formatDay } from "@/lib/reminders/schedule";

/** The last few weeks of moods, one bar per day (a stub where none was picked). */
export function MoodStrip({ days }: { days: { date: string; mood: number | null }[] }) {
  const logged = days.filter((d) => d.mood !== null);
  if (logged.length === 0) return null;
  const average = logged.reduce((sum, d) => sum + d.mood!, 0) / logged.length;
  const face = moodOf(Math.round(average));

  return (
    <section className="rounded-2xl border border-border bg-surface p-4">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="font-semibold text-foreground">Mood · last {days.length} days</h2>
        {face && (
          <span className="text-sm text-ink-muted">
            Mostly {face.label.toLowerCase()} {face.face}
          </span>
        )}
      </div>
      <div className="mt-3 flex h-12 items-end gap-0.5" role="img" aria-label={`Mood over the last ${days.length} days`}>
        {days.map((d) => (
          <div key={d.date} title={`${formatDay(d.date)}${d.mood ? ` · ${moodOf(d.mood)?.label}` : ""}`} className="flex h-full flex-1 items-end">
            <div
              className={`w-full rounded-sm ${d.mood ? "bg-accent" : "bg-surface-muted"}`}
              style={{ height: d.mood ? `${(d.mood / 5) * 100}%` : "8%" }}
            />
          </div>
        ))}
      </div>
      <div className="mt-2 flex justify-between font-mono text-xs tabular-nums text-ink-muted">
        <span>{formatDay(days[0].date)}</span>
        <span>Today</span>
      </div>
    </section>
  );
}
