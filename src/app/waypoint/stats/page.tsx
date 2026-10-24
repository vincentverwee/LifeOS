import { connection } from 'next/server';
import { StatsGrid } from '@/components/waypoint/dashboard/StatsGrid';
import { YearlyKmChart } from '@/components/waypoint/stats/YearlyKmChart';
import { CountryBreakdown } from '@/components/waypoint/stats/CountryBreakdown';
import { TripBreakdown } from '@/components/waypoint/stats/TripBreakdown';
import { Badge } from '@/components/waypoint/ui/badge';
import { getAllTripSummaries, getAllLocations } from '@/lib/data/waypoint';
import { getDashboardStats } from '@/lib/waypoint/stats';
import { getYearlyStats, getCountryStats, getTripBreakdown } from '@/lib/waypoint/stats';
import { BarChart3, Trophy } from 'lucide-react';

export default async function StatsPage() {
  await connection();
  const [trips, locations] = await Promise.all([getAllTripSummaries(), getAllLocations()]);
  const stats = getDashboardStats(trips, locations);

  return (
    <>
      <div className="mx-auto max-w-7xl space-y-6">
        <div>
          <h2 className="text-2xl font-semibold text-foreground">Statistics</h2>
          <p className="mt-1 text-sm text-muted-foreground">Deep dive into your travel data</p>
        </div>

        {trips.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border py-24 text-center">
            <BarChart3 size={48} className="mb-4 text-muted-foreground/40" />
            <p className="font-medium text-muted-foreground">No stats yet</p>
            <p className="mt-1 text-sm text-muted-foreground/60">
              Add a trip to start seeing your travel stats
            </p>
          </div>
        ) : (
          <>
            <div className="space-y-3">
              <StatsGrid stats={stats} />
              {stats.longest_trip_title && (
                <Badge variant="secondary" className="gap-1.5 text-xs font-normal">
                  <Trophy size={12} />
                  Longest trip: {stats.longest_trip_title} ·{' '}
                  {stats.longest_trip_km.toLocaleString()} km
                </Badge>
              )}
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
              <YearlyKmChart data={getYearlyStats(trips)} />
              <CountryBreakdown data={getCountryStats(locations)} />
            </div>

            <TripBreakdown data={getTripBreakdown(trips, locations)} />
          </>
        )}
      </div>
    </>
  );
}
