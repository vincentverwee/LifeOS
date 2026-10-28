import "server-only";
import { prisma } from "@/lib/prisma";
import { dayKeyIn } from "@/lib/today";
import { formatCurrency, formatHours } from "@/lib/format";
import { addDays } from "@/lib/reminders/schedule";
import { describeSince, isDue } from "@/lib/reminders/routines";
import { getReminders } from "@/lib/data/reminders";
import { getRoutines } from "@/lib/data/routines";
import { getAllPeriods, getPeriodData, getRunningPeriods } from "@/lib/data";
import { budgetGlance } from "@/lib/data/budgetGlance";
import { getStudyTimer, loadStudyPeriods } from "@/lib/data/lessons";
import { computePeriodStats } from "@/lib/lessons/stats";
import { isPushKind, type PushKind, type PushPayload } from "@/lib/push/kinds";
import { sendPush } from "@/lib/push/send";
import { weatherLine } from "@/lib/push/weather";
import { getSubscriptions } from "@/lib/data/subscriptions";
import { isDue as isSubscriptionDue } from "@/lib/subscriptions/schedule";

// Runs every 15 minutes (GitHub Actions → /api/push/cron). Each notification has
// a window in the device's local time and a key in PushSent, so it goes out once,
// on the first run inside its window where there's something to say.

/** Local hours [from, to) a kind may be sent in. */
const WINDOWS: Record<Exclude<PushKind, "timer">, [number, number]> = {
  digest: [8, 11],
  "study-evening": [20, 23],
  "budget-evening": [21, 24],
};
const TIMER_NUDGE_HOURS = 3;
const EXAM_HEADS_UP_DAYS = [0, 1, 3, 7];
const DIGEST_MAX_ITEMS = 4;
const KEEP_SENT_DAYS = 45;

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

  if (lines.length === 0) return null;
  return {
    title: todo.length ? `${todo.length} to do today` : "Good morning",
    body: lines.join("\n"),
    // Renewals to log are confirmed on Budget Today; everything else to do is in Reminders.
    url: todo.length === 0 ? "/lessons" : todo.length === dueSubscriptions.length ? "/budget" : "/reminders",
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
          key = `${kind}:${todayKey}`;
          if (await prisma.pushSent.findUnique({ where: { key: `${sub.id}:${key}` } })) continue;
          const load = { digest, "study-evening": studyEvening, "budget-evening": budgetEvening }[kind];
          payload = await once(`${kind}:${todayKey}`, () => load(todayKey));
          // Weather heads a digest that has something to say; it never sends one alone.
          if (kind === "digest" && payload) {
            const weather = await weatherLine(sub, todayKey);
            if (weather) payload = { ...payload, body: `${weather}\n${payload.body}` };
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
