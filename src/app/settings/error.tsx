"use client";

import { ErrorPanel } from "@/components/ErrorPanel";

export default function SettingsError(props: { error: Error & { digest?: string }; retry: () => void }) {
  return <ErrorPanel {...props} backHref="/" backLabel="Home" />;
}
