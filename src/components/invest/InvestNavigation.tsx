"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ADD_HREF, INVEST_LINKS, isTabActive } from "./nav";

/** Text tabs above the content — tablet/desktop only. Phones use InvestTabBar. */
export function InvestNavigation() {
  const pathname = usePathname();
  return (
    <nav aria-label="Investments" className="-mt-4 mb-8 hidden border-b border-border sm:block">
      <ul className="flex gap-6 text-sm font-medium">
        {INVEST_LINKS.map((tab) => {
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
        <li className="ml-auto">
          <Link href={ADD_HREF} className="-mb-px inline-block border-b-2 border-transparent pb-3 text-ink-muted hover:text-foreground">
            + Log a trade
          </Link>
        </li>
      </ul>
    </nav>
  );
}
