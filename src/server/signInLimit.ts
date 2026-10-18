/**
 * A brake on password guessing for email sign-in, on top of Better Auth's own rate limit
 * (3 tries per 10 seconds per IP, which a slow guesser never hits).
 *
 * Only wrong passwords count. After 10 wrong passwords for one email in 15 minutes, that email
 * can't sign in with a password until the 15 minutes are up (Google sign-in and "Forgot your
 * password?" still work). One IP gets 30 wrong passwords in 15 minutes across all emails, so
 * nobody can try one password on many accounts. A right password clears that email's count.
 *
 * In memory, so it's per server instance, like the gift password limit (src/server/giftPassword.ts).
 */

export const SIGN_IN_LIMITS = {
  windowMs: 15 * 60 * 1000,
  perEmail: 10,
  perIp: 30,
} as const;

type Entry = { n: number; since: number };
const failures = new Map<string, Entry>();
let writes = 0;

function count(key: string, now: number): number {
  const entry = failures.get(key);
  if (!entry || now - entry.since >= SIGN_IN_LIMITS.windowMs) return 0;
  return entry.n;
}

function bump(key: string, now: number) {
  const entry = failures.get(key);
  if (!entry || now - entry.since >= SIGN_IN_LIMITS.windowMs) failures.set(key, { n: 1, since: now });
  else entry.n += 1;
  if (++writes % 500 === 0) for (const [k, v] of failures) if (now - v.since >= SIGN_IN_LIMITS.windowMs) failures.delete(k);
}

const emailKey = (email: string) => `email:${email.trim().toLowerCase()}`;
const ipKey = (ip: string) => `ip:${ip}`;

/** True while this email (or this IP) has had too many wrong passwords. */
export function signInBlocked(email: string, ip: string | null, now = Date.now()): boolean {
  if (count(emailKey(email), now) >= SIGN_IN_LIMITS.perEmail) return true;
  return !!ip && count(ipKey(ip), now) >= SIGN_IN_LIMITS.perIp;
}

export function recordWrongPassword(email: string, ip: string | null, now = Date.now()) {
  bump(emailKey(email), now);
  if (ip) bump(ipKey(ip), now);
}

/** The right password: this email starts fresh (the IP count stays, it covers other emails too). */
export function clearWrongPasswords(email: string) {
  failures.delete(emailKey(email));
}

/** For tests. */
export function resetSignInLimits() {
  failures.clear();
}

/** The visitor's IP from the platform header (Vercel sets x-forwarded-for to the real client). */
export function requestIp(headers: Headers | null | undefined): string | null {
  const raw = headers?.get("x-forwarded-for")?.split(",")[0]?.trim() || headers?.get("x-real-ip")?.trim();
  return raw || null;
}
