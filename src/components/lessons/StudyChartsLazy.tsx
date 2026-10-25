"use client";

import dynamic from "next/dynamic";

// recharts is the heaviest thing on /lessons/insights: load it after the page
// is interactive. The charts measure their container anyway, so nothing is lost
// by not rendering them on the server.
const placeholder = (height: number) =>
  function ChartPlaceholder() {
    return <div aria-hidden="true" className="animate-pulse rounded-lg bg-surface-muted" style={{ height }} />;
  };

export const CountdownChart = dynamic(() => import("./StudyCharts").then((m) => m.CountdownChart), {
  ssr: false,
  loading: placeholder(280),
});
export const WeeklyChart = dynamic(() => import("./StudyCharts").then((m) => m.WeeklyChart), {
  ssr: false,
  loading: placeholder(200),
});
export const StudyWeekdayChart = dynamic(() => import("./StudyCharts").then((m) => m.StudyWeekdayChart), {
  ssr: false,
  loading: placeholder(200),
});
