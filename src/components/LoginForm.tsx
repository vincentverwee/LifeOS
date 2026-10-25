"use client";

import { useActionState } from "react";
import { login, type LoginState } from "@/lib/actions/auth";

export function LoginForm({ next }: { next: string }) {
  const [state, action, pending] = useActionState<LoginState, FormData>(login, null);

  return (
    <form action={action} className="flex flex-col gap-3">
      <input type="hidden" name="next" value={next} />
      <label className="flex flex-col gap-1.5 text-sm text-ink-muted">
        Password
        <input
          type="password"
          name="password"
          required
          autoFocus
          autoComplete="current-password"
          className="rounded-lg border border-border bg-surface px-3 py-2.5 text-foreground"
        />
      </label>
      {state?.error && <p className="text-sm text-critical">{state.error}</p>}
      <button type="submit" disabled={pending} className="btn btn-primary py-3">
        {pending ? "Checking…" : "Log in"}
      </button>
    </form>
  );
}
