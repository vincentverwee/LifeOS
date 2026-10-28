import "server-only";
import { prisma } from "@/lib/prisma";
import { dayKeyIn } from "@/lib/today";
import { dayKey, formatCurrency, formatHours } from "@/lib/format";
import { addDays, daysBetween, weekdayOf } from "@/lib/reminders/schedule";
import { describeSince, isDue } from "@/lib/reminders/routines";
import { getReminders } from "@/lib/data/reminders";
import { getRoutines } from "@/lib/data/routines";
import { getAllPeriods, getPeriodData, getRunningPeriods } from "@/lib/data";
import { budgetGlance } from "@/lib/data/budgetGlance";
import { getStudyTimer, loadStudyPeriods } from "@/lib/data/lessons";
import { computePeriodStats, dailyTotals } from "@/lib/lessons/stats";
import { isPushKind, type PushKind, type PushPayload } from "@/lib/push/kinds";
import { sendPush } from "@/lib/push/send";
import { weatherLine } from "@/lib/push/weather";
import { getDueSubscriptions, getSubscriptions } from "@/lib/data/subscriptions";
import { isDue as isSubscriptionDue } from "@/lib/subscriptions/schedule";

// Runs every 15 minutes (GitHub Actions → /api/push/cron). Each notification has
// a window in the device's local time and a key in PushSent, so it goes out once,
// on the first run inside its window where there's something to say.

/** Local hours [from, to) a kind may be sent in. */
const WINDOWS: Record<Exclude<PushKind, "timer">, [number, number]> = {
  digest: [8, 11],
  "study-evening": [20, 23],
  "budget-evening": [21, 24],
  week: [19, 23], // Sundays only
};
const TIMER_NUDGE_HOURS = 3;
const EXAM_HEADS_UP_DAYS = [0, 1, 3, 7];
const DIGEST_MAX_ITEMS = 4;
/** The digest's body on a morning with nothing on and no weather. */
const DIGEST_EMPTY = "Nothing on the list today.";
const KEEP_SENT_DAYS = 45;
/** Names listed in the review's Last done line before "+N". */
const WEEK_MAX_NAMES = 2;

function hourIn(tz: string, now: Date): number {
  return Number(new Intl.DateTimeFormat("en-GB", { hour: "numeric", hourCycle: "h23", timeZone: tz }).format(now));
}

function inDays(days: number): string {
  return days === 0 ? "today" : days === 1 ? "tomorrow" : `in ${days} days`;
}

/** The rent day as a date in the month of `key` (29–31 clamp to the month's last day). */
function rentDateIn(key: string, rentDay: number): string {
  const [y, m] = key.split("-").map(Number);
  const last = new Date(Date.UTC(y, m, 0)).getUTCDate();
  return `${key.slice(0, 8)}${String(Math.min(rentDay, last)).padStart(2, "0")}`;
}

async function digest(todayKey: string): Promise<PushPayload | null> {
  const [{ open }, routines, subscriptions, { period }, running] = await Promise.all([
    getReminders(todayKey),
    getRoutines(todayKey),
    getSubscriptions(),
    loadStudyPeriods(undefined, todayKey),
    getAllPeriods().then((all) => getRunningPeriods(all, todayKey).find((p) => p.type === "cycle")),
  ]);

  const dueSubscriptions = subscriptions.filter((s) => isSubscriptionDue(s, todayKey));
  const todo = [
    ...open.map((r) => r.title),
    ...routines.filter((r) => isDue(r, todayKey)).map((r) => `${r.name} · ${describeSince(r.lastDoneOn, todayKey).toLowerCase()}`),
    ...dueSubscriptions.map((s) => `Log ${s.name} ${formatCurrency(s.amount)}`),
  ];
  const lines = todo.slice(0, DIGEST_MAX_ITEMS);
  if (todo.length > DIGEST_MAX_ITEMS) lines.push(`+${todo.length - DIGEST_MAX_ITEMS} more`);

  if (period) {
    for (const { exam, course, daysUntil } of computePeriodStats(period, todayKey).upcomingExams) {
      if (EXAM_HEADS_UP_DAYS.includes(daysUntil)) lines.push(`${course?.name ?? "?"} ${exam.kind} ${inDays(daysUntil)}`);
    }
  }

  const tomorrow = addDays(todayKey, 1);
  const month = running ? await getPeriodData(running) : null;
  if (month && month.rent > 0 && month.rentDay) {
    if (rentDateIn(tomorrow, month.rentDay) === tomorrow) lines.push(`Rent ${formatCurrency(month.rent)} tomorrow`);
  }
  for (const s of subscriptions) {
    if (s.isActive && s.nextDueOn === tomorrow) lines.push(`${s.name} ${formatCurrency(s.amount)} renews tomorrow`);
  }

  // Sent every morning, also with nothing on: the runner adds the weather or a quiet line.
  return {
    title: todo.length ? `${todo.length} to do today` : "Good morning",
    body: lines.join("\n"),
    // Renewals to log are confirmed on Budget Today; everything else to do is in Reminders.
    url: todo.length === 0 ? (lines.length ? "/lessons" : "/") : todo.length === dueSubscriptions.length ? "/budget" : "/reminders",
    tag: "digest",
  };
}

