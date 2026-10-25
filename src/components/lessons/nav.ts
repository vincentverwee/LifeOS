import { ChartColumn, House, LayoutGrid, Settings, type LucideIcon } from "lucide-react";

export type LessonsTab = { href: string; label: string; icon: LucideIcon };

export const TODAY: LessonsTab = { href: "/lessons", label: "Today", icon: House };
export const GRID: LessonsTab = { href: "/lessons/grid", label: "Lessons", icon: LayoutGrid };
export const INSIGHTS: LessonsTab = { href: "/lessons/insights", label: "Insights", icon: ChartColumn };
export const SETTINGS: LessonsTab = { href: "/lessons/settings", label: "Settings", icon: Settings };

/** Desktop text tabs, in order. */
export const LESSON_LINKS = [
  { href: "/lessons", label: "Today" },
  { href: "/lessons/add", label: "Log time" },
  { href: "/lessons/log", label: "Log" },
  { href: "/lessons/grid", label: "Lessons" },
  { href: "/lessons/insights", label: "Insights" },
  { href: "/lessons/settings", label: "Settings" },
];

/** `phone`: the log has no tab of its own there, so it lights up Today. */
export function isTabActive(pathname: string, href: string, phone = false) {
  if (href === "/lessons") return pathname === href || (phone && pathname.startsWith("/lessons/log"));
  return pathname.startsWith(href);
}
