import Link from "next/link";
import { notFound } from "next/navigation";
import { getRoutine } from "@/lib/data/routines";
import { getTodayKey } from "@/lib/today";
import { deleteRoutine, deleteRoutineLog } from "@/lib/actions/routines";
import { formatDay } from "@/lib/reminders/schedule";
import { describeRhythm, describeSince } from "@/lib/reminders/routines";
import { RoutineForm } from "@/components/reminders/RoutineForm";
import { LogPastDate } from "@/components/reminders/LogPastDate";
import { ConfirmDeleteButton } from "@/components/reminders/ConfirmDeleteButton";

export default async function EditRoutinePage({ params }: PageProps<"/reminders/last-done/[id]">) {
  const { id } = await params;
  const [routine, todayKey] = await Promise.all([getRoutine(id), getTodayKey()]);
  if (!routine) notFound();
  const rhythm = describeRhythm(routine);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link href="/reminders/last-done" className="btn btn-ghost -mx-3 inline-flex min-h-11 px-3 text-sm">
          ‹ Last done
        </Link>
        <h1 className="mt-1 text-2xl font-semibold text-foreground">{routine.name}</h1>
        <p className="mt-1 text-sm text-ink-muted">
          Last done: {describeSince(routine.lastDoneOn, todayKey).toLowerCase()}
          {rhythm && ` · ${rhythm}`}
        </p>
      </div>

      <LogPastDate routineId={routine.id} todayKey={todayKey} />

      {routine.logs.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold text-foreground">History</h2>
          <ul className="mt-2 flex flex-col divide-y divide-border rounded-2xl border border-border bg-surface">
            {routine.logs.map((log) => (
              <li key={log.id} className="flex items-center justify-between gap-3 py-1 pr-1 pl-4">
                <span className="text-foreground">
                  {formatDay(log.doneOn)}
                  <span className="text-ink-muted"> · {describeSince(log.doneOn, todayKey).toLowerCase()}</span>
                </span>
                <form action={deleteRoutineLog}>
                  <input type="hidden" name="logId" value={log.id} />
                  <button type="submit" className="btn btn-ghost inline-flex min-h-11 px-3 text-sm" aria-label="Remove this log">
                    Remove
                  </button>
                </form>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold text-foreground">Edit</h2>
        <RoutineForm routine={routine} todayKey={todayKey} />
      </section>

      <ConfirmDeleteButton action={deleteRoutine} id={routine.id} title={routine.name} label="Delete item" />
    </div>
  );
}
