import { SheepSpinner } from "@/components/icons/SheepSpinner";
import { SheepPhrase } from "@/components/icons/SheepPhrase";

// Shown inside the workouts layout (tabs stay put) while a workouts page loads.
export default function WorkoutsLoading() {
  return (
    <div role="status" aria-live="polite" className="flex min-h-[50vh] flex-col items-center justify-center gap-3">
      <SheepSpinner size={56} kind="workouts" />
      <SheepPhrase kind="workouts" />
    </div>
  );
}
