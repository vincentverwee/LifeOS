import { CalendarClock, ListTodo, type LucideIcon } from "lucide-react";

export type RemindersTab = { href: string; label: string; icon: LucideIcon };

export const OPEN: RemindersTab = { href: "/reminders", label: "Reminders", icon: ListTodo };
export const TIMELINE: RemindersTab = { href: "/reminders/timeline", label: "Timeline", icon: CalendarClock };

/** Desktop text tabs, in order. */
export const REMINDER_LINKS = [
  { href: "/reminders", label: "Reminders" },
  { href: "/reminders/add", label: "Add" },
  { href: "/reminders/timeline", label: "Timeline" },
];

/** Edit pages (/reminders/[id]) belong to the Reminders tab. */
export function isTabActive(pathname: string, href: string) {
  if (href === "/reminders") {
    return pathname === href || (!pathname.startsWith("/reminders/add") && !pathname.startsWith("/reminders/timeline"));
  }
  return pathname.startsWith(href);
}
