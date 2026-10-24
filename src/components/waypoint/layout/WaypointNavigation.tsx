"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { WAYPOINT_TABS, isTabActive } from "./nav";

/** Text tabs above the content — tablet/desktop only. Phones use WaypointTabBar. */
export function WaypointNavigation() {
  const pathname = usePathname();

  return (
    <nav aria-label="Waypoint" className="-mt-4 mb-8 hidden border-b border-border sm:block">
      <ul className="flex gap-6 text-sm font-medium">
        {WAYPOINT_TABS.map((tab) => {
          const active = isTabActive(pathname, tab.href);
          return (
            <li key={tab.href}>
              <Link
                href={tab.href}
                aria-current={active ? "page" : undefined}
                className={`-mb-px inline-block border-b-2 pb-3 ${
                  active ? "border-primary text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"
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
