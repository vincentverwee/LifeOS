import { AppShell } from '@/components/layout/AppShell';
import { Skeleton } from '@/components/ui/skeleton';

/**
 * Route-level loading UI.
 *
 * This page is `force-dynamic`, so a tap on the nav has to wait for a server render plus its
 * Supabase queries before anything can change on screen. Without a `loading.tsx` the router has
 * nothing to show in the meantime, so the old page just sits there and the button feels dead --
 * and Next can't prefetch a dynamic route at all. With this boundary the tap paints instantly
 * and the boundary itself is prefetched when the link comes into view.
 */
export default function StatsLoading() {
  return (
    <AppShell>
      <div className="mx-auto max-w-7xl space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-8 w-44" />
        <Skeleton className="h-4 w-64" />
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-[116px] rounded-2xl" />
        ))}
      </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <Skeleton className="h-[280px] rounded-2xl" />
          <Skeleton className="h-[280px] rounded-2xl" />
        </div>
        <Skeleton className="h-[240px] rounded-2xl" />
      </div>
    </AppShell>
  );
}
