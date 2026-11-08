import type { MascotAnimal, MascotKind } from "@/components/icons/mascotProps";

type SectionKind = Exclude<MascotKind, "plain">;

/** Each section mascot's name, per animal (the cat build gets its own puns). */
export const MASCOT_NAMES: Record<SectionKind, Record<MascotAnimal, string>> = {
  budget: { sheep: "Penny", cat: "Penny" },
  lessons: { sheep: "Professor Woolsworth", cat: "Professor Whiskers" },
  reminders: { sheep: "Tilly", cat: "Tilly" },
  diary: { sheep: "Poppy", cat: "Poppy" },
  beer: { sheep: "Hops", cat: "Hops" },
  wardrobe: { sheep: "Woolly", cat: "Mittens" },
  people: { sheep: "Dolly", cat: "Dolly" },
  waypoint: { sheep: "Ewe-lysses", cat: "Marco Purrlo" },
  recipes: { sheep: "Chef Baa-tista", cat: "Chef Purrcy" },
};

/** What each mascot is busy with while its section loads; `{name}` is filled in. */
export const MASCOT_LINES: Record<SectionKind, string[]> = {
  budget: [
    "{name} is counting coins…",
    "{name} is checking the receipts…",
    "{name} is balancing the books…",
    "{name} is hunting for a bargain…",
    "{name} is adding it all up…",
  ],
  lessons: [
    "{name} is sharpening pencils…",
    "{name} is adding up your hours…",
    "{name} is looking for the syllabus…",
    "{name} is cramming for you…",
    "{name} is polishing the glasses…",
  ],
  reminders: [
    "{name} is ticking boxes…",
    "{name} is checking the list twice…",
    "{name} is looking for a pen…",
    "{name} never forgets…",
    "{name} is sorting the to-dos…",
  ],
  diary: [
    "{name} is turning the pages…",
    "{name} is finding today's page…",
    "{name} is remembering…",
    "{name} is daydreaming…",
    "{name} is reading between the lines…",
  ],
  beer: [
    "{name} is pouring a pint…",
    "{name} is waiting for the head to settle…",
    "{name} is getting a round in…",
    "{name} is counting the pints…",
    "{name} is finding the pub…",
  ],
  wardrobe: [
    "{name} is folding the laundry…",
    "{name} is looking for the other sock…",
    "{name} is pulling on a beanie…",
    "{name} is checking the drying rack…",
    "{name} is picking an outfit…",
  ],
  people: [
    "{name} is checking the address book…",
    "{name} is remembering birthdays…",
    "{name} is wrapping a present…",
    "{name} is saying hello to everyone…",
    "{name} is blowing up balloons…",
  ],
  waypoint: [
    "{name} is unfolding the map…",
    "{name} is checking the van's tyres…",
    "{name} is plotting the route…",
    "{name} is looking for a campsite…",
    "{name} is counting the kilometres…",
  ],
  recipes: [
    "{name} is preheating the oven…",
    "{name} is chopping onions…",
    "{name} is tasting the sauce…",
    "{name} is flipping through cookbooks…",
    "{name} is raiding the fridge…",
  ],
};

export function mascotName(kind: SectionKind, animal: MascotAnimal): string {
  return MASCOT_NAMES[kind][animal];
}

/** A section mascot's loading lines with its name filled in. */
export function mascotLines(kind: SectionKind, animal: MascotAnimal): string[] {
  const name = mascotName(kind, animal);
  return MASCOT_LINES[kind].map((line) => line.replace("{name}", name));
}
