import Link from "next/link";
import { Settings } from "lucide-react";
import { SheepMark } from "@/components/icons/SheepMark";

/**
 * The top row on every page, the same as on Home's photo: the logo in its white circle
 * + "Life Analytics" (a link Home). Only Home (`onPhoto`, white text on the hero) adds
 * the round Settings button; elsewhere the row sits on the page, no bar.
 */
export function TopRow({ onPhoto = false }: { onPhoto?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <Link
        href="/"
        className={`tap -mx-1 flex min-h-11 items-center gap-2 rounded-full px-1 text-sm font-semibold ${onPhoto ? "text-white" : "text-foreground"}`}
      >
        <span className="flex h-9 w-9 items-center justify-center rounded-full border border-border bg-white shadow-sm">
          <SheepMark className="h-7 w-7 text-primary" />
        </span>
        Life Analytics
      </Link>
      {onPhoto && (
        <Link href="/settings" aria-label="Settings" className="btn flex h-11 w-11 bg-black/25 text-white backdrop-blur hover:bg-black/40">
          <Settings size={20} strokeWidth={1.8} aria-hidden="true" />
        </Link>
      )}
    </div>
  );
}

export function Navigation() {
  return (
    // Home draws this row on its photo hero (data-home-hero), so it hides there.
    <header className="pt-[env(safe-area-inset-top)] [body:has([data-home-hero])_&]:hidden">
      <div className="mx-auto max-w-3xl px-4 pt-2 sm:px-6 sm:pt-4">
        <TopRow />
      </div>
    </header>
  );
}
