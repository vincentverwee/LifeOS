import { Card, CardContent } from '@/components/ui/card';
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
      <Card className="border-border/50 shadow-sm transition-shadow hover:shadow-md">
        <CardContent className="p-5">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">{label}</p>
              <p className="text-3xl font-bold tracking-tight">{value}</p>
              {description && <p className="text-xs text-muted-foreground">{description}</p>}
            </div>
            <div className="rounded-xl bg-primary/10 p-2.5">
              <Icon size={20} className="text-primary" />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
