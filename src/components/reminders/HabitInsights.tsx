import { Disclosure } from "@/components/Disclosure";
import { formatPercent } from "@/lib/format";
import { formatDay, weekdayOf } from "@/lib/reminders/schedule";
import { habitGrid, habitStats, type HabitLogRow } from "@/lib/reminders/habits";
import { GROUP_STYLE } from "./habitStyle";

const DAYS = 30;
const GRID_WEEKS = 4;
const WEEKDAY_LETTERS = ["S", "M", "T", "W", "T", "F", "S"]; // getUTCDay order; the grid starts on Monday

/** Daily habits on Reminders Insights: hardest to easiest, and on which days each was (not) done. */
export function HabitInsights({ logs, since, todayKey }: { logs: HabitLogRow[]; since: string | null; todayKey: string }) {
  // Turned off: measure from the first tick in the window instead.
  const start = since ?? logs.map((l) => l.doneOn).sort()[0] ?? todayKey;
  const stats = habitStats(logs, todayKey, start, DAYS);
  const days = stats[0].days;
  const { keys, rows } = habitGrid(logs, todayKey, GRID_WEEKS);
  const hardest = stats[0];
  const easiest = stats.at(-1)!;
  // A thin spacer track between weeks, so every day cell stays the same size.
  const columns = {
    gridTemplateColumns: `minmax(0, 7rem) ${Array(GRID_WEEKS).fill("repeat(7, minmax(0, 1fr))").join(" 2px ")}`,
  };
  const weekGap = (i: number) => (i > 0 && i % 7 === 0 ? [<span key={`gap-${i}`} aria-hidden="true" />] : []);

  return (
    <>
      <section className="card">
        <h2 className="font-medium text-foreground">Daily habits</h2>
        <p className="mt-0.5 text-sm text-ink-muted">
          {logs.length === 0
            ? "Nothing ticked yet."
            : `Hardest: ${hardest.habit.label} · Easiest: ${easiest.habit.label}`}{" "}
          · the last {days} {days === 1 ? "day" : "days"}
        </p>
        <ul className="mt-3 flex flex-col gap-3">
          {stats.map(({ habit, done, rate }) => {
            const GroupIcon = GROUP_STYLE[habit.group].icon;
            return (
              <li key={habit.key}>
                <div className="flex items-baseline justify-between gap-3 text-sm">
                  <span className="flex min-w-0 items-center gap-1.5 text-foreground">
                    <GroupIcon aria-hidden="true" className={`h-3.5 w-3.5 shrink-0 ${GROUP_STYLE[habit.group].color}`} />
                    <span className="truncate">{habit.label}</span>
                  </span>
                  <span className="shrink-0 text-ink-muted">
                    <span className="font-mono font-semibold tabular-nums text-foreground">{formatPercent(rate * 100)}</span> · {done}/{days}
                  </span>
                </div>
                <div className="mt-1 h-2 rounded-full bg-surface-muted">
                  <div className={`h-full rounded-full ${GROUP_STYLE[habit.group].bar}`} style={{ width: `${rate * 100}%` }} />
                </div>
              </li>
            );
          })}
        </ul>
      </section>

      <Disclosure title={`Day by day · last ${GRID_WEEKS} weeks`}>
        <div className="flex flex-col gap-[3px]" role="img" aria-label="Which habits were done on which days">
          {rows.map(({ habit, done }) => (
            <div key={habit.key} className="grid items-center gap-[3px]" style={columns}>
              <span className="truncate pr-1 text-[11px] text-ink-muted">{habit.label}</span>
              {done.flatMap((d, i) => [
                ...weekGap(i),
                <span
                  key={keys[i]}
                  title={`${formatDay(keys[i])} · ${d ? "done" : "not done"}`}
                  className={`aspect-square rounded-[3px] ${d ? GROUP_STYLE[habit.group].bar : "bg-surface-muted"}`}
                />,
              ])}
            </div>
          ))}
          <div className="grid gap-[3px] text-center text-[10px] text-ink-muted" style={columns} aria-hidden="true">
            <span />
            {keys.flatMap((k, i) => [...weekGap(i), <span key={k}>{WEEKDAY_LETTERS[weekdayOf(k)]}</span>])}
          </div>
        </div>
      </Disclosure>

      <Disclosure title="Why these">
        <ul className="flex list-disc flex-col gap-2 pl-5 text-sm text-ink-muted">
          <li>Walking and people matter most: moving every day (~8,000 steps) and strong relationships have by far the strongest links to a longer life. Sleep and diet matter too, with smaller effects.</li>
          <li>Writing down three good things each night raised happiness for months (Seligman, 2005). Around two hours a week in nature goes with noticeably better wellbeing.</li>
          <li>Keeping social media to ~30 minutes a day reduced loneliness and depression within three weeks (University of Pennsylvania, 2018).</li>
          <li>You don&apos;t need all eleven every day. A daily walk with a friend covers movement, daylight and connection in one go.</li>
        </ul>
      </Disclosure>
    </>
  );
}
