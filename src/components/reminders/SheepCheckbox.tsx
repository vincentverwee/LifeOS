"use client";

import { Sheep } from "@/components/icons/Sheep";

/** The tick box on /reminders: a faded grey sheep that turns into the full green mark once done. */
export function SheepCheckbox({
  checked,
  label,
  onChange,
  disabled,
  submit,
}: {
  checked: boolean;
  /** What gets ticked off, for screen readers. */
  label: string;
  onChange?: () => void;
  disabled?: boolean;
  /** Submits the surrounding form instead of calling `onChange`. */
  submit?: boolean;
}) {
  return (
    <button
      type={submit ? "submit" : "button"}
      role="checkbox"
      aria-checked={checked}
      aria-label={`Done: ${label}`}
      onClick={onChange}
      disabled={disabled}
      className={`flex h-11 w-11 shrink-0 touch-manipulation items-center justify-center rounded-xl border-2 transition-[background-color,border-color,transform] duration-150 select-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring active:scale-90 motion-reduce:transition-none motion-reduce:active:scale-100 ${
        checked
          ? "border-primary bg-surface-muted text-primary"
          : "border-ink-muted/70 bg-surface text-ink-muted [@media(hover:hover)]:hover:border-primary"
      }`}
    >
      <Sheep
        decorative
        size={30}
        className={`transition-opacity duration-150 motion-reduce:transition-none ${checked ? "opacity-100" : "opacity-35"}`}
      />
    </button>
  );
}
