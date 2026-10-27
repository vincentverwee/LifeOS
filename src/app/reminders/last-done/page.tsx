import Link from "next/link";
import { getRoutines } from "@/lib/data/routines";
import { getTodayKey } from "@/lib/today";
import { RoutineList } from "@/components/reminders/RoutineList";
import { MASCOT } from "@/lib/theme";

export default async function LastDonePage() {
  const todayKey = await getTodayKey();
  const routines = await getRoutines(todayKey);

  return (
    <section>
      <h1 className="text-2xl font-semibold text-foreground">Last done</h1>
      <p className="mt-1 mb-4 text-sm text-ink-muted">Tap the {MASCOT} when you did it today. Longest ago at the top.</p>
      {routines.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-border px-4 py-6 text-center text-ink-muted">
          Keep track of things like washing, bedsheets or training.{" "}
          <Link href="/reminders/add?type=last-done" className="btn btn-ghost -mx-1 inline-flex min-h-11 px-3">
            Add one
          </Link>
        </p>
      ) : (
        <RoutineList routines={routines} todayKey={todayKey} />
      )}
    </section>
  );
}
