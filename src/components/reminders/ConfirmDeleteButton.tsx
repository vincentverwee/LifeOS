"use client";

import { ConfirmButton } from "@/components/ui/ConfirmButton";

/** A full-width delete for a server-action form: tap, then tap again (see ConfirmButton). */
export function ConfirmDeleteButton({
  action,
  id,
  label,
}: {
  action: (formData: FormData) => Promise<void>;
  id: string;
  /** Kept for callers; the armed button says what it does instead of a dialog naming it. */
  title?: string;
  label: string;
}) {
  return (
    <form action={action}>
      <input type="hidden" name="id" value={id} />
      <ConfirmButton className="flex min-h-11 w-full px-4 text-sm">{label}</ConfirmButton>
    </form>
  );
}
