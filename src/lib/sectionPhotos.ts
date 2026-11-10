import type { SectionKind } from "@/lib/data/homeMoods";

/*
 * The stock photo behind each section's Home tile and, faintly, its page header
 * (public/photos/, credits in public/photos/CREDITS.md). Plain data so client
 * components (PageHeader inside a client page) can use it too. Remove an entry to
 * show no photo for that section.
 */
const SECTION_PHOTOS: Partial<Record<SectionKind, string>> = {
  diary: "/photos/diary.jpg",
  beer: "/photos/beer.jpg",
  people: "/photos/people.jpg",
  waypoint: "/photos/waypoint.jpg",
};

export const sectionPhoto = (kind: SectionKind): string | undefined => SECTION_PHOTOS[kind];
