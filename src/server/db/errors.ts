/**
 * Postgres errors we answer in plain words instead of a 500.
 * postgres-js puts the SQLSTATE on `code`; Drizzle wraps it and keeps the original on `cause`.
 */
const UNIQUE_VIOLATION = "23505";

/** True when a write failed because a unique column (like a gift's link name) already has that value. */
export function isUniqueViolation(error: unknown): boolean {
  for (let e = error, depth = 0; e && typeof e === "object" && depth < 4; e = (e as { cause?: unknown }).cause, depth++) {
    if ((e as { code?: unknown }).code === UNIQUE_VIOLATION) return true;
  }
  return false;
}
