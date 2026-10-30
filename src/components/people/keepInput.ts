import { startTransition, type FormEvent } from "react";

/**
 * `onSubmit` for a form backed by `useActionState`. React resets a `<form action={…}>` after
 * every submit, even when the action returns an error, wiping what was typed; submitting by
 * hand keeps the fields. Forms that should clear after a save bump their `key` instead.
 * Read `pending` from `useActionState` (useFormStatus doesn't see these submits).
 */
export function keepInput(formAction: (formData: FormData) => void) {
  return (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget, (e.nativeEvent as SubmitEvent).submitter);
    startTransition(() => formAction(formData));
  };
}
