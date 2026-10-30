// Pure helpers around "who are they to you" (Person.relationToMe): group colours,
// family levels for the web, and the links the app can suggest from them.

const TAGS = ["blue", "orange", "aqua", "magenta", "yellow", "violet", "green", "red"] as const;

/** A group's colour: its place in the A–Z group list, so it's the same on every page. */
export function groupColor(group: string | null, groups: string[]): string {
  if (!group) return "var(--color-ink-muted)";
  const i = groups.indexOf(group);
  return `var(--color-tag-${TAGS[(i < 0 ? 0 : i) % TAGS.length]})`;
}

const PARENT = ["mum", "mom", "mother", "mama", "dad", "father", "papa", "parent"];
const SIBLING = ["brother", "sister", "sibling"];
const CHILD = ["son", "daughter", "child"];
const GRANDPARENT = ["grandma", "grandpa", "grandmother", "grandfather", "grandparent", "oma", "opa"];
const GRANDCHILD = ["grandson", "granddaughter", "grandchild"];

type Role = "parent" | "sibling" | "child" | "grandparent" | "grandchild";

function roleOf(label: string | null): Role | null {
  const word = label?.trim().toLowerCase() ?? "";
  if (PARENT.includes(word)) return "parent";
  if (SIBLING.includes(word)) return "sibling";
  if (CHILD.includes(word)) return "child";
  if (GRANDPARENT.includes(word)) return "grandparent";
  if (GRANDCHILD.includes(word)) return "grandchild";
  return null;
}

/** Rows up (−) or down (+) from you in the web: parents above, children below; null = no family role. */
export function familyLevel(relationToMe: string | null): number | null {
  const role = roleOf(relationToMe);
  if (role === "grandparent") return -2;
  if (role === "parent") return -1;
  if (role === "sibling") return 0;
  if (role === "child") return 1;
  if (role === "grandchild") return 2;
  return null;
}

/** brother → son, sister → daughter, anything else → child. */
function asChild(siblingLabel: string): string {
  const word = siblingLabel.toLowerCase();
  return word === "brother" ? "son" : word === "sister" ? "daughter" : "child";
}

type Relative = { id: string; name: string; relationToMe: string | null };

/** A link the app proposes: `otherIs` = what the other is to this person, `selfIs` the other way. */
export type SuggestedLink = { otherId: string; otherName: string; otherIs: string; selfIs: string };

/**
 * From what everyone is to you: your brother's mum is your mum, your siblings are each
 * other's siblings, your parents are each other's partners. Already linked people are skipped.
 */
export function suggestLinks(self: Relative, others: Relative[], linkedIds: ReadonlySet<string>): SuggestedLink[] {
  const selfRole = roleOf(self.relationToMe);
  if (!selfRole || !self.relationToMe) return [];
  const selfLabel = self.relationToMe.toLowerCase();
  const out: SuggestedLink[] = [];
  for (const other of others) {
    if (other.id === self.id || linkedIds.has(other.id) || !other.relationToMe) continue;
    const otherRole = roleOf(other.relationToMe);
    const otherLabel = other.relationToMe.toLowerCase();
    const add = (otherIs: string, selfIs: string) =>
      out.push({ otherId: other.id, otherName: other.name, otherIs, selfIs });

    if (selfRole === "sibling" && otherRole === "parent") add(otherLabel, asChild(selfLabel));
    else if (selfRole === "parent" && otherRole === "sibling") add(asChild(otherLabel), selfLabel);
    else if (selfRole === "sibling" && otherRole === "sibling") add(otherLabel, selfLabel);
    else if (selfRole === "parent" && otherRole === "parent") add("partner", "partner");
  }
  return out.sort((a, b) => a.otherName.localeCompare(b.otherName));
}
