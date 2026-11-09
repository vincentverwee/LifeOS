import Link from "next/link";
import { PageHeader } from "@/components/ui/PageHeader";
import { notFound } from "next/navigation";
import { getRoutine } from "@/lib/data/routines";
import { getTodayKey } from "@/lib/today";
import { deleteRoutine, deleteRoutineLog } from "@/lib/actions/routines";
import { formatDay } from "@/lib/reminders/schedule";
import { describeRhythm, describeSince, routineLink } from "@/lib/reminders/routines";
import { RoutineForm } from "@/components/reminders/RoutineForm";
import { LogPastDate } from "@/components/reminders/LogPastDate";
import { ConfirmDeleteButton } from "@/components/reminders/ConfirmDeleteButton";

export default async function EditRoutinePage({ params }: PageProps<"/reminders/last-done/[id]">) {
  const { id } = await params;
  const [routine, todayKey] = await Promise.all([getRoutine(id), getTodayKey()]);
  if (!routine) notFound();
  const rhythm = describeRhythm(routine);
  const link = routineLink(routine.source);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={routine.name}
        subtitle={
          <>
            Last done: {describeSince(routine.lastDoneOn, todayKey).toLowerCase()}
            {rhythm && ` · ${rhythm}`}
          </>
        }
        back={{ href: "/reminders/last-done", label: "Last done" }}
      />

      {link ? (
        <p className="flex items-center justify-between gap-3 rounded-2xl bg-surface-muted py-1 pr-1 pl-4 text-sm text-foreground">
          Logged from {link.from}.
          <Link href={link.href} className="btn btn-ghost inline-flex min-h-11 shrink-0 px-3">
            Open ›
          </Link>
        </p>
      ) : (
        <LogPastDate routineId={routine.id} todayKey={todayKey} />
      )}

      {routine.logs.length > 0 && (
        <section>
          <h2 className="section-title">History</h2>
          <ul className="mt-2 card-list">
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
        <h2 className="section-title">Edit</h2>
        <RoutineForm routine={routine} todayKey={todayKey} />
      </section>

      <ConfirmDeleteButton action={deleteRoutine} id={routine.id} title={routine.name} label="Delete item" />
    </div>
  );
}
