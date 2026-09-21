import { Sheep } from "@/components/icons/Sheep";

type SheepSpinnerProps = {
  className?: string;
  size?: number;
};

export function SheepSpinner({ className, size = 40 }: SheepSpinnerProps) {
  return (
    <Sheep
      width={size}
      height={(size * 80) / 100}
      animate
      className={["text-primary", className].filter(Boolean).join(" ")}
    />
  );
}
