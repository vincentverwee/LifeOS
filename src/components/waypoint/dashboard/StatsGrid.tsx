import { Globe, Route, Navigation } from 'lucide-react';
import { StatsCard } from './StatsCard';
import { DashboardStats } from '@/lib/waypoint/types';

interface StatsGridProps {
  stats: DashboardStats;
}

export function StatsGrid({ stats }: StatsGridProps) {
  const cards = [
    {
      label: 'Countries',
      value: stats.countries_visited,
      icon: Globe,
      description: 'Unique countries visited',
    },
    {
      label: 'Trips',
      value: stats.trips_count,
      icon: Route,
      description: 'Road trips completed',
    },
    {
      label: 'Km Driven',
      value: stats.total_km.toLocaleString(),
      icon: Navigation,
      description: 'Total kilometers on the road',
    },
  ];

  return (
    <div className="grid grid-cols-3 gap-2 sm:gap-4">
      {cards.map((card, i) => (
        <StatsCard key={card.label} {...card} index={i} />
      ))}
    </div>
  );
}
