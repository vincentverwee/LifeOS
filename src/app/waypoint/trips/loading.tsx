import { Skeleton } from '@/components/waypoint/ui/skeleton';

/** Shown while the router fetches this route, so a nav tap paints immediately. */
export default function TripsLoading() {
  return (
    <>
      <div className="mx-auto max-w-3xl space-y-6">
        <div className="flex items-center justify-between">
      <div className="space-y-2">
        <Skeleton className="h-8 w-44" />
        <Skeleton className="h-4 w-64" />
      </div>
          <Skeleton className="h-10 w-28 rounded-xl" />
        </div>
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-[104px] rounded-2xl" />
          ))}
        </div>
      </div>
    </>
  );
}
