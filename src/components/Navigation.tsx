import Link from "next/link";
import { SheepMark } from "@/components/icons/SheepMark";

export function Navigation() {
  return (
    <header className="border-b border-border pt-[env(safe-area-inset-top)]">
      <div className="mx-auto flex max-w-3xl items-center px-4 py-1 sm:px-6 sm:py-2">
        <Link href="/" className="-mx-2 flex min-h-11 items-center gap-2 rounded-full px-2 text-sm font-semibold text-foreground tap">
          <SheepMark className="h-6 w-6 text-primary" />
          Life Analytics
        </Link>
      </div>
    </header>
  );
}
