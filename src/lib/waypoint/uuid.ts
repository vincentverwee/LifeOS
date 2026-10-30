/** Waypoint ids are UUIDs; querying a `@db.Uuid` column with anything else makes Postgres throw instead of finding nothing. */
export function isUuid(id: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
}
