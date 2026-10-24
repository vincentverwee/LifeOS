"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/budget", label: "Today" },
  { href: "/budget/add", label: "Add expense" },
  { href: "/budget/expenses", label: "Expenses" },
  { href: "/budget/insights", label: "Insights" },
  { href: "/budget/settings", label: "Settings" },
];

function isActive(pathname: string, href: string) {
  return href === "/budget" ? pathname === href : pathname.startsWith(href);
}

/** Text tabs above the content — tablet/desktop only. Phones use BudgetTabBar. */
export function BudgetNavigation() {
  const pathname = usePathname();

  return (
    <nav aria-label="Budget" className="-mt-4 mb-8 hidden border-b border-border sm:block">
      <ul className="flex gap-6 text-sm font-medium">
        {LINKS.map((link) => {
          const active = isActive(pathname, link.href);
          return (
            <li key={link.href}>
              <Link
                href={link.href}
                aria-current={active ? "page" : undefined}
                className={`-mb-px inline-block border-b-2 pb-3 ${
                  active ? "border-primary text-foreground" : "border-transparent text-ink-muted hover:text-foreground"
                }`}
              >
                {link.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
