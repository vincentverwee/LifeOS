import { Card, CardContent, CardHeader, CardTitle } from '@/components/waypoint/ui/card';
import { CountryStats } from '@/lib/waypoint/stats';

interface CountryBreakdownProps {
  data: CountryStats[];
}

export function CountryBreakdown({ data }: CountryBreakdownProps) {
  const maxVisits = Math.max(...data.map((d) => d.visits), 1);

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
          data.map((entry) => (
            <div
              key={entry.country}
              className="space-y-1"
              title={`${entry.country}: ${entry.visits} stop${entry.visits === 1 ? '' : 's'}`}
            >
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium">{entry.country}</span>
                <span className="text-xs text-muted-foreground">
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
          ))
        )}
      </CardContent>
    </Card>
  );
}
