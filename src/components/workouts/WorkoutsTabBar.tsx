"use client";

import { usePathname } from "next/navigation";
import { SectionTabBar } from "@/components/ui/SectionTabBar";
import { ADD_HREF, INSIGHTS, LOG, SETTINGS, TODAY, isTabActive } from "./nav";

/** Workouts' phone tabs; + logs a workout by hand (a live one starts from Today). */
export function WorkoutsTabBar() {
  const pathname = usePathname();
  const t = (tab: typeof TODAY) => ({ ...tab, active: isTabActive(pathname, tab.href) });
  return (
    <SectionTabBar
      label="Workouts"
      tabs={[t(TODAY), t(LOG), t(INSIGHTS), t(SETTINGS)]}
      add={{ href: ADD_HREF, label: "Log a workout", active: pathname.startsWith(ADD_HREF) }}
    />
  );
}
