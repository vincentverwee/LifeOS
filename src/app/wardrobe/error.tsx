"use client";

import { ErrorPanel } from "@/components/ErrorPanel";

export default function WardrobeError(props: { error: Error & { digest?: string }; retry: () => void }) {
  return <ErrorPanel {...props} backHref="/" backLabel="Home" />;
}
