/**
 * Client-side UUIDs.
 *
 * Every primary key in the StrictlyFuel schema is a Postgres `uuid`, so any id
 * the app generates for a row it is about to insert has to be a real UUID —
 * a readable string like `post-1724800000-a1b2c` is rejected outright with
 * `invalid input syntax for type uuid`.
 */
export function makeUuid(): string {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (value) => {
    const random = Math.floor(Math.random() * 16);
    return (value === "x" ? random : (random & 0x3) | 0x8).toString(16);
  });
}

/** True when a string is shaped like a UUID the database will accept. */
export const isUuid = (value: string) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
