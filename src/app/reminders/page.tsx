import { getReminders } from "@/lib/data/reminders";
import { getRoutines } from "@/lib/data/routines";
import { getTodayKey } from "@/lib/today";
import { isDue } from "@/lib/reminders/routines";
import { ReminderList } from "@/components/reminders/ReminderList";

export default async function RemindersPage() {
  const todayKey = await getTodayKey();
  const [{ open }, routines] = await Promise.all([getReminders(todayKey), getRoutines(todayKey)]);
  const dueRoutines = routines.filter((r) => isDue(r, todayKey));
  const count = open.length + dueRoutines.length;

  return (
    <section>
      <h1 className="text-2xl font-semibold text-foreground">To do</h1>
      <p className="mt-1 mb-4 text-sm text-ink-muted">
        {count === 0 ? "All done" : `${count} to do`} · tap the sheep when it&apos;s done
      </p>
      <ReminderList reminders={open} routines={dueRoutines} todayKey={todayKey} />
    </section>
  );
}
