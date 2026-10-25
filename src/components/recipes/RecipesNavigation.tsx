"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { RECIPE_TABS, isTabActive } from "./nav";

/** Text tabs above the content — tablet/desktop only. Phones use RecipesTabBar. */
export function RecipesNavigation() {
  const pathname = usePathname();

  return (
    <nav aria-label="Recipes" className="-mt-4 mb-8 hidden border-b border-border sm:block">
      <ul className="flex gap-6 text-sm font-medium">
        {RECIPE_TABS.map((tab) => {
          const active = isTabActive(pathname, tab.href);
          return (
            <li key={tab.href}>
              <Link
                href={tab.href}
                aria-current={active ? "page" : undefined}
                className={`-mb-px inline-block border-b-2 pb-3 ${
                  active ? "border-primary text-foreground" : "border-transparent text-ink-muted hover:text-foreground"
                }`}
              >
                {tab.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
