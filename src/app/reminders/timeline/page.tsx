import Link from "next/link";
import { getFinishedReminders, getReminders } from "@/lib/data/reminders";
import { getRoutineHistory, type RoutineHistoryEntry } from "@/lib/data/routines";
import { getTimeZone, dayKeyIn } from "@/lib/today";
import { describeDue, describeRepeat, FINISHED_DAYS, formatDay, type Reminder } from "@/lib/reminders/schedule";
import { describeSince } from "@/lib/reminders/routines";
import { FinishedList } from "@/components/reminders/FinishedList";
import { Disclosure } from "@/components/Disclosure";
import { MASCOT } from "@/lib/theme";

const SHOWN = 5;
const HISTORY_LIMIT = 60;

/** Two folds: the Last done log, and reminders coming up / ticked off lately. */
export default async function ReminderTimelinePage() {
  const tz = await getTimeZone();
  const todayKey = dayKeyIn(tz);
  const [{ upcoming }, finished, history] = await Promise.all([
    getReminders(todayKey),
    getFinishedReminders(tz),
    getRoutineHistory(HISTORY_LIMIT),
  ]);

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-semibold text-foreground">Timeline</h1>

      <Disclosure title="Last done" defaultOpen>
        {history.length === 0 ? (
          <p className="text-sm text-ink-muted">
            Nothing logged yet.{" "}
            <Link href="/reminders/add?type=last-done" className="btn btn-ghost -mx-1 inline-flex min-h-11 px-3">
              Add a Last done item
            </Link>
          </p>
        ) : (
          <ShowAll
            items={history}
            render={(items) => <HistoryList entries={items} todayKey={todayKey} />}
            label={history.length === HISTORY_LIMIT ? `Show the last ${HISTORY_LIMIT}` : `Show all ${history.length}`}
          />
        )}
      </Disclosure>

      <Disclosure title="Reminders" defaultOpen>
        <section>
          <h2 className="font-semibold text-foreground">Coming up</h2>
          {upcoming.length === 0 ? (
            <p className="mt-1 text-sm text-ink-muted">
              Nothing scheduled.{" "}
              <Link href="/reminders/add" className="btn btn-ghost -mx-1 inline-flex min-h-11 px-3">
                Add a reminder
              </Link>
            </p>
          ) : (
            <ShowAll
              items={upcoming}
              render={(items) => <UpcomingList reminders={items} todayKey={todayKey} />}
              label={`Show all ${upcoming.length}`}
            />
          )}
        </section>

        <section>
          <h2 className="font-semibold text-foreground">Finished</h2>
          <p className="mt-1 text-sm text-ink-muted">
            One-offs you ticked off. They disappear after {FINISHED_DAYS} days; tap the {MASCOT} to put one back.
          </p>
          {finished.length === 0 ? (
            <p className="mt-2 text-sm text-ink-muted">Nothing finished lately.</p>
          ) : (
            <FinishedList reminders={finished} todayKey={todayKey} />
          )}
        </section>
      </Disclosure>
    </div>
  );
}

/** The first few, the rest behind "Show all" (keeps the page calm). */
function ShowAll<T>({ items, render, label }: { items: T[]; render: (items: T[]) => React.ReactNode; label: string }) {
  return (
    <>
      {render(items.slice(0, SHOWN))}
      {items.length > SHOWN && (
        <details className="group mt-2">
          <summary className="btn btn-ghost -mx-3 inline-flex min-h-11 cursor-pointer list-none px-3 text-sm group-open:hidden [&::-webkit-details-marker]:hidden">
            {label}
          </summary>
          {render(items.slice(SHOWN))}
        </details>
      )}
    </>
  );
}

function HistoryList({ entries, todayKey }: { entries: RoutineHistoryEntry[]; todayKey: string }) {
  return (
    <ul className="mt-2 flex flex-col divide-y divide-border">
      {entries.map((entry) => (
        <li key={entry.id} className="flex min-h-11 items-center justify-between gap-3 py-1.5">
          <span className="min-w-0 truncate text-foreground">{entry.name}</span>
          <span className="shrink-0 text-sm text-ink-muted">
            {formatDay(entry.doneOn)} · {describeSince(entry.doneOn, todayKey).toLowerCase()}
          </span>
        </li>
      ))}
    </ul>
  );
}

function UpcomingList({ reminders, todayKey }: { reminders: Reminder[]; todayKey: string }) {
  return (
    <ul className="mt-3 flex flex-col gap-2">
      {reminders.map((reminder) => {
        const repeat = describeRepeat(reminder, reminder.dueOn);
        return (
          <li key={reminder.id}>
            <Link
              href={`/reminders/${reminder.id}`}
              className="tap flex min-h-11 items-center justify-between gap-3 rounded-2xl border border-border bg-surface px-4 py-2.5"
            >
              <span className="min-w-0">
                <span className="block truncate text-foreground">{reminder.title}</span>
                {repeat && <span className="block text-sm text-ink-muted">{repeat}</span>}
              </span>
              <span className="shrink-0 text-sm text-ink-muted">{describeDue(reminder.dueOn, todayKey)}</span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
