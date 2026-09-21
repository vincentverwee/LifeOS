import { SheepSpinner } from "@/components/icons/SheepSpinner";

export default function Loading() {
  return (
    <div className="flex min-h-[40vh] flex-col items-center justify-center gap-3">
      <SheepSpinner size={48} />
      <p className="text-sm text-ink-muted">Loading…</p>
    </div>
  );
}
