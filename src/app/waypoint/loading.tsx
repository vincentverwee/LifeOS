import { Skeleton } from '@/components/waypoint/ui/skeleton';

/**
 * Route-level loading UI.
 *
 * This page is dynamic (`connection()`), so a tap on the nav has to wait for a server render plus its
 * Supabase queries before anything can change on screen. Without a `loading.tsx` the router has
 * nothing to show in the meantime, so the old page just sits there and the button feels dead --
 * and Next can't prefetch a dynamic route at all. With this boundary the tap paints instantly
 * and the boundary itself is prefetched when the link comes into view.
 */
export default function DashboardLoading() {
  return (
    <>
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

        <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
          <div className="flex min-w-0 flex-col gap-3">
            <div className="flex items-center justify-between gap-3">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-9 w-28 rounded-lg" />
            </div>
            <Skeleton className="h-[400px] rounded-2xl lg:h-[500px]" />
          </div>
          <Skeleton className="h-[320px] rounded-2xl" />
        </div>
      </div>
    </>
  );
}
