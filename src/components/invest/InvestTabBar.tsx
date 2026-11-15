"use client";

import { usePathname } from "next/navigation";
import { SectionTabBar } from "@/components/ui/SectionTabBar";
import { ADD_HREF, INSIGHTS, OVERVIEW, SETTINGS, TRADES, isTabActive, type InvestTab } from "./nav";

/** Investments' phone tabs; + logs a trade. */
export function InvestTabBar() {
  const pathname = usePathname();
  const t = (tab: InvestTab) => ({ ...tab, active: isTabActive(pathname, tab.href) });
  return (
    <SectionTabBar
      label="Investments"
      tabs={[t(OVERVIEW), t(TRADES), t(INSIGHTS), t(SETTINGS)]}
      add={{ href: ADD_HREF, label: "Log a trade", active: pathname.startsWith(ADD_HREF) }}
    />
  );
}
