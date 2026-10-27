import Link from "next/link";
import { getFinishedReminders, getReminders } from "@/lib/data/reminders";
import { getTimeZone, dayKeyIn } from "@/lib/today";
import { describeDue, describeRepeat, FINISHED_DAYS, type Reminder } from "@/lib/reminders/schedule";
import { FinishedList } from "@/components/reminders/FinishedList";

const UPCOMING_SHOWN = 5;

/** What's coming up (not due yet) and what was ticked off lately. */
export default async function ReminderTimelinePage() {
  const tz = await getTimeZone();
  const todayKey = dayKeyIn(tz);
  const [{ upcoming }, finished] = await Promise.all([getReminders(todayKey), getFinishedReminders(tz)]);

  return (
    <div className="flex flex-col gap-8">
      <h1 className="text-2xl font-semibold text-foreground">Timeline</h1>

      <section>
        <h2 className="text-xl font-semibold text-foreground">Coming up</h2>
        {upcoming.length === 0 ? (
          <p className="mt-2 text-sm text-ink-muted">
            Nothing scheduled.{" "}
            <Link href="/reminders/add" className="btn btn-ghost -mx-1 inline-flex min-h-11 px-3">
              Add a reminder
            </Link>
          </p>
        ) : (
          <>
            <UpcomingList reminders={upcoming.slice(0, UPCOMING_SHOWN)} todayKey={todayKey} />
            {upcoming.length > UPCOMING_SHOWN && (
              <details className="group mt-2">
                <summary className="btn btn-ghost -mx-3 inline-flex min-h-11 cursor-pointer list-none px-3 text-sm group-open:hidden [&::-webkit-details-marker]:hidden">
                  Show all {upcoming.length}
                </summary>
                <UpcomingList reminders={upcoming.slice(UPCOMING_SHOWN)} todayKey={todayKey} />
              </details>
            )}
          </>
        )}
      </section>

      <section>
        <h2 className="text-xl font-semibold text-foreground">Finished</h2>
        <p className="mt-1 text-sm text-ink-muted">
          One-offs you ticked off. They disappear after {FINISHED_DAYS} days; tap the sheep to put one back.
        </p>
        {finished.length === 0 ? (
          <p className="mt-2 text-sm text-ink-muted">Nothing finished lately.</p>
        ) : (
          <FinishedList reminders={finished} todayKey={todayKey} />
        )}
      </section>
    </div>
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
