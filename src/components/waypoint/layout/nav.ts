import { BarChart3, LayoutDashboard, Map, Route, type LucideIcon } from "lucide-react";

export const WAYPOINT_TABS: { href: string; label: string; icon: LucideIcon }[] = [
  { href: "/waypoint", label: "Overview", icon: LayoutDashboard },
  { href: "/waypoint/trips", label: "Trips", icon: Route },
  { href: "/waypoint/map", label: "Map", icon: Map },
  { href: "/waypoint/stats", label: "Stats", icon: BarChart3 },
];

export function isTabActive(pathname: string, href: string) {
  return href === "/waypoint" ? pathname === href : pathname.startsWith(href);
}
