import { Mascot, type MascotKind } from "@/components/icons/Mascot";

type SheepIllustrationProps = {
  className?: string;
  size?: number;
  /** A section's mascot (see Mascot.tsx); plain by default. */
  kind?: MascotKind;
};

export function SheepIllustration({ className, size = 112, kind = "plain" }: SheepIllustrationProps) {
  return <Mascot kind={kind} size={size} className={["text-primary", className].filter(Boolean).join(" ")} />;
}
