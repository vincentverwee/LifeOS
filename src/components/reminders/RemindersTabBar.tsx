"use client";

import { usePathname } from "next/navigation";
import { SectionTabBar } from "@/components/ui/SectionTabBar";
import { INSIGHTS, LAST_DONE, TIMELINE, TODO, isTabActive } from "./nav";

/** Reminders' phone tabs; + adds a reminder or Last done item. */
export function RemindersTabBar() {
  const pathname = usePathname();
  const t = (tab: typeof TODO) => ({ ...tab, active: isTabActive(pathname, tab.href) });
  return (
    <SectionTabBar
      label="Reminders"
      tabs={[t(TODO), t(LAST_DONE), t(TIMELINE), t(INSIGHTS)]}
      add={{ href: "/reminders/add", label: "Add a reminder or Last done item", active: pathname.startsWith("/reminders/add") }}
    />
  );
}
