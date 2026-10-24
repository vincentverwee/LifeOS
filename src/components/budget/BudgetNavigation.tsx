import Link from "next/link";

const LINKS = [
  { href: "/budget", label: "Today" },
  { href: "/budget/expenses", label: "Expenses" },
  { href: "/budget/insights", label: "Insights" },
  { href: "/budget/settings", label: "Settings" },
];

export function BudgetNavigation() {
  return (
    <nav aria-label="Budget" className="-mt-4 mb-8 border-b border-border">
      <ul className="flex gap-6 overflow-x-auto pb-3 text-sm font-medium">
        {LINKS.map((link) => (
          <li key={link.href} className="shrink-0">
            <Link href={link.href} className="hover:underline">
              {link.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
