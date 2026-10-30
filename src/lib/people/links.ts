// Pure helpers for PersonLink: a pair is stored once with aId < bId, each side with its own label.

export type StoredLink = { id: string; aId: string; bId: string; aLabel: string | null; bLabel: string | null };

/** A link seen from one person's page. */
export type LinkView = {
  id: string;
  otherId: string;
  /** What the other person is to this one ("mum"). */
  otherIs: string | null;
  /** What this person is to the other ("daughter"). */
  selfIs: string | null;
};

/** The row to store for "other is self's `otherIs`, self is other's `selfIs`". */
export function orientLink(
  selfId: string,
  otherId: string,
  selfIs: string | null,
  otherIs: string | null
): Omit<StoredLink, "id"> {
  return selfId < otherId
    ? { aId: selfId, bId: otherId, aLabel: selfIs, bLabel: otherIs }
    : { aId: otherId, bId: selfId, aLabel: otherIs, bLabel: selfIs };
}

export function viewLink(link: StoredLink, selfId: string): LinkView {
  const selfIsA = link.aId === selfId;
  return {
    id: link.id,
    otherId: selfIsA ? link.bId : link.aId,
    otherIs: selfIsA ? link.bLabel : link.aLabel,
    selfIs: selfIsA ? link.aLabel : link.bLabel,
  };
}

/** Labels that read the same from both sides: picking one fills in the other side. */
const SYMMETRIC = [
  "friend",
  "best friend",
  "partner",
  "housemate",
  "classmate",
  "colleague",
  "cousin",
  "sibling",
  "neighbour",
  "teammate",
];

/** Suggestions for the label inputs. */
export const LINK_LABELS = [
  ...SYMMETRIC,
  "mum",
  "dad",
  "parent",
  "daughter",
  "son",
  "child",
  "sister",
  "brother",
  "girlfriend",
  "boyfriend",
  "wife",
  "husband",
  "grandma",
  "grandpa",
  "aunt",
  "uncle",
];

/** The other side's label when it can only be the same word; null otherwise. */
export function mirrorLabel(label: string): string | null {
  const word = label.trim().toLowerCase();
  return SYMMETRIC.includes(word) ? word : null;
}
