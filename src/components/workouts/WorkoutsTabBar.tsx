"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Plus } from "lucide-react";
import { ADD_HREF, INSIGHTS, LOG, SETTINGS, TODAY, isTabActive, type WorkoutsTab } from "./nav";

function TabLink({ tab, active }: { tab: WorkoutsTab; active: boolean }) {
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

/** Thumb-reachable bottom navigation for phones; the raised + logs a workout by hand. */
export function WorkoutsTabBar() {
  const pathname = usePathname();
  return (
    <nav
      aria-label="Workouts"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur sm:hidden"
    >
      <div className="mx-auto flex max-w-md items-end px-2">
        <TabLink tab={TODAY} active={isTabActive(pathname, TODAY.href)} />
        <TabLink tab={LOG} active={isTabActive(pathname, LOG.href)} />
        <div className="flex flex-1 justify-center">
          <Link href={ADD_HREF} aria-label="Log a workout" className="btn btn-primary -mt-5 mb-1 flex h-14 w-14 shadow-lg ring-4 ring-background">
            <Plus size={30} strokeWidth={2} aria-hidden="true" />
          </Link>
        </div>
        <TabLink tab={INSIGHTS} active={isTabActive(pathname, INSIGHTS.href)} />
        <TabLink tab={SETTINGS} active={isTabActive(pathname, SETTINGS.href)} />
      </div>
    </nav>
  );
}
