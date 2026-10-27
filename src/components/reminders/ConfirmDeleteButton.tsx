"use client";

/** Asks first, like the other deletes in the app; one stray tap shouldn't lose anything. */
export function ConfirmDeleteButton({
  action,
  id,
  title,
  label,
}: {
  action: (formData: FormData) => Promise<void>;
  id: string;
  title: string;
  label: string;
}) {
  return (
    <form
      action={action}
      onSubmit={(e) => {
        if (!window.confirm(`Delete "${title}"? This can't be undone.`)) e.preventDefault();
      }}
    >
      <input type="hidden" name="id" value={id} />
      <button type="submit" className="btn btn-danger flex min-h-11 w-full px-4 text-sm">
        {label}
      </button>
    </form>
  );
}
