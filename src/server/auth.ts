import { createHash } from "node:crypto";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { tanstackStartCookies } from "better-auth/tanstack-start";
import { anonymous } from "better-auth/plugins";
import { APIError, createAuthMiddleware, isAPIError } from "better-auth/api";
import { and, eq } from "drizzle-orm";
import { getDb, schema } from "./db";
import { emailEnabled, existingAccountEmail, resetPasswordEmail, siteUrl, verifyEmail } from "./email";
import { claimGuestGifts, GUEST_EMAIL_DOMAIN } from "./guests";
import { isFlagOn } from "@/config/flags";
import { clearWrongPasswords, recordWrongPassword, requestIp, signInBlocked } from "./signInLimit";

/** Shown when an email (or IP) has had too many wrong passwords. Matches the copy in /auth. */
const TOO_MANY_TRIES = "Too many tries. Wait 15 minutes, or reset your password.";

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
    // Better Auth's own limit (3 sign-in or sign-up tries per 10 seconds per IP) is only on when
    // NODE_ENV is "production". Vercel sets it; say so outright so a server without it is covered too.
    rateLimit: {
      enabled: process.env["NODE_ENV"] === "production" || Boolean(process.env["VERCEL"]),
    },
    // Wrong passwords: a slower brake per email and per IP (src/server/signInLimit.ts).
    hooks: {
      before: createAuthMiddleware(async (ctx) => {
        if (ctx.path !== "/sign-in/email") return;
        const email = typeof ctx.body?.email === "string" ? ctx.body.email : "";
        if (email && signInBlocked(email, requestIp(ctx.headers))) {
          throw new APIError("TOO_MANY_REQUESTS", { message: TOO_MANY_TRIES });
        }
      }),
      after: createAuthMiddleware(async (ctx) => {
        if (ctx.path !== "/sign-in/email") return;
        const email = typeof ctx.body?.email === "string" ? ctx.body.email : "";
        if (!email) return;
        const returned = ctx.context.returned;
        if (isAPIError(returned)) {
          if (returned.statusCode === 401) recordWrongPassword(email, requestIp(ctx.headers));
        } else {
          clearWrongPasswords(email);
        }
      }),
    },
    socialProviders:
      googleId && googleSecret
        ? { google: { clientId: googleId, clientSecret: googleSecret, prompt: "select_account" } }
        : {},
    account: {
      // Signing in with Google using the email of an existing account adds Google to that
      // account (one person, one account), instead of failing or making a second one.
      accountLinking: { enabled: true, trustedProviders: ["google"] },
    },
    databaseHooks: {
      account: {
        create: {
          before: async (account) => {
            // Someone could sign up with an email that isn't theirs and never confirm it. If the
            // real owner later signs in with Google, Google proves the email is theirs: drop the
            // unconfirmed password and its sessions so the first person can't get back in.
            if (account.providerId !== "google") return;
            const db = getDb();
            const [owner] = await db
              .select({ verified: schema.user.emailVerified })
              .from(schema.user)
              .where(eq(schema.user.id, account.userId));
            if (!owner || owner.verified) return;
            await db
              .delete(schema.account)
              .where(and(eq(schema.account.userId, account.userId), eq(schema.account.providerId, "credential")));
            await db.delete(schema.session).where(eq(schema.session.userId, account.userId));
          },
        },
      },
    },
    user: {
      additionalFields: {
        isAdmin: { type: "boolean", required: false, defaultValue: false, input: false },
      },
    },
    session: {
      expiresIn: 60 * 60 * 24 * 30,
      cookieCache: { enabled: true, maxAge: 60 * 5 },
    },
    plugins: [
      // Guests (flag guestStart): a real session before an account. Their gifts move over on sign-in.
      ...(isFlagOn("guestStart") ? [anonymous({
        emailDomainName: GUEST_EMAIL_DOMAIN,
        generateName: () => "Guest",
        onLinkAccount: async ({ anonymousUser, newUser }) => {
          await claimGuestGifts(anonymousUser.user.id, newUser.user.id);
        },
      })] : []),
      tanstackStartCookies(),
    ],
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
