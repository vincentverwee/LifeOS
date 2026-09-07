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
export default function MapLoading() {
  return (
    <AppShell>
      <div className="mx-auto flex h-full max-w-7xl flex-col space-y-6">
        <div className="flex items-start justify-between gap-3">
      <div className="space-y-2">
        <Skeleton className="h-8 w-44" />
        <Skeleton className="h-4 w-64" />
      </div>
          <Skeleton className="h-9 w-28 rounded-lg" />
        </div>
        <Skeleton className="min-h-[500px] flex-1 rounded-2xl" />
      </div>
    </AppShell>
  );
}
