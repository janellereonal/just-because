import { createHash } from "node:crypto";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { tanstackStartCookies } from "better-auth/tanstack-start";
import { getDb, schema } from "./db";
import { emailEnabled, existingAccountEmail, resetPasswordEmail, siteUrl, verifyEmail } from "./email";

/**
 * BETTER_AUTH_SECRET signs session cookies. If it isn't set, derive a stable
 * secret from the (already secret) database URL so deploys work out of the box.
 */
function authSecret() {
  const explicit = process.env["BETTER_AUTH_SECRET"];
  if (explicit) return explicit;
  const db = process.env["DATABASE_URL"] ?? "";
  return createHash("sha256").update(`just-because-auth:${db}`).digest("hex");
}

function createAuth() {
  const googleId = process.env["GOOGLE_CLIENT_ID"];
  const googleSecret = process.env["GOOGLE_CLIENT_SECRET"];
  const extraOrigins = (process.env["TRUSTED_ORIGINS"] ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const previewOrigin = [process.env["VERCEL_URL"], process.env["VERCEL_BRANCH_URL"]]
    .filter((u): u is string => Boolean(u))
    .map((u) => `https://${u}`);

  return betterAuth({
    baseURL: siteUrl(),
    secret: authSecret(),
    trustedOrigins: [siteUrl(), ...previewOrigin, ...extraOrigins],
    database: drizzleAdapter(getDb(), {
      provider: "pg",
      schema: {
        user: schema.user,
        session: schema.session,
        account: schema.account,
        verification: schema.verification,
      },
    }),
    emailAndPassword: {
      enabled: true,
      minPasswordLength: 6,
      // Once Resend is set up, new email accounts must confirm their address first.
      requireEmailVerification: emailEnabled(),
      autoSignIn: !emailEnabled(),
      resetPasswordTokenExpiresIn: 60 * 60,
      sendResetPassword: async ({ user, url }) => {
        await resetPasswordEmail(user.email, user.name, url);
      },
      // Signing up again with an email that has an account: Better Auth answers like a normal
      // sign-up (so nobody can check which emails exist), so tell the owner by email instead.
      onExistingUserSignUp: async ({ user }) => {
        await existingAccountEmail(user.email, user.name);
      },
    },
    emailVerification: {
      sendOnSignUp: true,
      sendOnSignIn: true,
      autoSignInAfterVerification: true,
      sendVerificationEmail: async ({ user, url }) => {
        await verifyEmail(user.email, user.name, url);
      },
    },
    socialProviders:
      googleId && googleSecret
        ? { google: { clientId: googleId, clientSecret: googleSecret, prompt: "select_account" } }
        : {},
    user: {
      additionalFields: {
        isAdmin: { type: "boolean", required: false, defaultValue: false, input: false },
      },
    },
    session: {
      expiresIn: 60 * 60 * 24 * 30,
      cookieCache: { enabled: true, maxAge: 60 * 5 },
    },
    plugins: [tanstackStartCookies()],
  });
}

type Auth = ReturnType<typeof createAuth>;
let _auth: Auth | undefined;

export function getAuth(): Auth {
  if (!_auth) _auth = createAuth();
  return _auth;
}

export function googleEnabled() {
  return Boolean(process.env["GOOGLE_CLIENT_ID"] && process.env["GOOGLE_CLIENT_SECRET"]);
}
