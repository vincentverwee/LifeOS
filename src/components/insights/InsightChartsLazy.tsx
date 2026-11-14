"use client";

import dynamic from "next/dynamic";

// recharts loads after the page is interactive, like StudyChartsLazy.
const placeholder = (height: number) =>
  function ChartPlaceholder() {
    return <div aria-hidden="true" className="animate-pulse rounded-lg bg-surface-muted" style={{ height }} />;
  };

export const CompareChart = dynamic(() => import("./CompareChart").then((m) => m.CompareChart), { ssr: false, loading: placeholder(250) });
export const WeekdayChart = dynamic(() => import("./WeekdayChart").then((m) => m.WeekdayChart), { ssr: false, loading: placeholder(200) });