async function studyEvening(todayKey: string): Promise<PushPayload | null> {
  const [{ period }, timer] = await Promise.all([loadStudyPeriods(undefined, todayKey), getStudyTimer()]);
  if (!period || timer || todayKey < period.startDate || todayKey > period.endDate) return null;
  const today = period.entries.filter((e) => e.date === todayKey);
  if (today.some((e) => e.hours === 0 && e.note)) return null; // logged as a day off
  const hours = today.reduce((sum, e) => sum + e.hours, 0);
  if (hours >= period.goalHours) return null;
  return {
    title: "Study",
    body: hours === 0
      ? `Nothing logged today. Goal: ${formatHours(period.goalHours)}.`
      : `${formatHours(hours)} of ${formatHours(period.goalHours)} today.`,
    url: "/lessons/add",
    tag: "study-evening",
  };
}

async function budgetEvening(todayKey: string): Promise<PushPayload | null> {
  const glance = await budgetGlance(todayKey);
  if (!glance) return null;
  if (!glance.loggedToday) {
    return { title: "Budget", body: "No expenses logged today. Anything to add?", url: "/budget/add", tag: "budget-evening" };
  }
  if (glance.over) {
    return { title: "Budget", body: `${glance.amount} ${glance.label}.`, url: "/budget", tag: "budget-evening" };
  }
  return null;
}

/** Up to WEEK_MAX_NAMES names, then "+N". */
function names(list: string[]): string {
  const shown = list.slice(0, WEEK_MAX_NAMES).join(", ");
  return list.length > WEEK_MAX_NAMES ? `${shown} +${list.length - WEEK_MAX_NAMES}` : shown;
}

/** Sunday evening: Monday–today in one notification, a line per part that has something to say. */
async function weekReview(todayKey: string): Promise<PushPayload | null> {
  const monday = addDays(todayKey, -6);
  const days = Array.from({ length: 7 }, (_, i) => addDays(monday, i));
  const from = new Date(`${monday}T00:00:00Z`);
  const to = new Date(`${todayKey}T00:00:00Z`);
  const overlaps = { startDate: { lte: to }, endDate: { gte: from } };

  const [spent, cycles, trips, { period }, routines, subscriptionsLogged, dueSubscriptions] = await Promise.all([
    prisma.expense.aggregate({ where: { date: { gte: from, lte: to } }, _sum: { amount: true } }),
    prisma.budgetCycle.findMany({ where: overlaps, select: { startingBudget: true, startDate: true, endDate: true } }),
    prisma.trip.findMany({ where: overlaps, select: { totalBudget: true, startDate: true, endDate: true } }),
    loadStudyPeriods(undefined, todayKey),
    getRoutines(todayKey),
    prisma.expense.aggregate({
      where: { subscriptionId: { not: null }, date: { gte: from, lte: to } },
      _count: true,
      _sum: { amount: true },
    }),
    getDueSubscriptions(todayKey),
  ]);
  const lines: string[] = [];

  // Money: every expense of the week against each day's share of the budget
  // running that day (a trip wins over the month, as everywhere else).
  const ranges = [
    ...trips.map((t) => ({ budget: t.totalBudget.toNumber(), start: dayKey(t.startDate), end: dayKey(t.endDate) })),
    ...cycles.map((c) => ({ budget: c.startingBudget.toNumber(), start: dayKey(c.startDate), end: dayKey(c.endDate) })),
  ];
  const budget = days.reduce((sum, day) => {
    const range = ranges.find((r) => r.start <= day && day <= r.end);
    return range ? sum + range.budget / (daysBetween(range.start, range.end) + 1) : sum;
  }, 0);
  const total = spent._sum.amount?.toNumber() ?? 0;
  if (budget > 0) {
    lines.push(
      total > budget
        ? `Spent ${formatCurrency(total)}, ${formatCurrency(total - budget)} over the week's ${formatCurrency(budget)}`
        : `Spent ${formatCurrency(total)} of the week's ${formatCurrency(budget)}`
    );
  } else if (total > 0) {
    lines.push(`Spent ${formatCurrency(total)}`);
  }

  // Study: the daily goal for each day of the week inside the period, days off left out.
  if (period && period.startDate <= todayKey && monday <= period.endDate) {
    const totals = dailyTotals(period);
    const daysOff = new Set(period.entries.filter((e) => e.hours === 0 && e.note).map((e) => e.date));
    const goalDays = days.filter((d) => d >= period.startDate && d <= period.endDate && !daysOff.has(d));
    const hours = days.reduce((sum, d) => sum + (totals.get(d) ?? 0), 0);
    const atGoal = goalDays.filter((d) => (totals.get(d) ?? 0) >= period.goalHours).length;
    if (goalDays.length > 0) {
      lines.push(
        `Studied ${formatHours(Math.round(hours * 100) / 100)} of ${formatHours(goalDays.length * period.goalHours)} · goal met ${atGoal} of ${goalDays.length} days`
      );
    }
  }

  // Last done: what got done this week, and what's waiting.
  const done = routines.reduce((sum, r) => sum + r.recent.filter((d) => d >= monday).length, 0);
  const due = routines.filter((r) => isDue(r, todayKey)).map((r) => r.name);
  const nudged = routines.some((r) => r.everyDays !== null);
  if (done > 0 || nudged) {
    const status = due.length ? `${due.length} due (${names(due)})` : nudged ? "nothing due" : "";
    lines.push(`Last done: ${done} done${status ? ` · ${status}` : ""}`);
  }

  // Subscriptions: renewals logged this week, and any still waiting.
  const logged = subscriptionsLogged._count;
  if (logged > 0 || dueSubscriptions.length > 0) {
    const parts = [];
    if (logged > 0) parts.push(`${logged} logged (${formatCurrency(subscriptionsLogged._sum.amount?.toNumber() ?? 0)})`);
    if (dueSubscriptions.length > 0) parts.push(`${dueSubscriptions.length} to log`);
    lines.push(`Subscriptions: ${parts.join(" · ")}`);
  }

  if (lines.length === 0) return null;
  return { title: "Your week", body: lines.join("\n"), url: "/", tag: "week" };
}

