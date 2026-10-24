import { NewTripForm } from "@/components/settings/NewTripForm";

export default function SettingsPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Settings</h1>
        <p className="mt-1 text-sm text-ink-muted">
          Months are created automatically. Add a trip when you want a separate budget for it.
        </p>
      </div>
      <NewTripForm />
    </div>
  );
}
