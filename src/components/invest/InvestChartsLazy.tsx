"use client";

import dynamic from "next/dynamic";

// recharts loads after the page is interactive, like WorkoutChartsLazy.
const placeholder = (height: number) =>
  function ChartPlaceholder() {
    return <div aria-hidden="true" className="animate-pulse rounded-lg bg-surface-muted" style={{ height }} />;
  };

export const ValueChart = dynamic(() => import("./InvestCharts").then((m) => m.ValueChart), { ssr: false, loading: placeholder(220) });
export const DepositsChart = dynamic(() => import("./InvestCharts").then((m) => m.DepositsChart), { ssr: false, loading: placeholder(180) });
