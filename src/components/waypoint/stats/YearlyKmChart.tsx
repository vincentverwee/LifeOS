import { Card, CardContent, CardHeader, CardTitle } from '@/components/waypoint/ui/card';
import { YearlyStats } from '@/lib/waypoint/stats';

interface YearlyKmChartProps {
  data: YearlyStats[];
}

export function YearlyKmChart({ data }: YearlyKmChartProps) {
  const maxKm = Math.max(...data.map((d) => d.totalKm), 1);

  return (
    <Card className="border-border/50">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold">Km per Year</CardTitle>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            Add start dates to your trips to see yearly totals
          </p>
        ) : (
          // Horizontal bars: any number of years fits a phone, and the values are always visible.
          <ul className="space-y-3">
            {data.map((entry) => (
              <li key={entry.year} className="space-y-1">
                <div className="flex items-baseline justify-between gap-3 text-sm">
                  <span className="font-medium">
                    {entry.year}
                    <span className="ml-1.5 font-normal text-muted-foreground">
                      · {entry.tripsCount} trip{entry.tripsCount === 1 ? '' : 's'}
                    </span>
                  </span>
                  <span className="font-mono tabular-nums">{entry.totalKm.toLocaleString()} km</span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-muted/40">
                  <div
                    className="h-full rounded-full bg-primary"
                    style={{ width: `${(entry.totalKm / maxKm) * 100}%` }}
                  />
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
