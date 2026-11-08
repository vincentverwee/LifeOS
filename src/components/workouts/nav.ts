import { CalendarDays, ChartColumn, List, Settings, type LucideIcon } from "lucide-react";

export type WorkoutsTab = { href: string; label: string; icon: LucideIcon };

export const TODAY: WorkoutsTab = { href: "/workouts", label: "Today", icon: CalendarDays };
export const LOG: WorkoutsTab = { href: "/workouts/log", label: "Log", icon: List };
export const INSIGHTS: WorkoutsTab = { href: "/workouts/insights", label: "Insights", icon: ChartColumn };
export const SETTINGS: WorkoutsTab = { href: "/workouts/settings", label: "Settings", icon: Settings };

/** The raised +: log a workout by hand (a live one starts from Today). */
export const ADD_HREF = "/workouts/add";

/** Desktop text tabs, in order. */
export const WORKOUTS_LINKS = [TODAY, LOG, INSIGHTS, SETTINGS];

/** A workout's own page belongs to Log; the live session to Today. */
export function isTabActive(pathname: string, href: string) {
  if (href === "/workouts") return pathname === "/workouts" || pathname === "/workouts/session";
  if (href === "/workouts/log") return pathname.startsWith(href) || /^\/workouts\/(?!add|insights|settings|session)[^/]+/.test(pathname);
  return pathname.startsWith(href);
}
