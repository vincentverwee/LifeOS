import { Card, CardContent } from '@/components/waypoint/ui/card';
import { LucideIcon } from 'lucide-react';

interface StatsCardProps {
  label: string;
  value: string | number;
  icon: LucideIcon;
  description?: string;
  index: number;
}

export function StatsCard({ label, value, icon: Icon, description, index }: StatsCardProps) {
  return (
    // CSS keyframes rather than Framer Motion: no animation library on the dashboard's critical
    // path, and the stagger is tightened (40ms/card, was 80ms) so the grid is fully readable in
    // ~0.4s instead of ~0.65s.
    <div className="animate-rise" style={{ animationDelay: `${index * 40}ms` }}>
      {/* Phones: three compact numbers in one row; the description and icon join from sm up. */}
      <Card className="h-full border-border/50 shadow-sm">
        <CardContent className="p-3 sm:p-5">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 space-y-1">
              <p className="truncate text-xs text-muted-foreground sm:text-sm">{label}</p>
              <p className="font-mono text-xl font-semibold tabular-nums text-foreground sm:text-3xl">{value}</p>
              {description && <p className="hidden text-xs text-muted-foreground sm:block">{description}</p>}
            </div>
            <div className="hidden rounded-xl bg-primary/10 p-2.5 sm:block">
              <Icon size={20} className="text-primary" />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
