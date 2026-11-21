import { PageHeader } from "@/components/ui/PageHeader";
import { getReminders } from "@/lib/data/reminders";
import { getRoutines } from "@/lib/data/routines";
import { getCatchUps } from "@/lib/data/people";
import { getTodayKey } from "@/lib/today";
import { isDue } from "@/lib/reminders/routines";
import { ReminderList } from "@/components/reminders/ReminderList";
import { MASCOT } from "@/lib/theme";
import { getHabits } from "@/lib/data/habits";
import { HabitsCard, HabitsSwitch } from "@/components/reminders/HabitsCard";

export default async function RemindersPage() {
  const todayKey = await getTodayKey();
  const [{ open }, routines, catchUps, habits] = await Promise.all([
    getReminders(todayKey),
    getRoutines(todayKey),
    getCatchUps(todayKey),
    getHabits(todayKey),
  ]);
  const dueRoutines = routines.filter((r) => isDue(r, todayKey));
  const count = open.length + dueRoutines.length + catchUps.length;

  return (
    <section className="flex flex-col gap-4">
      <PageHeader section="reminders"
        title="Reminders"
        subtitle={
          <>
            {count === 0 ? "All done" : `${count} to do`} · tap the {MASCOT} when it&apos;s done
          </>
        }
      />
      <ReminderList reminders={open} routines={dueRoutines} catchUps={catchUps} todayKey={todayKey} />
      {habits.since ? (
        <HabitsCard done={habits.logs.filter((l) => l.doneOn === todayKey).map((l) => l.habit)} />
      ) : (
        <div className="card">
          <HabitsSwitch on={false} />
        </div>
      )}
    </section>
  );
}
