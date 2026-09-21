import Link from "next/link";

const LINKS = [
  { href: "/", label: "Dashboard" },
  { href: "/expenses", label: "Expenses" },
  { href: "/tags", label: "Tags" },
  { href: "/insights", label: "Insights" },
  { href: "/settings", label: "Settings" },
];

export function Navigation() {
  return (
    <nav className="border-b border-border">
      <ul className="mx-auto flex max-w-3xl gap-6 overflow-x-auto px-6 py-4 text-sm font-medium">
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
