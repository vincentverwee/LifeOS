import { Sheep } from "@/components/icons/Sheep";

type SheepIllustrationProps = {
  className?: string;
  size?: number;
};

export function SheepIllustration({ className, size = 112 }: SheepIllustrationProps) {
  return <Sheep size={size} className={["text-primary", className].filter(Boolean).join(" ")} />;
}
