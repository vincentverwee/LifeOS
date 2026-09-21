import { Sheep } from "@/components/icons/Sheep";

type SheepIllustrationProps = {
  className?: string;
  width?: number;
  height?: number;
};

export function SheepIllustration({
  className,
  width = 140,
  height = 112,
}: SheepIllustrationProps) {
  return (
    <Sheep width={width} height={height} className={["text-primary", className].filter(Boolean).join(" ")} />
  );
}
