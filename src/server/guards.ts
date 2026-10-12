import { getRequest } from "@tanstack/react-start/server";
import { eq } from "drizzle-orm";
import { getAuth } from "./auth";
import { getDb, schema } from "./db";

export type SessionUser = { id: string; email: string; name: string; isAdmin: boolean };

/** The signed-in person for this request, or null. */
export async function currentUser(): Promise<SessionUser | null> {
  const request = getRequest();
  if (!request) return null;
  const result = await getAuth().api.getSession({ headers: request.headers });
  if (!result?.user) return null;
  // Read is_admin fresh from the database so the session cookie cache can't go stale on it.
  const [row] = await getDb()
    .select({ isAdmin: schema.user.isAdmin })
    .from(schema.user)
    .where(eq(schema.user.id, result.user.id));
  return {
    id: result.user.id,
    email: result.user.email,
    name: result.user.name,
    isAdmin: Boolean(row?.isAdmin),
  };
}

export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

export async function requireUser(): Promise<SessionUser> {
  const user = await currentUser();
  if (!user) throw new HttpError(401, "Please sign in again.");
  return user;
}

export async function requireAdmin(): Promise<SessionUser> {
  const user = await requireUser();
  if (!user.isAdmin) throw new HttpError(403, "Admins only.");
  return user;
}

/** Throws unless the signed-in person created this gift (admins may too). */
export async function requireSiteOwner(siteId: string) {
  const user = await requireUser();
  const [site] = await getDb()
    .select({ id: schema.giftSites.id, creatorId: schema.giftSites.creatorId, status: schema.giftSites.status })
    .from(schema.giftSites)
    .where(eq(schema.giftSites.id, siteId));
  if (!site) throw new HttpError(404, "We couldn't find that gift.");
  if (site.creatorId !== user.id && !user.isAdmin) throw new HttpError(403, "That gift isn't yours.");
  return { user, site };
}

export type Json = string | number | boolean | null | Json[] | { [key: string]: Json };
export type Row = { [key: string]: Json };

/** camelCase drizzle rows -> the snake_case shape the UI already understands. */
export function toRow(record: Record<string, unknown>): Row {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(record)) {
    const snake = key.replace(/[A-Z]/g, (c) => `_${c.toLowerCase()}`);
    out[snake] = value instanceof Date ? value.toISOString() : value;
  }
  return out as Row;
}
