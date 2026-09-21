import { Sheep } from "@/components/icons/Sheep";

type SheepMarkProps = {
  className?: string;
};

export function SheepMark({ className }: SheepMarkProps) {
  return <Sheep decorative className={className} />;
}
