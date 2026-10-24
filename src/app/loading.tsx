import { SheepSpinner } from "@/components/icons/SheepSpinner";
import { SheepPhrase } from "@/components/icons/SheepPhrase";

export default function Loading() {
  return (
    <div role="status" aria-live="polite" className="flex min-h-[40vh] flex-col items-center justify-center gap-3">
      <SheepSpinner size={56} />
      <SheepPhrase />
    </div>
  );
}
