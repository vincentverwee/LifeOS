import { Card, CardContent } from '@/components/waypoint/ui/card';

interface StatsCardProps {
  label: string;
  value: string | number;
  description?: string;
}

export function StatsCard({ label, value, description }: StatsCardProps) {
  return (
    // Phones: three compact numbers in one row; the description joins from sm up.
    <Card className="h-full">
      <CardContent className="space-y-1 p-3 sm:p-4">
        <p className="truncate text-xs text-ink-muted sm:text-sm">{label}</p>
        <p className="text-xl font-semibold tabular-nums text-foreground sm:text-2xl">{value}</p>
        {description && <p className="hidden text-xs text-ink-muted sm:block">{description}</p>}
      </CardContent>
    </Card>
  );
}
