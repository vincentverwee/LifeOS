import Link from "next/link";

type Feature = {
  name: string;
  description: string;
  href?: string;
  emoji: string;
};

const FEATURES: Feature[] = [
  {
    name: "Budget",
    description: "Monthly budgets, trips, expenses and spending insights.",
    href: "/budget",
    emoji: "💶",
  },
  {
    name: "Waypoint",
    description: "Places and plans worth remembering.",
    emoji: "📍",
  },
  {
    name: "Recipes",
    description: "What to cook, and what it needs.",
    emoji: "🍲",
  },
];

export default function HomePage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Life Analytics</h1>
        <p className="mt-1 text-sm text-ink-muted">Your personal data, in one place.</p>
      </div>

      <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {FEATURES.map((feature) => {
          const body = (
            <>
              <span className="text-3xl" aria-hidden="true">
                {feature.emoji}
              </span>
              <span className="mt-3 block font-medium text-foreground">{feature.name}</span>
              <span className="mt-1 block text-sm text-ink-muted">{feature.description}</span>
              {!feature.href && (
                <span className="mt-3 inline-block rounded-full border border-border px-2 py-0.5 text-xs text-ink-muted">
                  Coming soon
                </span>
              )}
            </>
          );

          return (
            <li key={feature.name}>
              {feature.href ? (
                <Link
                  href={feature.href}
                  className="block rounded-xl border border-border bg-surface p-5 hover:border-primary"
                >
                  {body}
                </Link>
              ) : (
                <div className="rounded-xl border border-dashed border-border p-5 opacity-70">
                  {body}
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
