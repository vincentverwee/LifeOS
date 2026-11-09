"use client";

import { useEffect, useState, type ReactNode } from "react";

/** How long a first tap stays armed before the button quietly goes back. */
const ARMED_MS = 3000;

/**
 * The one way the app asks "are you sure?": the first tap turns the button red
 * ("Tap again to delete"), a second tap within 3 s does it. No browser dialogs
 * (they block the PWA and look foreign on iOS).
 *
 * - With `onConfirm` it's a plain button that calls it on the second tap.
 * - Without, it's a submit button: the first tap is held back, the second
 *   submits its form (a server action form with a hidden id, say).
 */
export function ConfirmButton({
  children,
  confirmLabel = "Tap again to delete",
  onConfirm,
  disabled,
  className = "min-h-11 px-4 text-sm",
  name,
  value,
  quiet = false,
  "aria-label": ariaLabel,
}: {
  children: ReactNode;
  /** What the armed button says; keep it short. */
  confirmLabel?: ReactNode;
  onConfirm?: () => void;
  disabled?: boolean;
  /** Size/layout classes; the colour comes from the state. */
  className?: string;
  name?: string;
  value?: string;
  /** Grey until armed: for small deletes inside lists, so rows aren't lined with red. */
  quiet?: boolean;
  "aria-label"?: string;
}) {
  const [armed, setArmed] = useState(false);

  useEffect(() => {
    if (!armed) return;
    const t = setTimeout(() => setArmed(false), ARMED_MS);
    return () => clearTimeout(t);
  }, [armed]);

  return (
    <button
      type={onConfirm ? "button" : "submit"}
      name={name}
      value={value}
      disabled={disabled}
      aria-live="polite"
      aria-label={armed ? undefined : ariaLabel}
      onClick={(e) => {
        if (!armed) {
          e.preventDefault();
          setArmed(true);
          return;
        }
        setArmed(false);
        onConfirm?.();
      }}
      onBlur={() => setArmed(false)}
      className={`btn ${armed ? "btn-destructive" : quiet ? "btn-ghost text-ink-muted hover:text-critical" : "btn-danger"} ${className}`}
    >
      {armed ? confirmLabel : children}
    </button>
  );
}
