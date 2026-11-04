import { Globe, Route, Navigation } from 'lucide-react';
import { StatsCard } from './StatsCard';
import { DashboardStats } from '@/lib/waypoint/types';

interface StatsGridProps {
  stats: DashboardStats;
  /** The page shows van trips: the cards say so. */
  van?: boolean;
}

export function StatsGrid({ stats, van = false }: StatsGridProps) {
  const cards = [
    {
      label: 'Countries',
      value: stats.countries_visited,
      icon: Globe,
      description: van ? 'Countries the van has been' : 'Unique countries visited',
    },
    {
      label: van ? 'Van trips' : 'Trips',
      value: stats.trips_count,
      icon: Route,
      description: van ? 'Trips in the van' : 'Road trips completed',
    },
    {
      label: van ? 'Van km' : 'Km Driven',
      value: stats.total_km.toLocaleString(),
      icon: Navigation,
      description: van ? 'Kilometres in the van' : 'Total kilometers on the road',
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
