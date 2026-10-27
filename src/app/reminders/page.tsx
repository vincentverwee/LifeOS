import Link from "next/link";
import { getReminders } from "@/lib/data/reminders";
import { getTodayKey } from "@/lib/today";
import { describeDue, describeRepeat, type Reminder } from "@/lib/reminders/schedule";
import { ReminderList } from "@/components/reminders/ReminderList";
import { ReminderForm } from "@/components/reminders/ReminderForm";
import { Disclosure } from "@/components/Disclosure";

const UPCOMING_SHOWN = 5;

export default async function RemindersPage() {
  const todayKey = await getTodayKey();
  const { open, upcoming } = await getReminders(todayKey);

  return (
    <div className="flex flex-col gap-8">
      <section>
        <h1 className="text-2xl font-semibold text-foreground">Reminders</h1>
        <p className="mt-1 mb-4 text-sm text-ink-muted">
          {open.length === 0 ? "All done" : `${open.length} to do`} · tap the sheep when it&apos;s done
        </p>
        <ReminderList reminders={open} todayKey={todayKey} />
      </section>

      <Disclosure title="Add reminder" defaultOpen={open.length + upcoming.length === 0}>
        <ReminderForm todayKey={todayKey} />
      </Disclosure>

      {upcoming.length > 0 && (
        <section>
          <h2 className="text-xl font-semibold text-foreground">Upcoming</h2>
          <UpcomingList reminders={upcoming.slice(0, UPCOMING_SHOWN)} todayKey={todayKey} />
          {upcoming.length > UPCOMING_SHOWN && (
            <details className="group mt-2">
              <summary className="btn btn-ghost -mx-3 inline-flex min-h-11 cursor-pointer list-none px-3 text-sm group-open:hidden [&::-webkit-details-marker]:hidden">
                Show all {upcoming.length}
              </summary>
              <UpcomingList reminders={upcoming.slice(UPCOMING_SHOWN)} todayKey={todayKey} />
            </details>
          )}
        </section>
      )}
    </div>
  );
}

function UpcomingList({ reminders, todayKey }: { reminders: Reminder[]; todayKey: string }) {
  return (
    <ul className="mt-3 flex flex-col gap-2">
      {reminders.map((reminder) => {
        const repeat = describeRepeat(reminder.repeat, reminder.dueOn, reminder.anchorDay);
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
