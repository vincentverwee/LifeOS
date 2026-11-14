"use client";

import dynamic from "next/dynamic";

// recharts loads after the page is interactive, like StudyChartsLazy.
const placeholder = (height: number) =>
  function ChartPlaceholder() {
    return <div aria-hidden="true" className="animate-pulse rounded-lg bg-surface-muted" style={{ height }} />;
  };

export const PintsCompareChart = dynamic(() => import("./BeerCharts").then((m) => m.PintsCompareChart), { ssr: false, loading: placeholder(250) });
export const PintsBarChart = dynamic(() => import("./BeerCharts").then((m) => m.PintsBarChart), { ssr: false, loading: placeholder(200) });
export const PriceChart = dynamic(() => import("./BeerCharts").then((m) => m.PriceChart), { ssr: false, loading: placeholder(180) });
