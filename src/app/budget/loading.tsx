import { SheepSpinner } from "@/components/icons/SheepSpinner";
import { SheepPhrase } from "@/components/icons/SheepPhrase";

// Shown inside the budget layout (tabs stay put) while a budget page loads.
export default function BudgetLoading() {
  return (
    <div
      role="status"
      aria-live="polite"
      className="flex min-h-[50vh] flex-col items-center justify-center gap-3"
    >
      <SheepSpinner size={56} />
      <SheepPhrase />
    </div>
  );
}
