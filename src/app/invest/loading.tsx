import { SheepSpinner } from "@/components/icons/SheepSpinner";
import { SheepPhrase } from "@/components/icons/SheepPhrase";

// Shown inside the investments layout (tabs stay put) while an investments page loads.
export default function InvestLoading() {
  return (
    <div role="status" aria-live="polite" className="flex min-h-[50vh] flex-col items-center justify-center gap-3">
      <SheepSpinner size={56} kind="invest" />
      <SheepPhrase kind="invest" />
    </div>
  );
}
