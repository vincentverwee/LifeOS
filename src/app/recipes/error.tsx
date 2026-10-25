"use client";

import { ErrorPanel } from "@/components/ErrorPanel";

export default function RecipesError(props: { error: Error & { digest?: string }; retry: () => void }) {
  return <ErrorPanel {...props} backHref="/" backLabel="Home" />;
}
