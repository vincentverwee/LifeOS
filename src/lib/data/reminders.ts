import "server-only";
import { prisma } from "@/lib/prisma";
import { dayKey } from "@/lib/format";
import { dayKeyIn } from "@/lib/today";
import { FINISHED_DAYS, isOpen, isRepeat, type Reminder } from "@/lib/reminders/schedule";
import { isDue, isOverdue as isRoutineOverdue, type Routine } from "@/lib/reminders/routines";
import { getRoutines } from "./routines";

const SELECT = { id: true, title: true, repeat: true, dueOn: true, anchorDay: true, weekdays: true } as const;

function toReminder(row: {
  id: string;
  title: string;
  repeat: string;
  dueOn: Date | null;
  anchorDay: number | null;
  weekdays: number[];
}): Reminder {
  return {
    ...row,
    repeat: isRepeat(row.repeat) ? row.repeat : "once",
    dueOn: row.dueOn ? dayKey(row.dueOn) : null,
  };
}

async function getActive(): Promise<Reminder[]> {
  const rows = await prisma.reminder.findMany({
    where: { doneAt: null },
    orderBy: [{ dueOn: { sort: "asc", nulls: "last" } }, { createdAt: "asc" }],
    select: SELECT,
  });
  return rows.map(toReminder);
}

/** Open (oldest due first, then undated) and upcoming (soonest first). */
export async function getReminders(todayKey: string): Promise<{ open: Reminder[]; upcoming: Reminder[] }> {
  const active = await getActive();
  return {
    open: active.filter((r) => isOpen(r, todayKey)),
    upcoming: active.filter((r) => !isOpen(r, todayKey)),
  };
}

export async function getReminder(id: string): Promise<Reminder | null> {
  const row = await prisma.reminder.findFirst({ where: { id, doneAt: null }, select: SELECT });
  return row ? toReminder(row) : null;
}

export type FinishedReminder = { id: string; title: string; /** "YYYY-MM-DD" in the user's timezone */ doneOn: string };

/** One-offs ticked off in the last FINISHED_DAYS days, latest first. */
export async function getFinishedReminders(tz: string): Promise<FinishedReminder[]> {
  const rows = await prisma.reminder.findMany({
    where: { doneAt: { gte: new Date(Date.now() - FINISHED_DAYS * 86_400_000) } },
    orderBy: { doneAt: "desc" },
    select: { id: true, title: true, doneAt: true },
  });
  return rows.map((r) => ({ id: r.id, title: r.title, doneOn: dayKeyIn(tz, r.doneAt!) }));
}

export type RemindersGlance = {
  open: number;
  overdue: number;
  next: Reminder | null;
  /** The Last done item done longest ago, for when nothing is coming up. */
  longest: Routine | null;
};

/** For the home tile: open reminders plus Last done items past their "every N days". */
export async function getRemindersGlance(todayKey: string): Promise<RemindersGlance> {
  const [{ open, upcoming }, routines] = await Promise.all([getReminders(todayKey), getRoutines(todayKey)]);
  const due = routines.filter((r) => isDue(r, todayKey));
  return {
    open: open.length + due.length,
    overdue:
      open.filter((r) => r.dueOn !== null && r.dueOn < todayKey).length +
      due.filter((r) => isRoutineOverdue(r, todayKey)).length,
    next: upcoming[0] ?? null,
    // Oldest last date wins ("YYYY-MM-DD" keys sort as dates).
    longest:
      routines.filter((r) => r.lastDoneOn !== null).sort((a, b) => a.lastDoneOn!.localeCompare(b.lastDoneOn!))[0] ?? null,
  };
}
