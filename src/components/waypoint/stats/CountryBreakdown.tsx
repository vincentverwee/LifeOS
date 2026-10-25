import { Card, CardContent, CardHeader, CardTitle } from '@/components/waypoint/ui/card';
import { CountryStats } from '@/lib/waypoint/stats';

interface CountryBreakdownProps {
  data: CountryStats[];
}

/** Countries shown before "Show all". */
const SHOWN = 8;

export function CountryBreakdown({ data }: CountryBreakdownProps) {
  const maxVisits = Math.max(...data.map((d) => d.visits), 1);
  const row = (entry: CountryStats) => (
    <div key={entry.country} className="space-y-1">
      <div className="flex items-center justify-between gap-3 text-sm">
        <span className="min-w-0 truncate font-medium">{entry.country}</span>
        <span className="shrink-0 text-muted-foreground">
          {entry.visits} stop{entry.visits === 1 ? '' : 's'}
        </span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-muted/40">
        <div
          className="h-full rounded-full bg-primary"
          style={{ width: `${(entry.visits / maxVisits) * 100}%` }}
        />
      </div>
    </div>
  );

  return (
    <Card className="border-border/50">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold">Countries</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {data.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            No countries recorded yet
          </p>
        ) : (
          <>
            {data.slice(0, SHOWN).map(row)}
            {data.length > SHOWN && (
              <details className="group space-y-3">
                <summary className="btn btn-ghost -mx-3 inline-flex min-h-11 cursor-pointer list-none px-3 text-sm [&::-webkit-details-marker]:hidden">
                  <span className="group-open:hidden">Show all {data.length}</span>
                  <span className="hidden group-open:inline">Show fewer</span>
                </summary>
                {data.slice(SHOWN).map(row)}
              </details>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
