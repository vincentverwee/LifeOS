import Link from "next/link";
import type { CSSProperties, ReactNode } from "react";
import { Mascot } from "@/components/icons/Mascot";
import type { SectionKind } from "@/lib/data/homeMoods";

/**
 * Every page's top: on pages inside a section a back link ("‹ Budget", "‹ Log"…; a
 * section's first page has none: the logo row above goes Home), the title, an optional line under it and an optional action on the right
 * (hide phone-duplicates of the tab bar's + with `hidden sm:inline-flex`).
 *
 * `section` (a section's first page) puts its mascot as a round line badge beside the title,
 * like on its Home tile.
 */
export function PageHeader({
  title,
  subtitle,
  back = null,
  action,
  section,
  mascot,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  /** Where "‹ …" goes; none on a section's first page. */
  back?: { href: string; label: string } | null;
  action?: ReactNode;
  section?: SectionKind;
  /** A live mascot (LiveMascot with `badge`) in place of the still one. */
  mascot?: ReactNode;
}) {
  return (
    <header>
      <div>
        {back && (
          <Link href={back.href} className="btn btn-ghost -mx-3 inline-flex min-h-11 px-3 text-sm">
            ‹ {back.label}
          </Link>
        )}
        <div className={`flex items-center justify-between gap-3 ${back ? "mt-1" : ""}`}>
          <div className="flex min-w-0 items-center gap-3">
            {section && mascot}
            {section && !mascot && (
              <span
                aria-hidden="true"
                className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-surface-muted text-primary"
                style={
                  {
                    "--color-wool": "var(--color-surface-muted)",
                  } as CSSProperties
                }
              >
                <Mascot kind={section} size={42} decorative />
              </span>
            )}
            <div className="min-w-0">
              <h1 className="text-2xl font-semibold text-foreground">{title}</h1>
              {subtitle && <p className="mt-0.5 text-sm text-ink-muted">{subtitle}</p>}
            </div>
          </div>
          {action}
        </div>
      </div>
    </header>
  );
}
