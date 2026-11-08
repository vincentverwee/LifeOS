"use client";

import { useEffect, useState } from "react";
import { readColorMode, saveColorMode, type ColorMode } from "@/lib/colorMode";

const OPTIONS: { value: ColorMode; label: string }[] = [
  { value: "system", label: "System" },
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
];

/** Light / dark for this device (/settings → Appearance). */
export function AppearanceSettings() {
  const [mode, setMode] = useState<ColorMode | null>(null);

  // Read from <html> after mount (the server rendered it from the cookie).
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one read of the page's own attribute
    setMode(readColorMode());
  }, []);

  const pick = (value: ColorMode) => {
    setMode(value);
    saveColorMode(value);
  };

  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-lg font-semibold text-foreground">Appearance</h2>
      <p className="text-sm text-ink-muted">Light or dark on this device. System follows your phone.</p>
      <div className="flex gap-1 rounded-full bg-surface-muted p-1 sm:max-w-sm">
        {OPTIONS.map(({ value, label }) => (
          <button
            key={value}
            type="button"
            onClick={() => pick(value)}
            aria-pressed={mode === value}
            className={`btn flex min-h-11 flex-1 px-3 text-sm ${
              mode === value ? "bg-surface text-foreground shadow-sm" : "text-ink-muted hover:text-foreground"
            }`}
          >
            {label}
          </button>
        ))}
      </div>
    </section>
  );
}
