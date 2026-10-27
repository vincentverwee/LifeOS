"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { COOKBOOK, FRIDGE, SAVED, SWIPE, isTabActive, type RecipesTab } from "./nav";

function TabLink({ tab, active }: { tab: RecipesTab; active: boolean }) {
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
export function RecipesTabBar() {
  const pathname = usePathname();
  const onAdd = pathname.startsWith("/recipes/add");

  return (
    <nav
      aria-label="Recipes"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur sm:hidden"
    >
      <div className="mx-auto flex max-w-md items-end px-2">
        <TabLink tab={COOKBOOK} active={isTabActive(pathname, COOKBOOK.href)} />
        <TabLink tab={SWIPE} active={isTabActive(pathname, SWIPE.href)} />
        <div className="flex flex-1 justify-center">
          <Link
            href="/recipes/add"
            aria-label="Add a recipe"
            aria-current={onAdd ? "page" : undefined}
            className="btn btn-primary -mt-5 mb-1 flex h-14 w-14 text-3xl leading-none font-light shadow-lg ring-4 ring-background"
          >
            +
          </Link>
        </div>
        <TabLink tab={FRIDGE} active={isTabActive(pathname, FRIDGE.href)} />
        <TabLink tab={SAVED} active={isTabActive(pathname, SAVED.href)} />
      </div>
    </nav>
  );
}
