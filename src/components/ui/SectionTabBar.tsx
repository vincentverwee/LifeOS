"use client";

import Link from "next/link";
import { Plus, type LucideIcon } from "lucide-react";

export type BarTab = {
  href: string;
  label: string;
  icon: LucideIcon;
  active: boolean;
};

function TabLink({ tab }: { tab: BarTab }) {
  const Icon = tab.icon;
  return (
    <Link
      href={tab.href}
      aria-current={tab.active ? "page" : undefined}
      className={`flex min-h-14 flex-1 flex-col items-center justify-center gap-0.5 text-[11px] font-medium active:bg-surface-muted ${
        tab.active ? "text-primary" : "text-ink-muted"
      }`}
    >
      <Icon size={24} strokeWidth={1.8} aria-hidden="true" />
      {tab.label}
    </Link>
  );
}

/**
 * Every section's phone tab bar: two tabs, the raised + in the middle, two tabs.
 * Hidden from sm: up (sections show their text tabs there); pages clear it with `.pb-tabbar`.
 */
export function SectionTabBar({
  label,
  tabs,
  add,
}: {
  /** The section's name, for screen readers ("Budget"). */
  label: string;
  tabs: [BarTab, BarTab, BarTab, BarTab];
  /** The raised +: where it goes, what it says to a screen reader, and whether that page is open. */
  add: { href: string; label: string; active?: boolean };
}) {
  return (
    <nav
      aria-label={label}
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur sm:hidden"
    >
      <div className="mx-auto flex max-w-md items-end px-2">
        <TabLink tab={tabs[0]} />
        <TabLink tab={tabs[1]} />
        <div className="flex flex-1 justify-center">
          <Link
            href={add.href}
            aria-label={add.label}
            aria-current={add.active ? "page" : undefined}
            className="btn btn-primary -mt-5 mb-1 flex h-14 w-14 shadow-lg ring-4 ring-background"
          >
            <Plus size={30} strokeWidth={2} aria-hidden="true" />
          </Link>
        </div>
        <TabLink tab={tabs[2]} />
        <TabLink tab={tabs[3]} />
      </div>
    </nav>
  );
}
