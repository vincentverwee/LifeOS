import { cn } from '@/lib/utils';

/** Grey pulsing placeholder block. Used by the route-level `loading.tsx` boundaries. */
export function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('animate-pulse rounded-xl bg-muted', className)} {...props} />;
}
