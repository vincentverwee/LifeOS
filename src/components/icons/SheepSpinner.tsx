import { Mascot, type MascotKind } from "@/components/icons/Mascot";

type SheepSpinnerProps = {
  className?: string;
  size?: number;
  /** A section's mascot (see Mascot.tsx); plain by default. */
  kind?: MascotKind;
};

export function SheepSpinner({ className, size = 40, kind = "plain" }: SheepSpinnerProps) {
  return (
    <Mascot kind={kind} size={size} animate className={["text-primary", className].filter(Boolean).join(" ")} />
  );
}
