"use client";

import { ErrorPanel } from "@/components/ErrorPanel";

export default function BudgetError(props: { error: Error & { digest?: string }; retry: () => void }) {
  return <ErrorPanel {...props} backHref="/" backLabel="Home" />;
}
