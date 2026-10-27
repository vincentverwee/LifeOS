"use client";

import { deleteReminder } from "@/lib/actions/reminders";

/** Asks first, like the other deletes in the app; one stray tap shouldn't lose a reminder. */
export function DeleteReminderButton({ id, title }: { id: string; title: string }) {
  return (
    <form
      action={deleteReminder}
      onSubmit={(e) => {
        if (!window.confirm(`Delete "${title}"? This can't be undone.`)) e.preventDefault();
      }}
    >
      <input type="hidden" name="id" value={id} />
      <button type="submit" className="btn btn-danger flex min-h-11 w-full px-4 text-sm">
        Delete reminder
      </button>
    </form>
  );
}
