import { Card, CardContent, CardHeader, CardTitle } from '@/components/waypoint/ui/card';
import { YearlyStats } from '@/lib/waypoint/stats';

interface YearlyKmChartProps {
  data: YearlyStats[];
}

/** Km per year; each bar is split into van (solid) and other (lighter) once any trip is in the van. */
export function YearlyKmChart({ data }: YearlyKmChartProps) {
  const maxKm = Math.max(...data.map((d) => d.totalKm), 1);
  const anyVan = data.some((d) => d.vanKm > 0);

  return (
    <Card className="border-border/50">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-3">
          <CardTitle className="text-base font-semibold">Km per Year</CardTitle>
          {anyVan && (
            <span className="flex items-center gap-3 text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <span aria-hidden="true" className="h-2 w-2 rounded-full bg-primary" />
                Van
              </span>
              <span className="flex items-center gap-1.5">
                <span aria-hidden="true" className="h-2 w-2 rounded-full bg-primary/35" />
                Other
              </span>
            </span>
          )}
        </div>
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
                  <span className="text-right font-mono tabular-nums">
                    {entry.totalKm.toLocaleString()} km
                    {entry.vanKm > 0 && (
                      <span className="block text-xs font-sans text-muted-foreground">
                        {entry.vanKm.toLocaleString()} by van
                      </span>
                    )}
                  </span>
                </div>
                <div
                  className="flex h-2 w-full overflow-hidden rounded-full bg-muted/40"
                  role="img"
                  aria-label={`${entry.totalKm} km, ${entry.vanKm} km by van`}
                >
                  <div className="h-full bg-primary" style={{ width: `${(entry.vanKm / maxKm) * 100}%` }} />
                  <div
                    className={anyVan ? 'h-full bg-primary/35' : 'h-full bg-primary'}
                    style={{ width: `${((entry.totalKm - entry.vanKm) / maxKm) * 100}%` }}
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
