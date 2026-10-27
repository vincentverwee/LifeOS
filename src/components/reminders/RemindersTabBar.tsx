"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { INSIGHTS, LAST_DONE, TIMELINE, TODO, isTabActive, type RemindersTab } from "./nav";

function TabLink({ tab, active }: { tab: RemindersTab; active: boolean }) {
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
export function RemindersTabBar() {
  const pathname = usePathname();
  const onAdd = pathname.startsWith("/reminders/add");

  return (
    <nav
      aria-label="Reminders"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur sm:hidden"
    >
      <div className="mx-auto flex max-w-md items-end px-2">
        <TabLink tab={TODO} active={isTabActive(pathname, TODO.href)} />
        <TabLink tab={LAST_DONE} active={isTabActive(pathname, LAST_DONE.href)} />
        <div className="flex flex-1 justify-center">
          <Link
            href="/reminders/add"
            aria-label="Add a reminder or Last done item"
            aria-current={onAdd ? "page" : undefined}
            className="btn btn-primary -mt-5 mb-1 flex h-14 w-14 text-3xl leading-none font-light shadow-lg ring-4 ring-background"
          >
            +
          </Link>
        </div>
        <TabLink tab={TIMELINE} active={isTabActive(pathname, TIMELINE.href)} />
        <TabLink tab={INSIGHTS} active={isTabActive(pathname, INSIGHTS.href)} />
      </div>
    </nav>
  );
}
