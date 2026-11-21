"use client";

import type { PartnerStudy } from "@/lib/data/partner";
import { formatElapsed, useNowSeconds } from "@/components/lessons/useNowSeconds";

/** "📚 Louise is studying FIN · 0:42", ticking. */
export function PartnerStudyingBadge({ study }: { study: PartnerStudy }) {
  const now = useNowSeconds();
  const elapsed = now === null ? null : now - new Date(study.startedAt).getTime() / 1000;
  const names = study.courses.join(", ");
  return (
    <p className="text-sm font-medium text-ink-muted">
      <span aria-hidden="true">📚 </span>
      {study.name} is studying{names ? ` ${names}` : ""}
      <span className="font-mono tabular-nums"> · {elapsed === null ? "–:––" : formatElapsed(elapsed, false)}</span>
    </p>
  );
}
