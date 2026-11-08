// The birthday party on the cat deployment: a full-screen confetti + dancing cats overlay
// the first time Home opens on this day (per device), then a small card on Home all day.

export const BIRTHDAY = { month: 11, day: 11 } as const;

/** True when the day key ("YYYY-MM-DD") falls on BIRTHDAY, any year. */
export function isBirthday(todayKey: string): boolean {
  const [, m, d] = todayKey.split("-").map(Number);
  return m === BIRTHDAY.month && d === BIRTHDAY.day;
}

/** localStorage key that remembers the party already played this year on this device. */
export function birthdaySeenKey(todayKey: string): string {
  return `birthday-seen-${todayKey.slice(0, 4)}`;
}

/** The card's note from the server-only BIRTHDAY_NOTE env var (kept out of the public repo):
 *  paragraphs separated by "|", the last one is the signature. Unset = no note, just the party. */
export function birthdayNote(raw = process.env.BIRTHDAY_NOTE): string[] {
  return (raw ?? "")
    .split("|")
    .map((line) => line.trim())
    .filter(Boolean);
}
