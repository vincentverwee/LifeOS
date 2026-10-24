import { Sheep } from "@/components/icons/Sheep";

type SheepSpinnerProps = {
  className?: string;
  size?: number;
};

export function SheepSpinner({ className, size = 40 }: SheepSpinnerProps) {
  return (
    <Sheep size={size} animate className={["text-primary", className].filter(Boolean).join(" ")} />
  );
}
