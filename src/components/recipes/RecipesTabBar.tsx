"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { RECIPE_TABS, isTabActive } from "./nav";

/** Thumb-reachable bottom navigation for phones. */
export function RecipesTabBar() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Recipes"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur sm:hidden"
    >
      <div className="mx-auto flex max-w-md items-end px-2">
        {RECIPE_TABS.map(({ href, label, icon: Icon }) => {
          const active = isTabActive(pathname, href);
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              className={`flex min-h-14 flex-1 flex-col items-center justify-center gap-0.5 text-[11px] font-medium active:bg-surface-muted ${
                active ? "text-primary" : "text-ink-muted"
              }`}
            >
              <Icon size={24} strokeWidth={1.8} aria-hidden="true" />
              {label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
