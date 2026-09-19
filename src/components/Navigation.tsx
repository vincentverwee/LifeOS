import Link from "next/link";

const LINKS = [
  { href: "/", label: "Dashboard" },
  { href: "/expenses", label: "Expenses" },
  { href: "/insights", label: "Insights" },
  { href: "/settings", label: "Settings" },
];

export function Navigation() {
  return (
    <nav className="border-b border-black/10 dark:border-white/10">
      <ul className="mx-auto flex max-w-3xl gap-6 px-6 py-4 text-sm font-medium">
        {LINKS.map((link) => (
          <li key={link.href}>
            <Link href={link.href} className="hover:underline">
              {link.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
