import Link from "next/link";
import { getTodayKey } from "@/lib/today";
import { ReminderForm } from "@/components/reminders/ReminderForm";
import { RoutineForm } from "@/components/reminders/RoutineForm";

const KINDS = [
  { type: null, label: "Reminder", href: "/reminders/add" },
  { type: "last-done", label: "Last done", href: "/reminders/add?type=last-done" },
] as const;

export default async function AddPage({ searchParams }: PageProps<"/reminders/add">) {
  const { type } = await searchParams;
  const lastDone = type === "last-done";
  const todayKey = await getTodayKey();

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold text-foreground">Add</h1>

      <nav aria-label="What to add" className="flex gap-1 rounded-full bg-surface-muted p-1">
        {KINDS.map((kind) => {
          const active = (kind.type === "last-done") === lastDone;
          return (
            <Link
              key={kind.label}
              href={kind.href}
              replace
              aria-current={active ? "page" : undefined}
              className={`btn flex min-h-11 flex-1 px-3 text-sm ${
                active ? "bg-surface text-foreground shadow-sm" : "text-ink-muted hover:text-foreground"
              }`}
            >
              {kind.label}
            </Link>
          );
        })}
      </nav>
      <p className="-mt-3 text-sm text-ink-muted">
        {lastDone
          ? "Something you do every so often (washing, training); tap it each time and see how long it's been."
          : "Something to do once, or every day, week or month."}
      </p>

      {lastDone ? <RoutineForm todayKey={todayKey} /> : <ReminderForm todayKey={todayKey} />}
    </div>
  );
}
