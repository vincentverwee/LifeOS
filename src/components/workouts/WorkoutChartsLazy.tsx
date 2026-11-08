"use client";

import dynamic from "next/dynamic";

// recharts loads after the page is interactive, like StudyChartsLazy.
const placeholder = (height: number) =>
  function ChartPlaceholder() {
    return <div aria-hidden="true" className="animate-pulse rounded-lg bg-surface-muted" style={{ height }} />;
  };

export const WeeksChart = dynamic(() => import("./WorkoutCharts").then((m) => m.WeeksChart), { ssr: false, loading: placeholder(200) });
export const TrendChart = dynamic(() => import("./WorkoutCharts").then((m) => m.TrendChart), { ssr: false, loading: placeholder(160) });
