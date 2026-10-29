// Which OpenStreetMap places can be "the pub" of a beer. Plenty of places that pour pints
// aren't tagged pub or bar (airport and hotel bars, gastropubs tagged restaurant, stadiums),
// so both lookups take more, with real drinking places ranked first.

/** Tagged as a place to drink: ranked first. */
const DRINKING = new Set(["pub", "bar", "biergarten", "nightclub"]);

/** What Nearby asks Overpass for, by key (value regexes). */
export const NEARBY_TAGS: Record<string, string> = {
  amenity: "^(pub|bar|biergarten|nightclub|restaurant|cafe)$",
  tourism: "^(hotel|hostel)$",
};

/** Keys a name search accepts (any value but the street furniture below). */
const SEARCH_CLASSES = new Set(["amenity", "tourism", "leisure"]);
const NOT_VENUES = new Set([
  "parking", "parking_entrance", "parking_space", "bicycle_parking", "bench", "toilets", "atm",
  "post_box", "waste_basket", "waste_disposal", "recycling", "vending_machine", "charging_station",
  "drinking_water", "telephone", "shelter", "picnic_table", "playground", "pitch", "track",
  "artwork", "information", "viewpoint", "picnic_site",
]);

const LABELS: Record<string, string> = {
  pub: "Pub",
  bar: "Bar",
  biergarten: "Beer garden",
  nightclub: "Club",
  restaurant: "Restaurant",
  cafe: "Café",
  fast_food: "Fast food",
  hotel: "Hotel",
  hostel: "Hostel",
  stadium: "Stadium",
  events_venue: "Venue",
  arts_centre: "Arts centre",
};

/** 0 for a pub/bar/beer garden/club, 1 for anything else: sort key. */
export function venueRank(type: string): number {
  return DRINKING.has(type) ? 0 : 1;
}

/** "Pub", "Restaurant", "Golf course" */
export function venueLabel(type: string): string {
  return LABELS[type] ?? (type.charAt(0).toUpperCase() + type.slice(1)).replace(/_/g, " ");
}

/** Whether a name-search result (Nominatim class/type) can be a place a beer was bought. */
export function isVenue(osmClass: string | undefined, type: string | undefined): boolean {
  return !!osmClass && !!type && SEARCH_CLASSES.has(osmClass) && !NOT_VENUES.has(type);
}

/** The venue type of an Overpass element's tags (the key Nearby matched it on). */
export function venueType(tags: Record<string, string>): string {
  return tags.amenity ?? tags.tourism ?? tags.leisure ?? "";
}
