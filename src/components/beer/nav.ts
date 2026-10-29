import { Beer, ChartColumn, List, Map as MapIcon, type LucideIcon } from "lucide-react";

export type BeerTab = { href: string; label: string; icon: LucideIcon };

export const OVERVIEW: BeerTab = { href: "/beer", label: "Overview", icon: Beer };
export const PUBS: BeerTab = { href: "/beer/pubs", label: "Pubs", icon: List };
export const MAP: BeerTab = { href: "/beer/map", label: "Map", icon: MapIcon };
export const INSIGHTS: BeerTab = { href: "/beer/insights", label: "Insights", icon: ChartColumn };

/**
 * Logging a beer happens on Budget's Add expense. The hash (not a query) picks the
 * beer category there, so the offline copy of /budget/add still matches.
 */
export const LOG_BEER_HREF = "/budget/add#beer";

/** Desktop text tabs, in order. */
export const BEER_LINKS = [OVERVIEW, PUBS, MAP, INSIGHTS];

/** Pub pages (/beer/pubs/[id]) belong to Pubs. */
export function isTabActive(pathname: string, href: string) {
  if (href === "/beer") return pathname === "/beer";
  return pathname.startsWith(href);
}
