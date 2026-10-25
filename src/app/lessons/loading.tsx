import { SheepSpinner } from "@/components/icons/SheepSpinner";
import { SheepPhrase } from "@/components/icons/SheepPhrase";

// Shown inside the lessons layout (tabs stay put) while a lessons page loads.
export default function LessonsLoading() {
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
