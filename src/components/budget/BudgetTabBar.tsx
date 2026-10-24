"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type Tab = { href: string; label: string; icon: React.ReactNode };

function Icon({ d }: { d: string }) {
  return (
    <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={d} />
    </svg>
  );
}

const TODAY: Tab = { href: "/budget", label: "Today", icon: <Icon d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z" /> };
const LIST: Tab = { href: "/budget/expenses#list", label: "Expenses", icon: <Icon d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" /> };
const INSIGHTS: Tab = { href: "/budget/insights", label: "Insights", icon: <Icon d="M4 20V10M10 20V4M16 20v-7M22 20H2" /> };
const SETTINGS: Tab = {
  href: "/budget/settings",
  label: "Settings",
  icon: <Icon d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" />,
};

function TabLink({ tab, active }: { tab: Tab; active: boolean }) {
  return (
    <Link
      href={tab.href}
      aria-current={active ? "page" : undefined}
      className={`flex min-h-14 flex-1 flex-col items-center justify-center gap-0.5 text-[11px] font-medium ${
        active ? "text-primary" : "text-ink-muted"
      }`}
    >
      {tab.icon}
      {tab.label}
    </Link>
  );
}

/** Thumb-reachable bottom navigation for phones, with a raised "add" button. */
export function BudgetTabBar() {
  const pathname = usePathname();
  const onExpenses = pathname.startsWith("/budget/expenses");

  return (
    <nav
      aria-label="Budget"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur sm:hidden"
    >
      <div className="mx-auto flex max-w-md items-end px-2">
        <TabLink tab={TODAY} active={pathname === "/budget"} />
        <TabLink tab={LIST} active={false} />
        <div className="flex flex-1 justify-center">
          <Link
            href="/budget/expenses"
            aria-label="Add expense"
            aria-current={onExpenses ? "page" : undefined}
            className="-mt-5 mb-1 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-3xl leading-none font-light text-primary-foreground shadow-lg ring-4 ring-background"
          >
            +
          </Link>
        </div>
        <TabLink tab={INSIGHTS} active={pathname.startsWith("/budget/insights")} />
        <TabLink tab={SETTINGS} active={pathname.startsWith("/budget/settings")} />
      </div>
    </nav>
  );
}
