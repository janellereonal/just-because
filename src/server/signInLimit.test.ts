import { beforeEach, describe, expect, test } from "bun:test";
import { SIGN_IN_LIMITS, clearWrongPasswords, recordWrongPassword, requestIp, resetSignInLimits, signInBlocked } from "./signInLimit";

beforeEach(() => resetSignInLimits());

describe("wrong-password brake", () => {
  test("an email is blocked after 10 wrong passwords, then free again after 15 minutes", () => {
    const t0 = 1_000_000;
    for (let i = 0; i < SIGN_IN_LIMITS.perEmail - 1; i++) recordWrongPassword("Ana@Example.test", null, t0 + i);
    expect(signInBlocked("ana@example.test", null, t0 + 100)).toBe(false);
    recordWrongPassword("ana@example.test", null, t0 + 200);
    expect(signInBlocked(" ANA@example.test ", null, t0 + 300)).toBe(true);
    // Another email from elsewhere isn't affected.
    expect(signInBlocked("bea@example.test", null, t0 + 300)).toBe(false);
    expect(signInBlocked("ana@example.test", null, t0 + SIGN_IN_LIMITS.windowMs + 1)).toBe(false);
  });

  test("one IP trying many emails is blocked after 30 wrong passwords", () => {
    const t0 = 5_000_000;
    for (let i = 0; i < SIGN_IN_LIMITS.perIp; i++) recordWrongPassword(`p${i}@example.test`, "10.0.0.1", t0 + i);
    expect(signInBlocked("fresh@example.test", "10.0.0.1", t0 + 100)).toBe(true);
    expect(signInBlocked("fresh@example.test", "10.0.0.2", t0 + 100)).toBe(false);
  });

  test("the right password clears that email's count", () => {
    for (let i = 0; i < SIGN_IN_LIMITS.perEmail; i++) recordWrongPassword("cy@example.test", null);
    expect(signInBlocked("cy@example.test", null)).toBe(true);
    clearWrongPasswords("cy@example.test");
    expect(signInBlocked("cy@example.test", null)).toBe(false);
  });

  test("reads the client IP from the platform header", () => {
    expect(requestIp(new Headers({ "x-forwarded-for": "203.0.113.5, 10.0.0.1" }))).toBe("203.0.113.5");
    expect(requestIp(new Headers({ "x-real-ip": "203.0.113.9" }))).toBe("203.0.113.9");
    expect(requestIp(new Headers())).toBeNull();
    expect(requestIp(undefined)).toBeNull();
  });
});
