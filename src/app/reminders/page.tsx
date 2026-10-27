import { getReminders } from "@/lib/data/reminders";
import { getTodayKey } from "@/lib/today";
import { ReminderList } from "@/components/reminders/ReminderList";

export default async function RemindersPage() {
  const todayKey = await getTodayKey();
  const { open } = await getReminders(todayKey);

  return (
    <section>
      <h1 className="text-2xl font-semibold text-foreground">Reminders</h1>
      <p className="mt-1 mb-4 text-sm text-ink-muted">
        {open.length === 0 ? "All done" : `${open.length} to do`} · tap the sheep when it&apos;s done
      </p>
      <ReminderList reminders={open} todayKey={todayKey} />
    </section>
  );
}
