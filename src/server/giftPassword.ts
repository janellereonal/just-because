/**
 * Recipient passwords (a paid feature, see `passwordProtection` in pricing.ts).
 *
 *  - Only a scrypt hash is stored (`gift_sites.password_hash`), never the password.
 *  - Entering the right password sets an HttpOnly cookie for that gift. Its value
 *    is an HMAC of the gift id and the current hash, so changing or removing the
 *    password signs everyone out, and the cookie can't be forged without the
 *    server secret.
 *  - The check happens on the server (see `canViewGift` in src/lib/api.ts), so
 *    notes, photos and ornaments are never sent before the password is right.
 */
import { createHash, createHmac, randomBytes, scrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import { getCookie, setCookie } from "@tanstack/react-start/server";
import { hasFeature } from "@/config/pricing";

const scryptAsync = promisify(scrypt) as (pw: string, salt: Buffer, len: number) => Promise<Buffer>;
const KEY_LEN = 32;

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const hash = await scryptAsync(password, salt, KEY_LEN);
  return `scrypt$${salt.toString("base64")}$${hash.toString("base64")}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [scheme, saltB64, hashB64] = stored.split("$");
  if (scheme !== "scrypt" || !saltB64 || !hashB64) return false;
  const expected = Buffer.from(hashB64, "base64");
  const actual = await scryptAsync(password, Buffer.from(saltB64, "base64"), expected.length);
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

/** Same derivation as src/server/auth.ts, so no extra env var is needed. */
function serverSecret() {
  const explicit = process.env["BETTER_AUTH_SECRET"];
  if (explicit) return explicit;
  return createHash("sha256").update(`just-because-auth:${process.env["DATABASE_URL"] ?? ""}`).digest("hex");
}

const cookieName = (siteId: string) => `jb_gift_${siteId.replace(/-/g, "")}`;

function unlockToken(siteId: string, passwordHash: string) {
  return createHmac("sha256", serverSecret()).update(`gift-unlock:${siteId}:${passwordHash}`).digest("base64url");
}

/** Does this gift ask for a password right now? Only when one is set AND the plan includes it. */
export function needsPassword(site: { passwordHash: string | null; tier: string | null }) {
  return !!site.passwordHash && hasFeature(site.tier, "passwordProtection");
}

/** Has this browser entered the right password for this gift? */
export function isUnlocked(site: { id: string; passwordHash: string | null }) {
  if (!site.passwordHash) return true;
  const got = getCookie(cookieName(site.id));
  if (!got) return false;
  const want = unlockToken(site.id, site.passwordHash);
  const a = Buffer.from(got);
  const b = Buffer.from(want);
  return a.length === b.length && timingSafeEqual(a, b);
}

export function rememberUnlock(site: { id: string; passwordHash: string }) {
  setCookie(cookieName(site.id), unlockToken(site.id, site.passwordHash), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env["NODE_ENV"] === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 90,
  });
}

/* A light brake on guessing. In-memory, so it resets per server instance, but scrypt is slow too. */
const attempts = new Map<string, { n: number; since: number }>();
const WINDOW_MS = 10 * 60 * 1000;
const MAX_TRIES = 10;

export function tooManyTries(key: string) {
  const now = Date.now();
  const entry = attempts.get(key);
  if (!entry || now - entry.since > WINDOW_MS) {
    attempts.set(key, { n: 1, since: now });
    return false;
  }
  entry.n += 1;
  return entry.n > MAX_TRIES;
}

export function clearTries(key: string) {
  attempts.delete(key);
}
