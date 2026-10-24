import { SheepSpinner } from '@/components/icons/SheepSpinner';

// Shown inside the Waypoint layout (tabs stay put) while a Waypoint page loads, same as Budget.
export default function WaypointLoading() {
  return (
    <div
      role="status"
      aria-live="polite"
      className="flex min-h-[50vh] flex-col items-center justify-center gap-3"
    >
      <SheepSpinner size={56} />
      <p className="text-sm text-ink-muted">Counting sheep…</p>
    </div>
  );
}
