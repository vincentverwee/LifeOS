import Link from "next/link";
import { SheepMark } from "@/components/icons/SheepMark";

export default function NotFound() {
  return (
    <div className="flex min-h-[40vh] flex-col items-center justify-center gap-4 text-center">
      <SheepMark className="h-14 w-14 text-primary" />
      <div>
        <h1 className="text-xl font-semibold text-foreground">Not found</h1>
        <p className="mt-1 text-sm text-ink-muted">This page wandered off from the flock.</p>
      </div>
      <Link href="/" className="btn btn-primary px-5 py-2.5">
        Home
      </Link>
    </div>
  );
}
