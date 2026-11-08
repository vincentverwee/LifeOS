import "server-only";
import type { MascotKind } from "@/components/icons/Mascot";
import { getRemindersGlance } from "@/lib/data/reminders";
import { getDueSubscriptions } from "@/lib/data/subscriptions";
import { getPeopleGlance } from "@/lib/data/people";
import { getStudyTimer } from "@/lib/data/lessons";

/** Birthdays this close get a dot on People. */
const BIRTHDAY_DOT_DAYS = 7;

/**
 * Sections that need something from you today (a dot in the side column).
 * Never rejects: the dots are read with use() under Suspense and no error
 * boundary, so a failed query would otherwise replace all of Home.
 */
export async function getHomeAlerts(todayKey: string): Promise<MascotKind[]> {
  try {
    return await loadAlerts(todayKey);
  } catch (error) {
    console.error("Home alerts failed", error);
    return [];
  }
}

async function loadAlerts(todayKey: string): Promise<MascotKind[]> {
  const [reminders, subscriptions, people, timer] = await Promise.all([
    getRemindersGlance(todayKey),
    getDueSubscriptions(todayKey),
    getPeopleGlance(todayKey),
    getStudyTimer(),
  ]);
  const alerts = new Set<MascotKind>();
  if (reminders.open > 0) alerts.add("reminders");
  if (subscriptions.length > 0) alerts.add("budget");
  const birthday = people.nextBirthday?.next;
  if (people.catchUp.length > 0 || (birthday && birthday.daysUntil <= BIRTHDAY_DOT_DAYS)) alerts.add("people");
  if (timer) alerts.add("lessons");
  return [...alerts];
}
