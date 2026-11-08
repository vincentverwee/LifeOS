import { CatHead } from "@/components/icons/Cat";
import { SheepHead } from "@/components/icons/Sheep";
import { catEyes, sheepEyes } from "@/components/icons/mascotMoods";
import { MascotProp, type MascotAnimal, type MascotKind } from "@/components/icons/mascotProps";
import { THEME } from "@/lib/theme";

export type { MascotAnimal, MascotKind } from "@/components/icons/mascotProps";

type MascotProps = {
  /** Which section's prop to add; "plain" is exactly the <Sheep> mark. */
  kind?: MascotKind;
  className?: string;
  /** Rendered size in px (square). */
  size?: number;
  animate?: boolean;
  decorative?: boolean;
  /** Defaults to the build's theme; /mascots overrides it to show both. */
  animal?: MascotAnimal;
};

/**
 * A section's mascot: the sheep (or cat) with a prop and a tiny mood in its eyes (mascotMoods.ts) — a pint for Beer, a chef
 * hat for Recipes… Same two tones as the logo. With a prop the drawing gets a
 * wider canvas so hats and things held in front fit. Tweak on /mascots.
 */
export function Mascot({ kind = "plain", className, size = 100, animate, decorative, animal = THEME }: MascotProps) {
  const classes = [animate ? "animate-sheep-spin" : "", className].filter(Boolean).join(" ") || undefined;
  const label = animal === "cat" ? "Cat" : "Sheep";
  return (
    <svg
      viewBox={kind === "plain" ? "8 0 84 84" : "-2 -12 104 104"}
      width={size}
      height={size}
      {...(decorative ? { "aria-hidden": "true" } : { role: "img", "aria-label": label })}
      className={classes}
    >
      {animal === "cat" ? <CatHead eyes={catEyes(kind)} /> : <SheepHead eyes={sheepEyes(kind)} />}
      <MascotProp kind={kind} animal={animal} />
    </svg>
  );
}
