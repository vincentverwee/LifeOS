import { AppShell } from '@/components/layout/AppShell';
import { Skeleton } from '@/components/ui/skeleton';

/** Shown while the router fetches this route, so a nav tap paints immediately. Mirrors the
 *  in-page skeleton the detail view shows while it loads its own data. */
export default function TripDetailLoading() {
  return (
    <AppShell>
      <div className="mx-auto max-w-5xl space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-32 rounded-2xl" />
      </div>
    </AppShell>
  );
}