async function timerNudge(now: Date): Promise<{ key: string; payload: PushPayload } | null> {
  const timer = await getStudyTimer();
  if (!timer) return null;
  const started = new Date(timer.startedAt);
  const hours = (now.getTime() - started.getTime()) / 3_600_000;
  if (hours < TIMER_NUDGE_HOURS) return null;
  const names = timer.courses.map((c) => c.name).join(", ");
  return {
    key: `timer:${started.getTime()}`,
    payload: {
      title: names ? `Still studying ${names}?` : "Still studying?",
      body: `The timer has been running for ${Math.floor(hours)} h. Tap to stop it.`,
      url: "/lessons/add",
      tag: "study-timer",
    },
  };
}

/** Claims a PushSent key; false when another run already has it. */
async function claim(key: string): Promise<boolean> {
  try {
    await prisma.pushSent.create({ data: { key } });
    return true;
  } catch {
    return false;
  }
}

export type PushRunResult = { devices: number; sent: string[]; failed: string[] };

export async function runPushSchedule(now = new Date()): Promise<PushRunResult> {
  await prisma.pushSent.deleteMany({ where: { sentAt: { lt: new Date(now.getTime() - KEEP_SENT_DAYS * 86_400_000) } } });
  const subscriptions = await prisma.pushSubscription.findMany();
  const sent: string[] = [];
  const failed: string[] = [];

  // Loaded once per run, whatever the number of devices. A load that throws is
  // forgotten, so the next device tries again.
  const cache = new Map<string, Promise<PushPayload | null>>();
  const once = (name: string, load: () => Promise<PushPayload | null>) => {
    if (!cache.has(name)) cache.set(name, load().catch((error) => (cache.delete(name), Promise.reject(error))));
    return cache.get(name)!;
  };
  let timer: ReturnType<typeof timerNudge> | null = null;

  for (const sub of subscriptions) {
    const todayKey = dayKeyIn(sub.timeZone, now);
    const hour = hourIn(sub.timeZone, now);

    for (const kind of sub.kinds.filter(isPushKind)) {
      // One failing query or send must not hold up the other devices and kinds.
      try {
        let key: string;
        let payload: PushPayload | null;
        if (kind === "timer") {
          timer ??= timerNudge(now).catch((error) => ((timer = null), Promise.reject(error)));
          const nudge = await timer;
          if (!nudge) continue;
          key = nudge.key;
          payload = nudge.payload;
        } else {
          const [from, to] = WINDOWS[kind];
          if (hour < from || hour >= to) continue;
          if (kind === "week" && weekdayOf(todayKey) !== 0) continue;
          key = `${kind}:${todayKey}`;
          if (await prisma.pushSent.findUnique({ where: { key: `${sub.id}:${key}` } })) continue;
          const load = { digest, "study-evening": studyEvening, "budget-evening": budgetEvening, week: weekReview }[kind];
          payload = await once(`${kind}:${todayKey}`, () => load(todayKey));
          // The digest goes out every morning: weather on top, then the day's lines.
          if (kind === "digest" && payload) {
            const weather = await weatherLine(sub, todayKey);
            const body = [weather, payload.body].filter(Boolean).join("\n") || DIGEST_EMPTY;
            payload = { ...payload, body };
          }
        }
        if (!payload) continue;

        const sentKey = `${sub.id}:${key}`;
        if (!(await claim(sentKey))) continue;
        if (await sendPush(sub, payload)) {
          sent.push(sentKey);
        } else {
          // Not delivered (or the device is gone): let a later run try again.
          await prisma.pushSent.deleteMany({ where: { key: sentKey } });
        }
      } catch (error) {
        console.error("Push schedule failed", sub.id, kind, error);
        failed.push(`${sub.id}:${kind}`);
      }
    }
  }
  return { devices: subscriptions.length, sent, failed };
}
