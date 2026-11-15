import { ChartColumn, List, PieChart, Settings, type LucideIcon } from "lucide-react";

export type InvestTab = { href: string; label: string; icon: LucideIcon };

export const OVERVIEW: InvestTab = { href: "/invest", label: "Overview", icon: PieChart };
export const TRADES: InvestTab = { href: "/invest/trades", label: "Trades", icon: List };
export const INSIGHTS: InvestTab = { href: "/invest/insights", label: "Insights", icon: ChartColumn };
export const SETTINGS: InvestTab = { href: "/invest/settings", label: "Settings", icon: Settings };

/** The raised +: log a trade. */
export const ADD_HREF = "/invest/add";

export const INVEST_LINKS = [OVERVIEW, TRADES, INSIGHTS, SETTINGS];

export function isTabActive(pathname: string, href: string) {
  if (href === "/invest") return pathname === "/invest";
  return pathname.startsWith(href);
}
