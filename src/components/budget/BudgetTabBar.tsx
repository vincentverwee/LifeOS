"use client";

import { usePathname } from "next/navigation";
import { SectionTabBar } from "@/components/ui/SectionTabBar";
import { ChartColumn, House, List, Settings } from "lucide-react";

/** Budget's phone tabs; + adds an expense. Subscriptions count as Settings. */
export function BudgetTabBar() {
  const pathname = usePathname();
  return (
    <SectionTabBar
      label="Budget"
      tabs={[
        { href: "/budget", label: "Today", icon: House, active: pathname === "/budget" },
        { href: "/budget/expenses", label: "Expenses", icon: List, active: pathname.startsWith("/budget/expenses") },
        { href: "/budget/insights", label: "Insights", icon: ChartColumn, active: pathname.startsWith("/budget/insights") },
        {
          href: "/budget/settings",
          label: "Settings",
          icon: Settings,
          active: pathname.startsWith("/budget/settings") || pathname.startsWith("/budget/subscriptions"),
        },
      ]}
      add={{ href: "/budget/add", label: "Add expense", active: pathname.startsWith("/budget/add") }}
    />
  );
}
