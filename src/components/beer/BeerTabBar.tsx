"use client";

import { usePathname } from "next/navigation";
import { SectionTabBar } from "@/components/ui/SectionTabBar";
import { INSIGHTS, LOG_BEER_HREF, MAP, OVERVIEW, PUBS, isTabActive } from "./nav";

/** Beer's phone tabs; + logs a beer (on Add expense). */
export function BeerTabBar() {
  const pathname = usePathname();
  const t = (tab: typeof OVERVIEW) => ({ ...tab, active: isTabActive(pathname, tab.href) });
  return <SectionTabBar label="Beer" tabs={[t(OVERVIEW), t(PUBS), t(MAP), t(INSIGHTS)]} add={{ href: LOG_BEER_HREF, label: "Log a beer" }} />;
}
