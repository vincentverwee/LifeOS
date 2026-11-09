"use client";

import { usePathname } from "next/navigation";
import { SectionTabBar } from "@/components/ui/SectionTabBar";
import { GRID, INSIGHTS, SETTINGS, TODAY, isTabActive } from "./nav";

/** Lessons' phone tabs; + logs study time. */
export function LessonsTabBar() {
  const pathname = usePathname();
  return (
    <SectionTabBar
      label="Lessons"
      tabs={[
        { ...TODAY, active: isTabActive(pathname, TODAY.href, true) },
        { ...GRID, active: isTabActive(pathname, GRID.href) },
        { ...INSIGHTS, active: isTabActive(pathname, INSIGHTS.href) },
        { ...SETTINGS, active: isTabActive(pathname, SETTINGS.href) },
      ]}
      add={{ href: "/lessons/add", label: "Log study time", active: pathname.startsWith("/lessons/add") }}
    />
  );
}
