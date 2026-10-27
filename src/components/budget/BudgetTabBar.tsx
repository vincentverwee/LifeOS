"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChartColumn, House, List, Plus, Settings, type LucideIcon } from "lucide-react";

type Tab = { href: string; label: string; icon: LucideIcon };

const TODAY: Tab = { href: "/budget", label: "Today", icon: House };
const LIST: Tab = { href: "/budget/expenses", label: "Expenses", icon: List };
const INSIGHTS: Tab = { href: "/budget/insights", label: "Insights", icon: ChartColumn };
const SETTINGS: Tab = { href: "/budget/settings", label: "Settings", icon: Settings };

function TabLink({ tab, active }: { tab: Tab; active: boolean }) {
  const Icon = tab.icon;
  return (
    <Link
      href={tab.href}
      aria-current={active ? "page" : undefined}
      className={`flex min-h-14 flex-1 flex-col items-center justify-center gap-0.5 text-[11px] font-medium active:bg-surface-muted ${
        active ? "text-primary" : "text-ink-muted"
      }`}
    >
      <Icon size={24} strokeWidth={1.8} aria-hidden="true" />
      {tab.label}
    </Link>
  );
}

/** Thumb-reachable bottom navigation for phones, with a raised "add" button. */
export function BudgetTabBar() {
  const pathname = usePathname();
  const onAdd = pathname.startsWith("/budget/add");

  return (
    <nav
      aria-label="Budget"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur sm:hidden"
    >
      <div className="mx-auto flex max-w-md items-end px-2">
        <TabLink tab={TODAY} active={pathname === "/budget"} />
        <TabLink tab={LIST} active={pathname.startsWith("/budget/expenses")} />
        <div className="flex flex-1 justify-center">
          <Link
            href="/budget/add"
            aria-label="Add expense"
            aria-current={onAdd ? "page" : undefined}
            className="btn btn-primary -mt-5 mb-1 flex h-14 w-14 shadow-lg ring-4 ring-background"
          >
            <Plus size={30} strokeWidth={2} aria-hidden="true" />
          </Link>
        </div>
        <TabLink tab={INSIGHTS} active={pathname.startsWith("/budget/insights")} />
        <TabLink tab={SETTINGS} active={pathname.startsWith("/budget/settings")} />
      </div>
    </nav>
  );
}
