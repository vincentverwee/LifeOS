"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Play } from "lucide-react";
import { startWorkout } from "@/lib/actions/workouts";
import { askSessionNotificationPermission, showSessionNotification } from "@/lib/workouts/sessionNotification";
import { ActivityDot } from "@/components/workouts/ui";
import type { Activity, TemplateView } from "@/lib/workouts/types";

const FAILED = "Couldn't start it. Check your connection and try again.";

/** Start a live session: from a template (sets filled in from last time) or free, per activity. */
export function StartPanel({ templates, activities }: { templates: TemplateView[]; activities: Activity[] }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function start(activityId: string, templateId?: string) {
    setError(null);
    // Ask before any await: iOS only prompts inside the tap.
    const allowed = askSessionNotificationPermission();
    const name = activities.find((a) => a.id === activityId)?.name ?? "Workout";
    startTransition(async () => {
      try {
        const r = await startWorkout({ activityId, templateId });
        if (r.ok) {
          if (await allowed) void showSessionNotification(name, new Date());
          router.push("/workouts/session");
        }
        else setError(r.error);
      } catch {
        setError(FAILED);
      }
    });
  }

  return (
    <div className="flex flex-col gap-3">
      {templates.length > 0 && (
        <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {templates.map((t) => (
            <li key={t.id}>
              <button
                type="button"
                disabled={pending}
                onClick={() => start(t.activity.id, t.id)}
                className="tap flex w-full items-center gap-3 card p-3 text-left hover:border-primary disabled:opacity-60"
              >
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
                  <Play size={18} aria-hidden="true" />
                </span>
                <span className="flex min-w-0 flex-col">
                  <span className="truncate font-medium text-foreground">{t.name}</span>
                  <span className="truncate text-sm text-ink-muted">
                    {t.exercises.length > 0
                      ? `${t.exercises.length} ${t.exercises.length === 1 ? "exercise" : "exercises"} · ${t.exercises.reduce((n, e) => n + e.sets, 0)} sets`
                      : t.activity.name}
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
      <div>
        <p className="mb-2 text-sm text-ink-muted">{templates.length > 0 ? "Or a free session" : "Start a session"}</p>
        <div className="flex flex-wrap gap-2">
          {activities
            .filter((a) => !a.isArchived)
            .map((a) => (
              <button
                key={a.id}
                type="button"
                disabled={pending}
                onClick={() => start(a.id)}
                className="btn btn-outline inline-flex min-h-11 gap-2 px-4 text-sm"
              >
                <ActivityDot activity={a} />
                {a.name}
              </button>
            ))}
        </div>
      </div>
      {error && (
        <p role="alert" className="text-sm text-critical">
          {error}
        </p>
      )}
    </div>
  );
}
