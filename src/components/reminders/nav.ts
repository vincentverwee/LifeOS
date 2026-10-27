import { CalendarClock, ChartColumn, History, ListTodo, type LucideIcon } from "lucide-react";

export type RemindersTab = { href: string; label: string; icon: LucideIcon };

export const TODO: RemindersTab = { href: "/reminders", label: "To do", icon: ListTodo };
export const LAST_DONE: RemindersTab = { href: "/reminders/last-done", label: "Last done", icon: History };
export const TIMELINE: RemindersTab = { href: "/reminders/timeline", label: "Timeline", icon: CalendarClock };
export const INSIGHTS: RemindersTab = { href: "/reminders/insights", label: "Insights", icon: ChartColumn };

/** Desktop text tabs, in order. */
export const REMINDER_LINKS = [
  { href: "/reminders", label: "To do" },
  { href: "/reminders/last-done", label: "Last done" },
  { href: "/reminders/add", label: "Add" },
  { href: "/reminders/timeline", label: "Timeline" },
  { href: "/reminders/insights", label: "Insights" },
];

const SECTIONS = ["/reminders/last-done", "/reminders/add", "/reminders/timeline", "/reminders/insights"];

/** Reminder edit pages (/reminders/[id]) belong to To do; /reminders/last-done/[id] to Last done. */
export function isTabActive(pathname: string, href: string) {
  if (href === "/reminders") return !SECTIONS.some((section) => pathname.startsWith(section));
  return pathname.startsWith(href);
}
