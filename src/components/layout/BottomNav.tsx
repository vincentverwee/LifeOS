'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Map, LayoutDashboard, Route, BarChart3 } from 'lucide-react';
import { cn } from '@/lib/utils';

const navItems = [
  { href: '/', label: 'Home', icon: LayoutDashboard },
  { href: '/trips', label: 'Trips', icon: Route },
  { href: '/map', label: 'Map', icon: Map },
  { href: '/stats', label: 'Stats', icon: BarChart3 },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed inset-x-0 bottom-0 z-50 border-t border-border bg-card/80 backdrop-blur-xl lg:hidden">
      <div
        className="flex items-center justify-around px-2"
        style={{ paddingBottom: 'env(safe-area-inset-bottom, 8px)' }}
      >
        {navItems.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={cn(
              // `active:` gives the tap instant feedback: a touch screen has no hover, so
              // without it the nav item looks dead until the next page paints.
              'flex touch-manipulation select-none flex-col items-center gap-1 rounded-xl px-3 py-3 text-xs font-medium transition-colors duration-100 active:bg-accent active:text-foreground',
              pathname === href ? 'text-primary' : 'text-muted-foreground'
            )}
          >
            <Icon size={22} />
            {label}
          </Link>
        ))}
      </div>
    </nav>
  );
}
