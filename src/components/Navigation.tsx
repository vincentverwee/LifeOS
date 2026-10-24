import Link from "next/link";
import { SheepMark } from "@/components/icons/SheepMark";

export function Navigation() {
  return (
    <header className="border-b border-border">
      <div className="mx-auto flex max-w-3xl items-center px-6 py-4">
        <Link href="/" className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <SheepMark className="h-5 w-5 text-primary" />
          Life Analytics
        </Link>
      </div>
    </header>
  );
}
