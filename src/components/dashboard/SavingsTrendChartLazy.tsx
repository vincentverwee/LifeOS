"use client";

import dynamic from "next/dynamic";

// recharts loads after the page is interactive, like StudyChartsLazy.
export const SavingsTrendChart = dynamic(() => import("./SavingsTrendChart").then((m) => m.SavingsTrendChart), {
  ssr: false,
  loading: () => <div aria-hidden="true" className="animate-pulse rounded-lg bg-surface-muted" style={{ height: 200 }} />,
});
