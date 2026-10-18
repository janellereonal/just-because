/**
 * Every read and write the app makes goes through these server functions.
 * The browser never talks to the database directly, so the privacy rules that
 * used to live in Supabase row-level security are enforced here instead:
 *
 *  - anyone can read a gift's settings, modules and calendar
 *  - guests only see *approved* contributions, and "only the recipient"
 *    ornament messages are never sent to the browser
 *  - guests can add contributions (always pending) and edit/delete their own
 *    with the secret edit token, only while the gift is still a draft
 *  - only the creator can edit a gift, see pending items, approve, or plan
 *    the calendar
 *  - only admins can change the theme library
 *  - the finished gift (approved notes, tree ornaments) is only readable once
 *    it's paid, published and not ended; before that only the owner sees it
 *    (or friends, when the owner turned on "let friends read each other's notes")
 *  - a password-protected gift (paid feature) also needs the right password
 *    first; the password hash itself never leaves the server
 */
import { GUEST_COPY, SAVE_COPY } from "@/copy/strings";
import { canonicalFields, checkSave, flatten, withoutKeys } from "@/lib/siteDraft";
import { FORMAT_IDS, type GiftFormat } from "@/lib/formats";
import { STYLE_IDS, bodyFor, isStyleId, lookFor, styleInfo, type StyleInfo } from "@/lib/styles";
import { OCCASION_IDS, occasionInfo, type OccasionId } from "@/lib/occasions";
import { FONT_CHOICE_IDS } from "@/lib/fontChoices";
import { FIELD_NAMES, LIMITS, customTextLimit, noteTextLimit, tooLong } from "@/lib/limits";
import { normalizeIntroSettings } from "@/lib/intro";
import { normalizeCharacter } from "@/themes/_shared/cast/types";
import { normalizeIconSetting } from "@/themes/_shared/iconSets";
import { NEW_SECTION_TYPES, SECTION_NEEDS, capsuleLocked, isNewSection, normalizeSectionData } from "@/lib/sections";
import { createServerFn } from "@tanstack/react-start";
import { and, asc, desc, eq, inArray, ne, or, sql } from "drizzle-orm";
import { z } from "zod";
import { getDb, schema } from "@/server/db";
import { CLIENT_EVENTS, track } from "@/server/events";
import { notifyNewNote } from "@/server/notify";
import { clientIp, rateLimit } from "@/server/rateLimit";
import {
  expireStaleOrders,
  isExpired,
  isOpen,
  siteUsage,
  tierBlocker,
  upgradeOptions,
  withRoom,
} from "@/server/billing";
import { TIERS, LEGACY_TIER, discountLabel as discountLabelOf, getTier, hasFeature, tierAllowsLook } from "@/config/pricing";
import {
  clearTries,
  hashPassword,
  isUnlocked,
  needsPassword,
  rememberUnlock,
  tooManyTries,
  verifyPassword,
} from "@/server/giftPassword";
import {
  HttpError,
  currentUser,
  requireAdmin,
  requireSiteOwner,
  requireUser,
  toRow,
} from "@/server/guards";

const id = z.string().uuid();
const MODULE_TYPES = [
  "letters",
  "photobooth",
  "songs",
  "wordcloud",
  "voice",
  "countdown",
  "calendar",
  "tree",
  ...NEW_SECTION_TYPES,
] as const;
const GUEST_TYPES = ["letters", "photobooth", "songs", "wordcloud", "voice", "tree", ...NEW_SECTION_TYPES] as const;
const OWNER_NOTE_TYPES = ["letters", "photobooth", "songs", "wordcloud", "voice", ...NEW_SECTION_TYPES] as const;

/** Clean `data` for a section and check it has what it needs. Throws a friendly 400. */
/** A small copy of a photo we stored for this gift (Vercel Blob, or a local dev upload), or null. */
function ownThumb(value: unknown, siteId: string): string | null {
  if (typeof value !== "string" || value.length > 600) return null;
  if (/^https:\/\/[\w.-]+\.public\.blob\.vercel-storage\.com\//.test(value) && value.includes(`/gifts/${siteId}/`)) return value;
  if (/^\/api\/dev-uploads\/[\w.-]+$/.test(value) && value.includes(`gifts_${siteId}_`)) return value;
  return null;
}

function sectionPayload(type: string, raw: unknown, text: string | null, media: string | null, siteId = ""): Record<string, unknown> | null {
  // Photos: a booth photo has its frame and words drawn in (gifts show it whole), and most
  // photos come with a small copy for grids and previews.
  if (type === "photobooth") {
    const v = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
    const out: Record<string, unknown> = {};
    if (v["framed"] === true) out["framed"] = true;
    const thumb = ownThumb(v["thumb"], siteId);
    if (thumb) out["thumb"] = thumb;
    return Object.keys(out).length ? out : null;
  }
  if (!isNewSection(type)) return null;
  const clean = normalizeSectionData(type, raw);
  if (!clean) throw new HttpError(400, "Something's missing in that note. Check the fields and try again.");
  const needs = SECTION_NEEDS[type];
  if (needs.text === "required" && !text?.trim()) throw new HttpError(400, "Write a few words first.");
  if (needs.media === "required" && !media) throw new HttpError(400, "Add the file first.");
  return clean;
}

/** Public rows: a time capsule that hasn't opened keeps its words and pictures on the server. */
function sealCapsule<T extends { moduleType: string; data: unknown; textContent: string | null; mediaUrl: string | null }>(row: T): T {
  if (row.moduleType !== "capsule" || !capsuleLocked(row.data)) return row;
  return { ...row, textContent: null, mediaUrl: null, data: { ...(row.data as object), locked: true } };
}
const ORNAMENT_KEYS = [
  "bauble", "star", "stocking", "candy-cane", "snowman", "gingerbread", "bell", "wreath",
  "mitten", "snow-globe", "gift", "heart", "candy", "cookie", "pinecone", "angel",
] as const;

type Json = string | number | boolean | null | Json[] | { [key: string]: Json };
const json: z.ZodType<Json> = z.lazy(() =>
  z.union([z.string(), z.number(), z.boolean(), z.null(), z.array(json), z.record(z.string(), json)]),
);
const jsonObject = z.record(z.string(), json);

const shortText = z.string().max(20000).nullable();
const link = z.string().max(2000).nullable();
const mediaUrl = z
  .string()
  .max(2000)
  .refine((v) => v.startsWith("https://") || v.startsWith("/api/dev-uploads/"), "Bad media URL")
  .nullable();

/* ------------------------------------------------------------------ */
/* Account                                                            */
/* ------------------------------------------------------------------ */

export const getMe = createServerFn({ method: "GET" }).handler(async () => {
  const user = await currentUser();
  return user;
});

/** Which sign-in buttons to show. */
export const getAuthOptions = createServerFn({ method: "GET" }).handler(async () => {
  const { googleEnabled } = await import("@/server/auth");
  const { emailEnabled } = await import("@/server/email");
  return { google: googleEnabled(), email: emailEnabled() };
});

/* ------------------------------------------------------------------ */
/* Themes & palettes                                                  */
/* ------------------------------------------------------------------ */

export const listThemes = createServerFn({ method: "GET" })
  .inputValidator(z.object({ includeDrafts: z.boolean().default(false) }))
  .handler(async ({ data }) => {
    if (data.includeDrafts) await requireAdmin();
    const db = getDb();
    const rows = await db
      .select()
      .from(schema.themes)
      .where(data.includeDrafts ? undefined : eq(schema.themes.status, "published"))
      .orderBy(asc(schema.themes.createdAt));
    return rows.map(toRow);
  });

export const getThemeById = createServerFn({ method: "GET" })
  .inputValidator(z.object({ id }))
  .handler(async ({ data }) => {
    const [row] = await getDb().select().from(schema.themes).where(eq(schema.themes.id, data.id));
    // Hidden themes still load for gifts that already use them.
    return row ? toRow(row) : null;
  });

export const listPalettes = createServerFn({ method: "GET" }).handler(async () => {
  const rows = await getDb().select().from(schema.palettes).orderBy(asc(schema.palettes.sortOrder));
  return rows.map(toRow);
});

export const setThemeStatus = createServerFn({ method: "POST" })
  .inputValidator(z.object({ id, status: z.enum(["published", "draft"]) }))
  .handler(async ({ data }) => {
    await requireAdmin();
    await getDb().update(schema.themes).set({ status: data.status }).where(eq(schema.themes.id, data.id));
    return { ok: true };
  });

export const setThemePreview = createServerFn({ method: "POST" })
  .inputValidator(z.object({ id, url: mediaUrl }))
  .handler(async ({ data }) => {
    await requireAdmin();
    await getDb()
      .update(schema.themes)
      .set({ previewImageUrl: data.url })
      .where(eq(schema.themes.id, data.id));
    return { ok: true };
  });

/* ------------------------------------------------------------------ */
/* Gift sites                                                         */
/* ------------------------------------------------------------------ */

type SiteRecord = typeof schema.giftSites.$inferSelect;

function isOwnerOf(user: Awaited<ReturnType<typeof currentUser>>, site: SiteRecord) {
  return !!user && (user.id === site.creatorId || user.isAdmin);
}

/**
 * A gift row for the browser. The password hash is always removed; instead:
 * `password_set` (owner only), `password_protected` (the link asks for one) and
 * `unlocked` (this visitor may see the gift's notes).
 */
function siteRow(site: SiteRecord, opts: { owner: boolean }) {
  const { passwordHash, ...rest } = site;
  const protectedNow = needsPassword(site);
  return {
    ...toRow(rest),
    ...(opts.owner ? { password_set: !!passwordHash } : {}),
    password_protected: protectedNow,
    unlocked: opts.owner || !protectedNow || isUnlocked(site),
  };
}

/**
 * Can the current visitor see the finished gift? Open gifts: anyone, after the
 * password if it has one. Otherwise only the owner (or an admin).
 */
async function canViewGift(siteId: string, opts: { allowSharedNotes?: boolean } = {}) {
  const [site] = await getDb().select().from(schema.giftSites).where(eq(schema.giftSites.id, siteId));
  if (!site) return false;
  if (site.disabledAt && !(await currentUser())?.isAdmin) return false;
  // Friends reading each other's notes while the gift is still being made (the contribute page).
  if (opts.allowSharedNotes && site.shareNotes && site.status === "draft") return true;
  if (isOwnerOf(await currentUser(), site)) return true;
  if (!isOpen(site)) return false;
  return !needsPassword(site) || isUnlocked(site);
}

/**
 * The visitor's country (ISO code like "PH"), from Vercel's edge header. Only
 * used to order themes (Balikbayan Box first for the Philippines, say). Null
 * locally and when unknown.
 */
export const getVisitorCountry = createServerFn({ method: "GET" }).handler(async () => {
  const { getRequest } = await import("@tanstack/react-start/server");
  const raw = getRequest()?.headers.get("x-vercel-ip-country") ?? "";
  return /^[A-Z]{2}$/.test(raw) ? raw : null;
});

/**
 * Deletes the signed-in person's account and everything in it: their gifts,
 * every note friends added to them, and every stored photo and voice note.
 * Payment records are kept (without the account or gift) for accounting and
 * refunds. They have to type DELETE, and it can't be undone.
 */
export const deleteAccount = createServerFn({ method: "POST" })
  .inputValidator(z.object({ confirm: z.literal("DELETE") }))
  .handler(async ({ data }) => {
    void data;
    const user = await requireUser();
    const db = getDb();
    const gifts = await db.select({ id: schema.giftSites.id }).from(schema.giftSites).where(eq(schema.giftSites.creatorId, user.id));
    // Rows first (orders keep their record with the gift and owner set to null), then the files.
    await db.delete(schema.user).where(eq(schema.user.id, user.id));
    const { deleteGiftMedia } = await import("@/server/uploads");
    for (const g of gifts) await deleteGiftMedia(g.id);
    console.info(`[account] deleted an account and ${gifts.length} gifts`);
    return { ok: true, gifts: gifts.length };
  });

/** Reads are cheap, but a flood of slug guesses isn't: generous per-visitor caps on public lookups. */
const READ_LIMIT = "Lots of requests from here just now. Wait a minute and try again.";

export const getSiteBySlug = createServerFn({ method: "GET" })
  .inputValidator(z.object({ slug: z.string().min(1).max(120) }))
  .handler(async ({ data }) => {
    rateLimit(`slug:${clientIp()}`, 240, 60_000, READ_LIMIT);
    const [row] = await getDb().select().from(schema.giftSites).where(eq(schema.giftSites.slug, data.slug));
    if (!row) return null;
    return siteRow(row, { owner: isOwnerOf(await currentUser(), row) });
  });

/** The recipient enters the gift's password. Right answer: remembered on this browser. */
export const unlockGift = createServerFn({ method: "POST" })
  .inputValidator(z.object({ slug: z.string().min(1).max(120), password: z.string().min(1).max(200) }))
  .handler(async ({ data }) => {
    const [site] = await getDb().select().from(schema.giftSites).where(eq(schema.giftSites.slug, data.slug));
    if (!site || !site.passwordHash || !needsPassword(site)) return { ok: true as const, error: null };
    const { getRequest } = await import("@tanstack/react-start/server");
    const ip = getRequest()?.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
    const key = `${site.id}:${ip}`;
    if (tooManyTries(key)) {
      return { ok: false as const, error: "Too many tries. Please wait a few minutes and try again." };
    }
    if (!(await verifyPassword(data.password, site.passwordHash))) {
      return { ok: false as const, error: "That's not it. Check with whoever sent you the link." };
    }
    clearTries(key);
    rememberUnlock({ id: site.id, passwordHash: site.passwordHash });
    return { ok: true as const, error: null };
  });

/** Owner sets, changes or removes the recipient password. `null` removes it. */
export const setGiftPassword = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      siteId: id,
      password: z
        .string()
        .min(4, "Use at least 4 characters.")
        .max(100, "Keep it under 100 characters.")
        .nullable(),
    }),
  )
  .handler(async ({ data }) => {
    await requireSiteOwner(data.siteId);
    const [site] = await getDb().select().from(schema.giftSites).where(eq(schema.giftSites.id, data.siteId));
    if (!site) throw new HttpError(404, "We couldn't find that gift.");
    // Unpaid drafts may set one ahead of time; it only takes effect on a plan that includes it.
    if (data.password !== null && site.tier && !hasFeature(site.tier, "passwordProtection")) {
      throw new HttpError(403, "Passwords come with Celebration and Keepsake. Upgrade to add one.");
    }
    const passwordHash = data.password === null ? null : await hashPassword(data.password);
    await getDb().update(schema.giftSites).set({ passwordHash }).where(eq(schema.giftSites.id, site.id));
    return { ok: true, passwordSet: passwordHash !== null };
  });

export const getSiteById = createServerFn({ method: "GET" })
  .inputValidator(z.object({ id }))
  .handler(async ({ data }) => {
    const user = await requireUser();
    const [row] = await getDb().select().from(schema.giftSites).where(eq(schema.giftSites.id, data.id));
    if (!row) return null;
    if (row.creatorId !== user.id && !user.isAdmin) return null;
    return siteRow(row, { owner: true });
  });

export const listMySites = createServerFn({ method: "GET" }).handler(async () => {
  const user = await requireUser();
  const rows = await getDb()
    .select()
    .from(schema.giftSites)
    .where(eq(schema.giftSites.creatorId, user.id))
    .orderBy(desc(schema.giftSites.createdAt));
  // Note counts for each card, counted the same way as the editor (src/lib/noteCounts.ts).
  const ids = rows.map((r) => r.id);
  const tallies = ids.length
    ? await getDb()
        .select({ siteId: c.siteId, status: c.status, n: sql<number>`count(*)::int` })
        .from(c)
        .where(inArray(c.siteId, ids))
        .groupBy(c.siteId, c.status)
    : [];
  const countsFor = (siteId: string) => {
    const out = { inGift: 0, waiting: 0, hidden: 0 };
    for (const t of tallies) {
      if (t.siteId !== siteId) continue;
      if (t.status === "approved") out.inGift += t.n;
      else if (t.status === "pending") out.waiting += t.n;
      else if (t.status === "hidden") out.hidden += t.n;
    }
    return out;
  };
  // siteRow drops password_hash; plain toRow sent it to the browser.
  return rows.map((row) => ({ ...siteRow(row, { owner: true }), note_counts: countsFor(row.id) }));
});

/**
 * New gift links are random: 12 characters from an alphabet with no lookalikes
 * (no 0/o, 1/l/i), so they're hard to guess and never carry a name. Old slugs
 * with names in them keep working.
 */
const SLUG_ALPHABET = "abcdefghjkmnpqrstuvwxyz23456789";
async function randomSlug(length = 12) {
  const { randomBytes } = await import("node:crypto");
  const bytes = randomBytes(length);
  let out = "";
  for (let i = 0; i < length; i++) out += SLUG_ALPHABET[bytes[i]! % SLUG_ALPHABET.length];
  return out;
}
async function uniqueSlug() {
  for (let i = 0; i < 5; i++) {
    const slug = await randomSlug();
    const [taken] = await getDb().select({ id: schema.giftSites.id }).from(schema.giftSites).where(eq(schema.giftSites.slug, slug));
    if (!taken) return slug;
  }
  return randomSlug(16);
}

/** An occasion a gift can be saved with ("Holidays" is only a chip that opens up into the real ones). */
const occasionField = z.enum(OCCASION_IDS).refine((o) => !occasionInfo(o).groupOnly, "Pick the holiday it's for.");

/**
 * The theme row a style wears (its opening, colors, fonts and cast), looked up on the
 * server by name so the browser can't pick a mismatched one. Layout styles wear none.
 * Draft themes (not published in /admin yet) are only for admins.
 */
async function themeForStyle(style: StyleInfo, occasion: OccasionId | null | undefined, lookId: string | null | undefined) {
  const look = lookFor(style, occasion, lookId);
  if (!look) return null;
  const [row] = await getDb()
    .select({ id: schema.themes.id, status: schema.themes.status })
    .from(schema.themes)
    .where(eq(schema.themes.name, look.theme));
  if (!row) throw new HttpError(422, "That style isn't available right now.");
  if (row.status !== "published" && !(await currentUser())?.isAdmin) throw new HttpError(422, "That style isn't available yet.");
  return row.id;
}

const paletteShape = z
  .object({ background: z.string(), primary: z.string(), accent: z.string() })
  .partial();

export const createSite = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      title: z.string().trim().min(1).max(200),
      /** Who it's for. The title is made from it, and it fills "for Ana" on the gift. */
      recipientName: z.string().trim().min(1, "Add the name of who it's for.").max(LIMITS.recipientName, tooLong("their name", LIMITS.recipientName)).optional(),
      themeId: id.nullable(),
      format: z.enum(FORMAT_IDS),
      /** The style. When set, the server picks the layout and the theme it wears. */
      style: z.enum(STYLE_IDS).optional(),
      /** Which look of the style (Invitation: ivory or blush). Default: the one for the occasion. */
      styleLook: z.string().trim().max(40).optional(),
      occasion: occasionField.nullable().optional(),
      paletteId: id.nullable(),
      customColors: paletteShape,
      treeRevealDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable(),
      modules: z.array(z.enum(MODULE_TYPES)).min(1),
      fontChoice: z.enum(FONT_CHOICE_IDS).optional(),
      /** Just from the creator: no friends link, they add every note. */
      solo: z.boolean().optional(),
    }),
  )
  .handler(async ({ data }) => {
    const user = await requireUser();
    if (user.isGuest) {
      const { GUEST_GIFT_LIMIT, giftCount } = await import("@/server/guests");
      if ((await giftCount(user.id)) >= GUEST_GIFT_LIMIT) throw new HttpError(401, GUEST_COPY.limit);
    }
    const db = getDb();
    // A double tap on "Create" makes one gift, not two: the same title from the
    // same person within a few seconds returns the gift that was just made.
    const [recent] = await db
      .select({ id: schema.giftSites.id })
      .from(schema.giftSites)
      .where(
        and(
          eq(schema.giftSites.creatorId, user.id),
          eq(schema.giftSites.title, data.title),
          sql`${schema.giftSites.createdAt} > now() - interval '15 seconds'`,
        ),
      )
      .orderBy(desc(schema.giftSites.createdAt))
      .limit(1);
    if (recent) return { id: recent.id };
    rateLimit(`create:${user.id}`, 30, 60 * 60_000, "That's a lot of new gifts in a short time. Take a breather and try again in a bit.");
    const style = data.style ? styleInfo(data.style) : null;
    const themeId = style ? await themeForStyle(style, data.occasion, data.styleLook) : data.themeId;
    const format: GiftFormat = style ? bodyFor(style) : data.format;
    const slug = await uniqueSlug();
    const made = await db.transaction(async (tx) => {
      const [site] = await tx
        .insert(schema.giftSites)
        .values({
          creatorId: user.id,
          title: data.title,
          themeId,
          format,
          ...(style ? { style: style.id } : {}),
          ...(data.occasion ? { occasion: data.occasion } : {}),
          slug,
          customText: { heading: data.title, ...(data.recipientName ? { recipient_name: data.recipientName } : {}) },
          paletteId: data.paletteId,
          customColors: data.customColors,
          treeRevealDate: data.treeRevealDate,
          ...(data.fontChoice ? { fontChoice: data.fontChoice } : {}),
          solo: data.solo ?? false,
        })
        .returning({ id: schema.giftSites.id });
      const unique = [...new Set(data.modules)];
      await tx
        .insert(schema.siteModules)
        .values(unique.map((type) => ({ siteId: site!.id, moduleType: type, price: "0" })));
      return { id: site!.id };
    });
    await track("gift_created", { siteId: made.id, userId: user.id, props: { solo: data.solo ?? false } });
    return made;
  });

const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable();

/** Keyed JSON fields in a patch: one entry per key, null removes it. */
const keyedPatch = z.record(z.string().max(60), json);
/** How big a keyed JSON field may get once merged (it's settings, not content). */
const MAX_SETTINGS_JSON = 12_000;

/**
 * Saves editor changes. Only the fields in `patch` are written; JSON fields
 * (custom_text, custom_colors, intro_settings, format_settings) merge key by key.
 * `base` holds what the editor last saw for each of those fields: if one of them
 * changed since (another tab, a phone), nothing is written and the editor gets a
 * 409 so it can load the latest instead of overwriting (src/lib/siteDraft.ts).
 * `soft` keys (words the editor changed by itself) are left out instead, and
 * listed in `skipped`. Returns the saved gift.
 */
export const updateSite = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      id,
      patch: z.object({
        title: z.string().trim().min(1).max(200).optional(),
        custom_text: z.record(z.string().max(60), z.string().max(20000).nullable()).optional(),
        custom_colors: z
          .object({ background: z.string().max(40).nullable(), primary: z.string().max(40).nullable(), accent: z.string().max(40).nullable() })
          .partial()
          .optional(),
        font_choice: z.enum(FONT_CHOICE_IDS).optional(),
        countdown_date: date.optional(),
        countdown_at: z.string().datetime({ offset: true }).nullable().optional(),
        calendar_locked: z.boolean().optional(),
        intro_text: z.string().trim().max(LIMITS.greeting, tooLong("the greeting", LIMITS.greeting)).nullable().optional(),
        background_style: z.enum(["paper", "clean", "formal", "gradient"]).optional(),
        tree_reveal_date: date.optional(),
        palette_id: id.nullable().optional(),
        share_notes: z.boolean().optional(),
        status: z.enum(["draft", "published"]).optional(),
        format: z.enum(FORMAT_IDS).optional(),
        /** Change the style (null clears it). The server sets the layout and theme to match. */
        style: z.enum(STYLE_IDS).nullable().optional(),
        style_look: z.string().trim().max(40).nullable().optional(),
        occasion: occasionField.nullable().optional(),
        format_settings: keyedPatch.optional(),
        intro_settings: keyedPatch.optional(),
        character: jsonObject.nullable().optional(),
        icon_set: jsonObject.nullable().optional(),
        solo: z.boolean().optional(),
      }),
      /** What the editor last saw for each field it's changing, in the same shape. */
      base: jsonObject.optional(),
      /** Values this editor has in another save still on its way; those count as seen too. */
      base_alt: jsonObject.optional(),
      /** Patch keys (flat, like `custom_text.heading`) the editor changed by itself; skipped instead of refused if changed elsewhere. */
      soft: z.array(z.string().max(80)).max(64).optional(),
    }),
  )
  .handler(async ({ data }) => {
    await requireSiteOwner(data.id);
    let p = data.patch;
    const softKeys = data.soft ?? [];
    const patchKeys = new Set(Object.keys(flatten(p as Record<string, unknown>)));
    if (softKeys.some((k) => !patchKeys.has(k))) throw new HttpError(400, "Something got mixed up. Refresh the page and try again.");
    let skipped: string[] = [];
    const saved = await getDb().transaction(async (tx) => {
      // Locked until this save is written, so two tabs saving at once can't both pass the check.
      const [site] = await tx.select().from(schema.giftSites).where(eq(schema.giftSites.id, data.id)).for("update");
      if (!site) throw new HttpError(404, "We couldn't find that gift.");

      // Never overwrite a change this editor hasn't seen. A new style brings its own layout, so that isn't checked twice.
      // Words the editor changed by itself (soft) that changed elsewhere keep the server's value; the rest saves.
      const check = checkSave(
        flatten(canonicalFields(toRow(site))),
        flatten(data.base ?? {}),
        flatten(p as Record<string, unknown>),
        { skip: p.style ? ["format"] : [], alt: flatten(data.base_alt ?? {}), soft: softKeys },
      );
      if (check.clashes.length) {
        console.info(`[editor] refused a stale save on gift ${site.id}: ${check.clashes.join(", ")}`);
        throw new HttpError(409, SAVE_COPY.serverConflict);
      }
      skipped = check.skipped;
      if (skipped.length) p = withoutKeys(p, skipped);

      const set: Partial<typeof schema.giftSites.$inferInsert> = {};
      if (p.title !== undefined) set.title = p.title;
      // Words: trimmed, with the same limits the editor's counters show. Empty removes.
      if (p.custom_text) {
        const text: Record<string, string> = { ...(site.customText as Record<string, string>) };
        for (const [k, v] of Object.entries(p.custom_text)) {
          const t = (v ?? "").trim();
          if (!t) {
            delete text[k];
            continue;
          }
          const max = customTextLimit(k);
          if ([...t].length > max) throw new HttpError(422, tooLong(FIELD_NAMES[k] ?? "that title", max));
          text[k] = t;
        }
        set.customText = text;
      }
      if (p.custom_colors) set.customColors = mergeKeys(site.customColors, p.custom_colors);
      if (p.format_settings) set.formatSettings = mergeKeys(site.formatSettings, p.format_settings);
      // The opening: cleaned server side, only known keys, hex colors, safe upload URLs.
      if (p.intro_settings) set.introSettings = normalizeIntroSettings(mergeKeys(normalizeIntroSettings(site.introSettings), p.intro_settings));
      if (p.character !== undefined) set.character = p.character ? normalizeCharacter(p.character) : null;
      if (p.icon_set !== undefined) set.iconSet = p.icon_set ? normalizeIconSetting(p.icon_set) : null;
      for (const [k, v] of [["formatSettings", set.formatSettings], ["introSettings", set.introSettings]] as const) {
        if (v !== undefined && JSON.stringify(v).length > MAX_SETTINGS_JSON) throw new HttpError(400, k === "introSettings" ? "That opening has too much in it." : "That has too much in it.");
      }
      if (p.font_choice !== undefined) set.fontChoice = p.font_choice;
      if (p.countdown_date !== undefined) set.countdownDate = p.countdown_date;
      if (p.countdown_at !== undefined) set.countdownAt = p.countdown_at ? new Date(p.countdown_at) : null;
      if (p.calendar_locked !== undefined) set.calendarLocked = p.calendar_locked;
      if (p.intro_text !== undefined) set.introText = p.intro_text;
      if (p.background_style !== undefined) set.backgroundStyle = p.background_style;
      if (p.tree_reveal_date !== undefined) set.treeRevealDate = p.tree_reveal_date;
      if (p.palette_id !== undefined) set.paletteId = p.palette_id;
      if (p.share_notes !== undefined) set.shareNotes = p.share_notes;
      if (p.solo !== undefined) set.solo = p.solo;
      if (p.occasion !== undefined) set.occasion = p.occasion;

      // Style: a new style brings its own layout and theme, and a new occasion can change
      // the theme it wears. Changing only the layout of a styled gift (from an older editor)
      // turns it back into a theme + layout gift, which still plays the same opening.
      const occasion = p.occasion !== undefined ? p.occasion : (site.occasion as OccasionId | null);
      let format = site.format as GiftFormat;
      let style = site.style;
      if (p.style) {
        const info = styleInfo(p.style);
        const keepBody = site.style === info.id && (site.format === info.body || site.format === info.fallbackBody);
        format = keepBody ? format : bodyFor(info);
        style = info.id;
        set.themeId = await themeForStyle(info, occasion, p.style_look);
      } else if (p.style === null) {
        style = null;
        if (p.format) format = p.format;
      } else if (p.format !== undefined && p.format !== site.format) {
        format = p.format;
        if (site.style) style = null;
      } else if (p.occasion !== undefined && p.occasion !== site.occasion && site.style && isStyleId(site.style)) {
        set.themeId = await themeForStyle(styleInfo(site.style), occasion, null);
      }
      const lookChanged = format !== site.format || style !== site.style;
      if (lookChanged) {
        set.format = format;
        set.style = style;
        const tier = getTier(site.tier);
        if (tier && !tierAllowsLook(tier, format, style)) throw new HttpError(400, `${tier.name} doesn't include that format. Upgrade to use it.`);
      }

      // Going live needs a paid plan. The first publish happens in the payment webhook;
      // this only re-opens a paid gift that the owner had taken offline.
      if (p.status !== undefined) {
        if (p.status === "published" && site.status !== "published") {
          if (!site.tier) throw new HttpError(402, "Pick a plan to publish this gift.");
          if (isExpired(site)) throw new HttpError(400, "This gift has ended.");
          // While it was offline it could collect past its plan's limits; it has to fit again to reopen.
          const reopenTier = getTier(site.tier);
          if (reopenTier) {
            const blocker = tierBlocker(reopenTier, await siteUsage(site.id), format, style);
            if (blocker) throw new HttpError(409, `${blocker} Upgrade, or hide a few, to reopen it.`);
          }
        }
        set.status = p.status;
      }

      if (Object.keys(set).length === 0) return site;
      const [row] = await tx.update(schema.giftSites).set(set).where(eq(schema.giftSites.id, site.id)).returning();
      return row!;
    });
    return { ok: true, site: siteRow(saved, { owner: true }), skipped };
  });

/** A JSON object with some keys replaced; null removes a key. */
function mergeKeys(current: unknown, patch: Record<string, unknown>): Record<string, Json> {
  const out: Record<string, unknown> = current && typeof current === "object" && !Array.isArray(current) ? { ...(current as Record<string, unknown>) } : {};
  for (const [k, v] of Object.entries(patch)) {
    if (v === null || v === undefined) delete out[k];
    else out[k] = v;
  }
  return out as Record<string, Json>;
}

export const deleteSite = createServerFn({ method: "POST" })
  .inputValidator(z.object({ id }))
  .handler(async ({ data }) => {
    await requireSiteOwner(data.id);
    const db = getDb();
    // Orders cascade with the gift, so a paid gift would take its payment record with it.
    const [paid] = await db
      .select({ id: schema.orders.id })
      .from(schema.orders)
      .where(and(eq(schema.orders.siteId, data.id), eq(schema.orders.status, "paid")))
      .limit(1);
    // A friendly 409, not a 500, when it was paid for in another tab after this page loaded.
    if (paid) throw new HttpError(409, "This gift has a paid plan, so it stays. You can unpublish it from the editor.");
    await db.delete(schema.giftSites).where(eq(schema.giftSites.id, data.id));
    // Every photo, voice note and picture stored for it goes too.
    const { deleteGiftMedia } = await import("@/server/uploads");
    await deleteGiftMedia(data.id);
    return { ok: true };
  });

/* ------------------------------------------------------------------ */
/* Modules                                                            */
/* ------------------------------------------------------------------ */

export const listModules = createServerFn({ method: "GET" })
  .inputValidator(z.object({ siteId: id }))
  .handler(async ({ data }) => {
    const rows = await getDb()
      .select()
      .from(schema.siteModules)
      .where(eq(schema.siteModules.siteId, data.siteId));
    return rows.map(toRow);
  });

export const setModuleEnabled = createServerFn({ method: "POST" })
  .inputValidator(z.object({ siteId: id, moduleType: z.enum(MODULE_TYPES), enabled: z.boolean() }))
  .handler(async ({ data }) => {
    await requireSiteOwner(data.siteId);
    if (!data.enabled) {
      // A gift always keeps at least one section, or friends have nothing to add to.
      const on = await getDb()
        .select({ type: schema.siteModules.moduleType })
        .from(schema.siteModules)
        .where(and(eq(schema.siteModules.siteId, data.siteId), eq(schema.siteModules.enabled, true)));
      if (on.length <= 1 && on.some((m) => m.type === data.moduleType))
        throw new HttpError(409, "A gift needs at least one section. Turn another one on first.");
    }
    await getDb()
      .insert(schema.siteModules)
      .values({ siteId: data.siteId, moduleType: data.moduleType, enabled: data.enabled, price: "0" })
      .onConflictDoUpdate({
        target: [schema.siteModules.siteId, schema.siteModules.moduleType],
        set: { enabled: data.enabled },
      });
    return { ok: true };
  });

/* ------------------------------------------------------------------ */
/* Contributions                                                      */
/* ------------------------------------------------------------------ */

const c = schema.contributions;
const publicColumns = {
  id: c.id,
  siteId: c.siteId,
  moduleType: c.moduleType,
  authorName: c.authorName,
  textContent: c.textContent,
  mediaUrl: c.mediaUrl,
  externalLink: c.externalLink,
  status: c.status,
  ornamentKey: c.ornamentKey,
  visibility: c.visibility,
  byOwner: c.byOwner,
  data: c.data,
  createdAt: c.createdAt,
};

/**
 * `onlyApproved: true` is the public view of a gift. Anything else (pending
 * and hidden items) is for the gift's creator only.
 */
export const listContributions = createServerFn({ method: "GET" })
  .inputValidator(z.object({ siteId: id, onlyApproved: z.boolean() }))
  .handler(async ({ data }) => {
    const db = getDb();
    if (!data.onlyApproved) {
      await requireSiteOwner(data.siteId);
      const rows = await db
        .select(publicColumns)
        .from(c)
        .where(eq(c.siteId, data.siteId))
        .orderBy(asc(c.createdAt));
      return rows.map(toRow);
    }
    if (!(await canViewGift(data.siteId, { allowSharedNotes: true }))) return [];
    const rows = await db
      .select(publicColumns)
      .from(c)
      .where(
        and(
          eq(c.siteId, data.siteId),
          eq(c.status, "approved"),
          or(ne(c.moduleType, "tree"), eq(c.visibility, "public")),
        ),
      )
      .orderBy(asc(c.createdAt));
    return rows.map((r) => toRow(sealCapsule(r)));
  });

/** Name, section and position only. Never other people's words, photos or audio. */
export const listSealedContributions = createServerFn({ method: "GET" })
  .inputValidator(z.object({ siteId: id }))
  .handler(async ({ data }) => {
    const rows = await getDb()
      .select({
        id: c.id,
        siteId: c.siteId,
        moduleType: c.moduleType,
        authorName: c.authorName,
        ornamentKey: c.ornamentKey,
        visibility: c.visibility,
        status: c.status,
        createdAt: c.createdAt,
        // Lets the friend page count friends without the organiser.
        byOwner: c.byOwner,
      })
      .from(c)
      .where(and(eq(c.siteId, data.siteId), inArray(c.status, ["pending", "approved"])))
      .orderBy(asc(c.createdAt));
    return rows.map(toRow);
  });

/** Every approved ornament; "only the recipient" messages come back without text. */
export const listPublicTreeOrnaments = createServerFn({ method: "GET" })
  .inputValidator(z.object({ siteId: id }))
  .handler(async ({ data }) => {
    if (!(await canViewGift(data.siteId))) return [];
    const rows = await getDb()
      .select({
        id: c.id,
        siteId: c.siteId,
        authorName: c.authorName,
        ornamentKey: c.ornamentKey,
        visibility: c.visibility,
        status: c.status,
        createdAt: c.createdAt,
        textContent: c.textContent,
      })
      .from(c)
      .where(and(eq(c.siteId, data.siteId), eq(c.moduleType, "tree"), eq(c.status, "approved")))
      .orderBy(asc(c.createdAt));
    return rows.map((row) =>
      toRow({ ...row, textContent: row.visibility === "public" ? row.textContent : null }),
    );
  });

export const submitContribution = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      id,
      editToken: id,
      siteId: id,
      moduleType: z.enum(GUEST_TYPES),
      authorName: z.string().trim().min(1, "Add your name so they know who it's from.").max(LIMITS.friendName, tooLong("your name", LIMITS.friendName)),
      textContent: shortText,
      mediaUrl,
      externalLink: link,
      ornamentKey: z.enum(ORNAMENT_KEYS).nullable(),
      visibility: z.enum(["public", "recipient"]),
      /** Random id from the friend's browser, used only for counting contributors. Optional for old clients. */
      deviceId: id.nullable().optional(),
      /** Extra fields for the newer sections. */
      data: jsonObject.nullable().optional(),
    }),
  )
  .handler(async ({ data }) => {
    const db = getDb();
    data.textContent = data.textContent?.trim() || null;
    const textMax = noteTextLimit(data.moduleType);
    if (data.textContent && [...data.textContent].length > textMax) throw new HttpError(422, tooLong(data.moduleType === "wordcloud" ? "your word" : "your note", textMax));
    const sectionData = sectionPayload(data.moduleType, data.data, data.textContent, data.mediaUrl, data.siteId);
    const [site] = await db.select().from(schema.giftSites).where(eq(schema.giftSites.id, data.siteId));
    if (!site) throw new HttpError(404, "We couldn't find that gift.");
    if (site.disabledAt) throw new HttpError(403, "This gift has been paused, so it isn't taking notes right now.");
    if (site.solo) throw new HttpError(403, "This gift is just from one person, so it isn't taking notes from friends.");
    // The same note sent twice (fast taps, a retry after a dropped connection) is saved once.
    const [already] = await db.select({ siteId: c.siteId, editToken: c.editToken }).from(c).where(eq(c.id, data.id));
    if (already) {
      if (already.siteId === data.siteId && already.editToken === data.editToken) return { ok: true as const, full: null };
      throw new HttpError(409, "Something got mixed up. Refresh the page and try again.");
    }
    rateLimit(`note:ip:${clientIp()}`, 30, 10 * 60_000, "You're adding notes very quickly. Wait a few minutes and try again.");
    rateLimit(`note:gift:${data.siteId}`, 200, 60 * 60_000, "This gift is getting a lot of notes right now. Try again in a little while.");
    const deviceId = data.deviceId ?? null;
    const [module] = await db
      .select({ enabled: schema.siteModules.enabled })
      .from(schema.siteModules)
      .where(and(eq(schema.siteModules.siteId, data.siteId), eq(schema.siteModules.moduleType, data.moduleType)));
    if (!module?.enabled) throw new HttpError(400, "That section isn't open on this gift.");
    // Paid plans have caps. Tell the friend kindly instead of failing. Checked and saved under one
    // lock, so friends sending at the same moment can't pass the cap together.
    const saved = await withRoom(data.siteId, async (tx, _site, room) => {
      const fits = await room({ authorName: data.authorName, moduleType: data.moduleType, deviceId });
      if (!fits.ok) return fits;
      const rows = await tx.insert(c).values({
        id: data.id,
        siteId: data.siteId,
        moduleType: data.moduleType,
        authorName: data.authorName,
        textContent: data.textContent,
        mediaUrl: data.mediaUrl,
        externalLink: data.externalLink,
        status: "pending",
        ornamentKey: data.moduleType === "tree" ? (data.ornamentKey ?? "bauble") : null,
        visibility: data.moduleType === "tree" ? data.visibility : "public",
        editToken: data.editToken,
        deviceId,
        data: sectionData,
      }).onConflictDoNothing({ target: c.id }).returning({ id: c.id });
      return { ok: true as const, inserted: rows };
    });
    if (!saved.ok) return { ok: false as const, full: saved.reason };
    const inserted = saved.inserted;
    // Two identical requests at the same moment: only the first one notifies.
    if (inserted.length) {
      await notifyNewNote(data.siteId, data.authorName).catch((e) => console.error("[notify]", e));
      await track("note_added", { siteId: data.siteId, props: { type: data.moduleType, by_owner: false } });
    }
    return { ok: true as const, full: null };
  });

/**
 * The creator's own notes, added from the editor (the whole gift on "Just me"
 * gifts). Approved straight away. Create when `id` is new, edit when it's one
 * of their own notes on this gift.
 */
export const saveOwnerNote = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      id,
      siteId: id,
      moduleType: z.enum(OWNER_NOTE_TYPES),
      authorName: z.string().trim().min(1, "Add your name so they know who it's from.").max(LIMITS.friendName, tooLong("your name", LIMITS.friendName)),
      textContent: shortText,
      mediaUrl,
      externalLink: link,
      data: jsonObject.nullable().optional(),
    }),
  )
  .handler(async ({ data }) => {
    const { user } = await requireSiteOwner(data.siteId);
    data.textContent = data.textContent?.trim() || null;
    const textMax = noteTextLimit(data.moduleType);
    if (data.textContent && [...data.textContent].length > textMax) throw new HttpError(422, tooLong(data.moduleType === "wordcloud" ? "the word" : "the note", textMax));
    const sectionData = sectionPayload(data.moduleType, data.data, data.textContent, data.mediaUrl, data.siteId);
    const db = getDb();
    const [existing] = await db
      .select({ siteId: c.siteId, byOwner: c.byOwner })
      .from(c)
      .where(eq(c.id, data.id));
    if (existing) {
      if (existing.siteId !== data.siteId || !existing.byOwner)
        throw new HttpError(403, "You can only edit your own notes here.");
      await db
        .update(c)
        .set({
          moduleType: data.moduleType,
          authorName: data.authorName,
          textContent: data.textContent,
          mediaUrl: data.mediaUrl,
          externalLink: data.externalLink,
          data: sectionData,
        })
        .where(eq(c.id, data.id));
      return { ok: true as const, full: null };
    }
    // The owner isn't a friend, so only the photo cap applies to their notes.
    const saved = await withRoom(data.siteId, async (tx, _site, room) => {
      const fits = await room({ authorName: data.authorName, moduleType: data.moduleType, byOwner: true });
      if (!fits.ok) return fits;
      // Turn the section on if it isn't yet, so the note actually shows.
      await tx
        .insert(schema.siteModules)
        .values({ siteId: data.siteId, moduleType: data.moduleType, price: "0", enabled: true })
        .onConflictDoUpdate({
          target: [schema.siteModules.siteId, schema.siteModules.moduleType],
          set: { enabled: true },
        });
      await tx.insert(c).values({
        id: data.id,
        siteId: data.siteId,
        moduleType: data.moduleType,
        authorName: data.authorName,
        textContent: data.textContent,
        mediaUrl: data.mediaUrl,
        externalLink: data.externalLink,
        status: "approved",
        visibility: "public",
        byOwner: true,
        data: sectionData,
      });
      return { ok: true as const };
    });
    if (!saved.ok) return { ok: false as const, full: saved.reason };
    await track("note_added", { siteId: data.siteId, userId: user.id, props: { type: data.moduleType, by_owner: true } });
    return { ok: true as const, full: null };
  });

/** For the contribute page: is there still room on this gift? (No counts, just yes/no.) */
export const getGiftRoom = createServerFn({ method: "GET" })
  .inputValidator(z.object({ siteId: id }))
  .handler(async ({ data }) => {
    rateLimit(`room:${clientIp()}`, 240, 60_000, READ_LIMIT);
    const [site] = await getDb().select().from(schema.giftSites).where(eq(schema.giftSites.id, data.siteId));
    if (!site) return { ended: false, contributorsFull: false, photosFull: false };
    const tier = getTier(site.tier);
    if (site.status !== "published" || !tier) {
      return { ended: false, contributorsFull: false, photosFull: false };
    }
    if (isExpired(site)) return { ended: true, contributorsFull: true, photosFull: true };
    const usage = await siteUsage(site.id);
    return {
      ended: false,
      contributorsFull: usage.contributors >= tier.contributors.cap,
      photosFull: usage.photos >= tier.photos.cap,
    };
  });

/* ------------------------------------------------------------------ */
/* Plans & payments                                                   */
/* ------------------------------------------------------------------ */

/** Paying needs a real account (the receipt, the "it's live" email, coming back later). */
function guestsSignInFirst(user: { isGuest: boolean }) {
  if (user.isGuest) throw new HttpError(401, GUEST_COPY.keep);
}

async function ownedSite(siteId: string) {
  const { user } = await requireSiteOwner(siteId);
  const [site] = await getDb().select().from(schema.giftSites).where(eq(schema.giftSites.id, siteId));
  if (!site) throw new HttpError(404, "We couldn't find that gift.");
  return { user, site };
}

/** Everything the editor needs to show plans, limits and the upgrade prompt. */
export const getBilling = createServerFn({ method: "GET" })
  .inputValidator(z.object({ siteId: id }))
  .handler(async ({ data }) => {
    const { site: before } = await ownedSite(data.siteId);
    // A payment that came in without a webhook (closed tab, paid after cancelling) is found here.
    const { reconcileSiteOrders } = await import("@/server/billing");
    await reconcileSiteOrders(before.id, "billing");
    const { site } = await ownedSite(data.siteId);
    await expireStaleOrders(site.id);
    const usage = await siteUsage(site.id);
    const tier = getTier(site.tier);
    const [latest] = await getDb()
      .select({ id: schema.orders.id, status: schema.orders.status, tier: schema.orders.tier, kind: schema.orders.kind })
      .from(schema.orders)
      .where(eq(schema.orders.siteId, site.id))
      .orderBy(desc(schema.orders.createdAt))
      .limit(1);
    return {
      tier: site.tier,
      legacy: site.tier === LEGACY_TIER,
      publishedAt: site.publishedAt?.toISOString() ?? null,
      expiresAt: site.expiresAt?.toISOString() ?? null,
      ended: isExpired(site),
      usage,
      limits: tier ? { contributors: tier.contributors.cap, photos: tier.photos.cap } : null,
      /** Each tier and why it doesn't fit (null = fits). */
      fit: TIERS.map((t) => ({ id: t.id, blocker: tierBlocker(t, usage, site.format, site.style) })),
      upgrades: upgradeOptions(site.tier).map((t) => ({
        id: t.id,
        amount: t.amount - (tier?.amount ?? 0),
        blocker: tierBlocker(t, usage, site.format, site.style),
      })),
      latestOrder: latest ?? null,
      /** Paused by us (a report): it can't be paid for or opened until it's un-paused. */
      paused: !!site.disabledAt,
      /** Price and length of one more stretch on the current plan (null for legacy or unpaid). */
      extend: tier ? { amount: tier.extendAmount, label: tier.liveFor.label } : null,
    };
  });

/** Creates an order and a PayMongo checkout. The amount is worked out here, never sent by the browser. */
export const startCheckout = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      siteId: id,
      tier: z.enum(["sweet", "celebration", "keepsake"]),
      code: z.string().max(40).optional(),
      /** What the plan picker showed; refused if the gift's plan changed since (another tab). */
      expect: z.enum(["publish", "upgrade"]).optional(),
    }),
  )
  .handler(async ({ data }) => {
    const { user, site } = await ownedSite(data.siteId);
    guestsSignInFirst(user);
    const { openCheckout } = await import("@/server/checkout");
    return openCheckout(user, site.id, { kind: "plan", tier: data.tier, code: data.code?.trim() || null, expect: data.expect });
  });

/**
 * "Have a code?" in the plan picker: what each plan would cost with it. Only a preview; the
 * price is worked out again on the server when checkout starts.
 */
export const previewDiscountCode = createServerFn({ method: "POST" })
  .inputValidator(z.object({ siteId: id, code: z.string().min(1).max(40) }))
  .handler(async ({ data }) => {
    const { user, site } = await ownedSite(data.siteId);
    guestsSignInFirst(user);
    const { codeProblem, findCode, priceWith, tooManyTries } = await import("@/server/discounts");
    if (tooManyTries(user.id)) return { ok: false as const, message: "That's a lot of codes. Try again in a few minutes." };
    if (getTier(site.tier)) return { ok: false as const, message: "Codes work when you first pick a plan." };
    const code = await findCode(data.code);
    const general = await codeProblem(code, null, user.id, undefined, { siteId: site.id });
    if (general || !code) return { ok: false as const, message: general ?? "We don't know that code." };
    const plans = await Promise.all(
      TIERS.map(async (t) => {
        const problem = await codeProblem(code, t, user.id, undefined, { siteId: site.id });
        const p = priceWith(code, t.amount);
        return { id: t.id, applies: !problem, amount: problem ? t.amount : p.amount, was: t.amount, free: !problem && p.amount === 0 };
      }),
    );
    return { ok: true as const, code: code.code, label: discountLabelOf(code), plans };
  });

/** Pays to keep a gift open for another stretch of its plan (works before or after it ends). */
export const startExtendCheckout = createServerFn({ method: "POST" })
  .inputValidator(z.object({ siteId: id }))
  .handler(async ({ data }) => {
    const { user, site } = await ownedSite(data.siteId);
    guestsSignInFirst(user);
    const { openCheckout } = await import("@/server/checkout");
    return openCheckout(user, site.id, { kind: "extend" });
  });

async function ownedOrder(orderId: string) {
  const user = await requireUser();
  const [order] = await getDb().select().from(schema.orders).where(eq(schema.orders.id, orderId));
  if (!order || (order.ownerId !== user.id && !user.isAdmin)) throw new HttpError(404, "We couldn't find that payment.");
  return order;
}

/**
 * Polled by the "Confirming your payment" page. The webhook is the main way an
 * order gets marked paid; as a backup we ask the provider directly (at most
 * every 5s per order) whenever the order isn't settled, including after a
 * cancel or a timeout, since the buyer may have paid in another tab. Nothing
 * from the browser is trusted.
 *
 * Someone else's order (or one that doesn't exist) comes back as `missing`
 * rather than an error, so the page can say so instead of retrying.
 */
export const getOrderStatus = createServerFn({ method: "GET" })
  .inputValidator(z.object({ orderId: id }))
  .handler(async ({ data }) => {
    const user = await requireUser();
    const { isSettled, isExpired: ended, reconcileOrder, refundsDue } = await import("@/server/billing");
    const load = async () => {
      const [row] = await getDb().select().from(schema.orders).where(eq(schema.orders.id, data.orderId));
      return row && (row.ownerId === user.id || user.isAdmin) ? row : null;
    };
    let order = await load();
    if (!order) return { id: data.orderId, status: "missing" as const, kind: null, tier: null, amount: 0, refund: 0, site: null };
    if (!isSettled(order.status)) {
      await reconcileOrder(order, "confirm", 5000);
      order = (await load()) ?? order;
    }
    /** Money we owe back on this order: all of it if it bought nothing, or what was paid over the price. */
    const refund = (await refundsDue([order.id])).get(order.id) ?? 0;
    const base = { id: order.id, status: order.status, kind: order.kind, tier: order.tier, amount: order.amount, refund };
    if (!order.siteId) return { ...base, site: null };
    const [site] = await getDb().select().from(schema.giftSites).where(eq(schema.giftSites.id, order.siteId));
    if (!site) return { ...base, site: null };
    return {
      ...base,
      site: {
        id: site.id,
        slug: site.slug,
        title: site.title,
        expiresAt: site.expiresAt?.toISOString() ?? null,
        /** The gift's plan now, so "Try again" offers what it can really buy (first plan, upgrade or extend). */
        tier: site.tier,
        ended: ended(site),
        recipient: ((site.customText as { recipient_name?: string } | null)?.recipient_name ?? "").trim() || null,
      },
    };
  });

/** The person came back from PayMongo via "cancel". A late payment still counts if it arrives. */
export const cancelOrder = createServerFn({ method: "POST" })
  .inputValidator(z.object({ orderId: id }))
  .handler(async ({ data }) => {
    const order = await ownedOrder(data.orderId);
    const { cancelCheckout } = await import("@/server/checkout");
    await cancelCheckout(order);
    return { ok: true };
  });

/**
 * Admin: payments we owe back (paid twice, paid more than an upgrade cost, or paid after the
 * gift was deleted), newest first. Refunds are made by hand in the PayMongo dashboard for now.
 */
export const listRefundsDue = createServerFn({ method: "GET" }).handler(async () => {
  await requireAdmin();
  const { REFUND_EVENT, refundAmountOf } = await import("@/server/billing");
  const l = schema.paymentLog;
  const o = schema.orders;
  const rows = await getDb()
    .select({
      at: l.at,
      outcome: l.outcome,
      orderId: l.orderId,
      paymentId: o.providerPaymentId,
      paid: o.amount,
      tier: o.tier,
      kind: o.kind,
      status: o.status,
      slug: schema.giftSites.slug,
    })
    .from(l)
    .leftJoin(o, eq(o.id, l.orderId))
    .leftJoin(schema.giftSites, eq(schema.giftSites.id, o.siteId))
    .where(eq(l.event, REFUND_EVENT))
    .orderBy(desc(l.at))
    .limit(50);
  return rows.map((r) => ({
    ...r,
    at: r.at.toISOString(),
    amount: refundAmountOf(r.outcome),
    why: r.outcome.replace(/^refund \d+: /, ""),
  }));
});

/* ---------------- Discount codes (admin) ---------------- */

const codeInput = z.object({
  code: z
    .string()
    .trim()
    .min(3)
    .max(40)
    .regex(/^[A-Za-z0-9_-]+$/, "Letters, numbers, dashes and underscores only."),
  type: z.enum(["percent", "fixed", "free"]),
  /** Percent (1 to 100) or pesos off for fixed; ignored for free. */
  value: z.number().min(0).max(100000),
  plans: z.array(z.enum(["sweet", "celebration", "keepsake"])).max(3),
  maxUses: z.number().int().min(1).max(1_000_000).nullable(),
  maxPerUser: z.number().int().min(1).max(1000).nullable(),
  expiresAt: z.string().datetime().nullable(),
  note: z.string().trim().max(200).optional(),
});

/** Admin: every code with its uses, and the latest paid orders that used one. */
export const listDiscountCodes = createServerFn({ method: "GET" }).handler(async () => {
  await requireAdmin();
  const db = getDb();
  const codes = await db.select().from(schema.discountCodes).orderBy(desc(schema.discountCodes.createdAt));
  const o = schema.orders;
  const recent = await db
    .select({ id: o.id, code: o.discountCode, tier: o.tier, amount: o.amount, off: o.discountAmount, at: o.updatedAt, siteId: o.siteId, slug: schema.giftSites.slug })
    .from(o)
    .leftJoin(schema.giftSites, eq(schema.giftSites.id, o.siteId))
    .where(and(eq(o.status, "paid"), sql`${o.discountCode} is not null`))
    .orderBy(desc(o.updatedAt))
    .limit(30);
  return {
    codes: codes.map((c) => ({ ...c, expiresAt: c.expiresAt?.toISOString() ?? null, createdAt: c.createdAt.toISOString(), label: discountLabelOf(c) })),
    recent: recent.map((r) => ({ ...r, at: r.at.toISOString() })),
  };
});

export const createDiscountCode = createServerFn({ method: "POST" })
  .inputValidator(codeInput)
  .handler(async ({ data }) => {
    const user = await requireAdmin();
    if (data.type === "percent" && (data.value < 1 || data.value > 100)) throw new HttpError(400, "Percent off has to be between 1 and 100.");
    if (data.type === "fixed" && data.value < 1) throw new HttpError(400, "Say how many pesos off.");
    const { findCode } = await import("@/server/discounts");
    if (await findCode(data.code)) throw new HttpError(400, "There's already a code with that name.");
    const [row] = await getDb()
      .insert(schema.discountCodes)
      .values({
        code: data.code.toUpperCase(),
        type: data.type,
        // Fixed amounts are typed in pesos and stored in centavos.
        value: data.type === "free" ? 0 : data.type === "fixed" ? Math.round(data.value * 100) : Math.round(data.value),
        plans: data.plans,
        maxUses: data.maxUses,
        maxPerUser: data.maxPerUser,
        expiresAt: data.expiresAt ? new Date(data.expiresAt) : null,
        note: data.note || null,
        createdBy: user.id,
      })
      .returning({ id: schema.discountCodes.id });
    return { id: row!.id };
  });

/** Admin: turn a code off or on, or change when it ends. Uses already counted stay. */
export const updateDiscountCode = createServerFn({ method: "POST" })
  .inputValidator(z.object({ id, active: z.boolean().optional(), expiresAt: z.string().datetime().nullable().optional() }))
  .handler(async ({ data }) => {
    await requireAdmin();
    await getDb()
      .update(schema.discountCodes)
      .set({
        ...(data.active !== undefined ? { active: data.active } : {}),
        ...(data.expiresAt !== undefined ? { expiresAt: data.expiresAt ? new Date(data.expiresAt) : null } : {}),
      })
      .where(eq(schema.discountCodes.id, data.id));
    return { ok: true };
  });

/** Admin: the latest payment signals and what we did with each (webhooks, checks, the daily job). */
export const listPaymentLog = createServerFn({ method: "GET" }).handler(async () => {
  await requireAdmin();
  const rows = await getDb().select().from(schema.paymentLog).orderBy(desc(schema.paymentLog.at)).limit(60);
  return rows.map((r) => ({ ...r, at: r.at.toISOString() }));
});

/** Admin checklist for sign-in. Reports what's set and the address Google must allow, never the values. */
export const getSignInSetup = createServerFn({ method: "GET" }).handler(async () => {
  await requireAdmin();
  const { siteUrl } = await import("@/server/email");
  const { googleEnabled } = await import("@/server/auth");
  const id = process.env["GOOGLE_CLIENT_ID"] ?? "";
  return {
    googleId: Boolean(id),
    /** Real client ids end like this; anything else is usually a pasted secret or a typo. */
    googleIdLooksRight: id.trim().endsWith(".apps.googleusercontent.com"),
    googleIdHasSpaces: id !== id.trim(),
    googleSecret: Boolean(process.env["GOOGLE_CLIENT_SECRET"]),
    googleOn: googleEnabled(),
    redirectUri: `${siteUrl()}/api/auth/callback/google`,
    deployment: process.env["VERCEL_DEPLOYMENT_ID"] ?? process.env["VERCEL_URL"] ?? "local",
  };
});

/** Admin checklist for payments. Reports what's set, never the values. */
export const getPaymentsSetup = createServerFn({ method: "GET" }).handler(async () => {
  await requireAdmin();
  const { siteUrl } = await import("@/server/email");
  const { enabledPaymentMethods } = await import("@/config/pricing");
  const key = process.env["PAYMONGO_SECRET_KEY"] ?? "";
  const mode = key.startsWith("sk_test_") ? "test" : key.startsWith("sk_live_") ? "live" : key ? "unknown" : "missing";
  const [counts] = await getDb()
    .select({
      paid: sql<number>`(count(*) filter (where ${schema.orders.status} = 'paid'))::int`,
      pending: sql<number>`(count(*) filter (where ${schema.orders.status} = 'pending'))::int`,
    })
    .from(schema.orders);
  // Card payments by where the card was issued (from plan_purchased events), to know when foreign buyers matter.
  const [cards] = await getDb()
    .select({
      local: sql<number>`(count(*) filter (where ${schema.events.props}->>'card_origin' = 'local'))::int`,
      foreign: sql<number>`(count(*) filter (where ${schema.events.props}->>'card_origin' = 'foreign'))::int`,
      unknown: sql<number>`(count(*) filter (where ${schema.events.props}->>'card_origin' = 'unknown'))::int`,
    })
    .from(schema.events)
    .where(eq(schema.events.name, "plan_purchased"));
  let webhooks: { url: string; events: string[]; status: string; livemode: boolean }[] | null = null;
  let webhooksError: string | null = null;
  if (mode === "test" || (mode === "live" && process.env["PAYMONGO_ALLOW_LIVE"] === "true")) {
    try {
      const { listWebhooks } = await import("@/server/payments/paymongo");
      webhooks = (await listWebhooks()).map(({ url, events, status, livemode }) => ({ url, events, status, livemode }));
    } catch (error) {
      console.error("[payments] listing webhooks failed", error);
      webhooksError = "We couldn't ask PayMongo for its webhooks.";
    }
  }
  const webhookUrl = `${siteUrl()}/api/webhooks/paymongo`;
  return {
    keyMode: mode,
    liveAllowed: process.env["PAYMONGO_ALLOW_LIVE"] === "true",
    webhooks,
    webhooksError,
    webhookReady:
      !!webhooks?.some(
        (w) => w.url === webhookUrl && w.status === "enabled" && w.events.includes("checkout_session.payment.paid"),
      ),
    webhookSecretSet: !!process.env["PAYMONGO_WEBHOOK_SECRET"],
    appBaseUrlSet: !!process.env["APP_BASE_URL"],
    webhookUrl,
    methods: enabledPaymentMethods,
    paidOrders: counts?.paid ?? 0,
    pendingOrders: counts?.pending ?? 0,
    cardPayments: { local: cards?.local ?? 0, foreign: cards?.foreign ?? 0, unknown: cards?.unknown ?? 0 },
  };
});

/** Admin: register (or fix) the PayMongo webhook for this site, using the key already in Vercel. */
export const setupPaymongoWebhook = createServerFn({ method: "POST" }).handler(async () => {
  await requireAdmin();
  const { siteUrl } = await import("@/server/email");
  const { ensureWebhook } = await import("@/server/payments/paymongo");
  try {
    const { action, webhook } = await ensureWebhook(`${siteUrl()}/api/webhooks/paymongo`);
    console.info(`[payments] webhook setup: ${action} (${webhook.livemode ? "live" : "test"}, ${webhook.status})`);
    return { ok: true, action };
  } catch (error) {
    console.error("[payments] webhook setup failed", error);
    throw new HttpError(502, "PayMongo didn't accept that. Check the secret key in Vercel and try again.");
  }
});

/** Keepsake (and legacy) gifts can pick their own link name. */
export const setCustomSlug = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      siteId: id,
      slug: z
        .string()
        .trim()
        .toLowerCase()
        .min(3, "Use at least 3 characters.")
        .max(60, "Keep it under 60 characters.")
        .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Use letters, numbers and dashes only."),
    }),
  )
  .handler(async ({ data }) => {
    const { site } = await ownedSite(data.siteId);
    const tier = getTier(site.tier);
    if (!(site.tier === LEGACY_TIER || tier?.features.customLinkName))
      throw new HttpError(403, "Custom link names come with Keepsake.");
    if (data.slug === site.slug) return { ok: true, slug: site.slug };
    const [taken] = await getDb()
      .select({ id: schema.giftSites.id })
      .from(schema.giftSites)
      .where(eq(schema.giftSites.slug, data.slug));
    const takenError = { ok: false, slug: site.slug, error: "That link name is taken. Try another." };
    if (taken) return takenError;
    try {
      await getDb().update(schema.giftSites).set({ slug: data.slug }).where(eq(schema.giftSites.id, site.id));
    } catch (error) {
      // Two gifts asking for the same name at the same moment: the second one loses, kindly.
      const { isUniqueViolation } = await import("@/server/db/errors");
      if (isUniqueViolation(error)) return takenError;
      throw error;
    }
    return { ok: true, slug: data.slug };
  });

async function ownDraftContribution(contributionId: string, token: string) {
  const db = getDb();
  const [row] = await db
    .select({ id: c.id, siteId: c.siteId, moduleType: c.moduleType, status: schema.giftSites.status })
    .from(c)
    .innerJoin(schema.giftSites, eq(schema.giftSites.id, c.siteId))
    .where(and(eq(c.id, contributionId), eq(c.editToken, token)));
  if (!row || row.status !== "draft") return null;
  return row;
}

export const updateOwnContribution = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      id,
      token: id,
      textContent: shortText,
      externalLink: link,
      mediaUrl,
      visibility: z.enum(["public", "recipient"]).nullable(),
      data: jsonObject.nullable().optional(),
    }),
  )
  .handler(async ({ data }) => {
    const row = await ownDraftContribution(data.id, data.token);
    if (!row) return { ok: false };
    data.textContent = data.textContent?.trim() || null;
    const textMax = noteTextLimit(row.moduleType as never);
    if (data.textContent && [...data.textContent].length > textMax) throw new HttpError(422, tooLong("your note", textMax));
    const sectionData = data.data !== undefined ? sectionPayload(row.moduleType, data.data, data.textContent, data.mediaUrl ?? "keep", row.siteId) : undefined;
    await getDb()
      .update(c)
      .set({
        textContent: data.textContent,
        externalLink: data.externalLink,
        ...(data.mediaUrl ? { mediaUrl: data.mediaUrl } : {}),
        ...(row.moduleType === "tree" && data.visibility ? { visibility: data.visibility } : {}),
        ...(sectionData !== undefined ? { data: sectionData } : {}),
        status: "pending",
      })
      .where(eq(c.id, data.id));
    return { ok: true };
  });

export const deleteOwnContribution = createServerFn({ method: "POST" })
  .inputValidator(z.object({ id, token: id }))
  .handler(async ({ data }) => {
    const row = await ownDraftContribution(data.id, data.token);
    if (!row) return { ok: false };
    const gone = await getDb().delete(c).where(eq(c.id, data.id)).returning({ media: c.mediaUrl, data: c.data });
    const { deleteMedia } = await import("@/server/uploads");
    await deleteMedia(gone.flatMap((r) => [r.media, ...mediaInData(r.data)]));
    return { ok: true };
  });

/** Stored files a newer section keeps in `data` (a capsule photo, a doodle...). */
function mediaInData(data: unknown): string[] {
  if (!data || typeof data !== "object") return [];
  return Object.values(data as Record<string, unknown>).filter((v): v is string => typeof v === "string" && /^(https:\/\/[\w.-]+\.public\.blob\.vercel-storage\.com\/|\/api\/dev-uploads\/)/.test(v));
}

async function contributionSite(contributionIds: string[]) {
  const rows = await getDb()
    .select({ siteId: c.siteId })
    .from(c)
    .where(inArray(c.id, contributionIds));
  const sites = [...new Set(rows.map((r) => r.siteId))];
  if (sites.length !== 1 || rows.length !== contributionIds.length)
    throw new HttpError(404, "We couldn't find those contributions.");
  return sites[0]!;
}

export const setContributionStatus = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({ ids: z.array(id).min(1).max(500), status: z.enum(["pending", "approved", "hidden"]) }),
  )
  .handler(async ({ data }) => {
    const siteId = await contributionSite(data.ids);
    await requireSiteOwner(siteId);
    if (data.status === "hidden") {
      await getDb().update(c).set({ status: data.status }).where(inArray(c.id, data.ids));
      return { ok: true };
    }
    // Showing hidden items again counts towards the plan, like a new note would, under the same
    // lock as friends sending notes so the two can't pass the cap together.
    await withRoom(siteId, async (tx, _site, room) => {
      const hidden = await tx.select().from(c).where(and(inArray(c.id, data.ids), eq(c.status, "hidden")));
      for (const row of hidden) {
        const fits = await room({ authorName: row.authorName, moduleType: row.moduleType, deviceId: row.deviceId, byOwner: row.byOwner });
        if (!fits.ok && fits.reason !== "ended") {
          throw new HttpError(409, fits.reason === "photos" ? "This gift has all the photos its plan holds. Upgrade to show more." : "This gift has all the friends its plan holds. Upgrade to show more.");
        }
        await tx.update(c).set({ status: data.status }).where(eq(c.id, row.id));
      }
      await tx.update(c).set({ status: data.status }).where(inArray(c.id, data.ids));
    });
    return { ok: true };
  });

export const deleteContributions = createServerFn({ method: "POST" })
  .inputValidator(z.object({ ids: z.array(id).min(1).max(500) }))
  .handler(async ({ data }) => {
    await requireSiteOwner(await contributionSite(data.ids));
    const gone = await getDb().delete(c).where(inArray(c.id, data.ids)).returning({ media: c.mediaUrl, data: c.data });
    const { deleteMedia } = await import("@/server/uploads");
    await deleteMedia(gone.flatMap((r) => [r.media, ...mediaInData(r.data)]));
    return { ok: true };
  });

/* ------------------------------------------------------------------ */
/* Calendar                                                           */
/* ------------------------------------------------------------------ */

export const listCalendarEntries = createServerFn({ method: "GET" })
  .inputValidator(z.object({ siteId: id }))
  .handler(async ({ data }) => {
    const [site] = await getDb().select().from(schema.giftSites).where(eq(schema.giftSites.id, data.siteId));
    if (!site) return [];
    // Behind a password, the calendar's surprises wait for the password too.
    if (needsPassword(site) && !isUnlocked(site) && !isOwnerOf(await currentUser(), site)) return [];
    const rows = await getDb()
      .select()
      .from(schema.calendarEntries)
      .where(eq(schema.calendarEntries.siteId, data.siteId))
      .orderBy(asc(schema.calendarEntries.entryDate));
    return rows.map(toRow);
  });

export const upsertCalendarEntry = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      siteId: id,
      entryDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      type: z.enum(["message", "photo", "song"]),
      textContent: shortText,
      mediaUrl,
      externalLink: link,
    }),
  )
  .handler(async ({ data }) => {
    await requireSiteOwner(data.siteId);
    const values = {
      siteId: data.siteId,
      entryDate: data.entryDate,
      type: data.type,
      textContent: data.textContent,
      mediaUrl: data.mediaUrl,
      externalLink: data.externalLink,
    };
    await getDb()
      .insert(schema.calendarEntries)
      .values(values)
      .onConflictDoUpdate({
        target: [schema.calendarEntries.siteId, schema.calendarEntries.entryDate],
        set: values,
      });
    return { ok: true };
  });

export const deleteCalendarEntry = createServerFn({ method: "POST" })
  .inputValidator(z.object({ id }))
  .handler(async ({ data }) => {
    const db = getDb();
    const [row] = await db
      .select({ siteId: schema.calendarEntries.siteId })
      .from(schema.calendarEntries)
      .where(eq(schema.calendarEntries.id, data.id));
    if (!row) return { ok: true };
    await requireSiteOwner(row.siteId);
    await db.delete(schema.calendarEntries).where(eq(schema.calendarEntries.id, data.id));
    return { ok: true };
  });

/* ------------------------------------------------------------------ */
/* Concierge beta ("Want us to handle it?"), handled by hand            */
/* ------------------------------------------------------------------ */

const CONCIERGE_STATUSES = ["new", "contacted", "in_progress", "done"] as const;

export const submitConciergeRequest = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      siteId: id.nullable(),
      recipient: z.string().trim().min(1, "Add who it's for.").max(LIMITS.recipientName, tooLong("their name", LIMITS.recipientName)),
      occasion: z.string().trim().min(1, "Add the occasion.").max(80, tooLong("the occasion", 80)),
      deadline: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Pick the day it needs to be ready."),
      friends: z.number().int().min(1, "About how many friends?").max(1000),
      contact: z.string().trim().min(3, "Tell us how to reach you.").max(160, tooLong("how to reach you", 160)),
      timeZone: z.string().trim().min(1).max(64),
      notes: z.string().trim().max(1500, tooLong("the notes", 1500)).optional(),
    }),
  )
  .handler(async ({ data }) => {
    const user = await requireUser();
    rateLimit(`concierge:${user.id}`, 5, 24 * 60 * 60_000, "You've sent a few requests today. We'll be in touch soon.");
    if (data.siteId) await requireSiteOwner(data.siteId);
    const today = new Date().toISOString().slice(0, 10);
    if (data.deadline < today) throw new HttpError(422, "That day has already passed. Pick a day from today on.");
    const [row] = await getDb()
      .insert(schema.conciergeRequests)
      .values({
        userId: user.id,
        siteId: data.siteId,
        recipient: data.recipient,
        occasion: data.occasion,
        deadline: data.deadline,
        friends: data.friends,
        contact: data.contact,
        timeZone: data.timeZone,
        notes: data.notes || null,
      })
      .returning({ id: schema.conciergeRequests.id });
    // Who gets it: CONCIERGE_EMAIL if it's set (see .env.example), otherwise every admin.
    const { conciergeRequestEmail, siteUrl } = await import("@/server/email");
    const to = process.env["CONCIERGE_EMAIL"]
      ? [process.env["CONCIERGE_EMAIL"]]
      : (await getDb().select({ email: schema.user.email }).from(schema.user).where(eq(schema.user.isAdmin, true))).map((a) => a.email);
    for (const email of to)
      await conciergeRequestEmail({
        to: email,
        organiser: user.name || user.email,
        recipient: data.recipient,
        occasion: data.occasion,
        deadline: data.deadline,
        friends: data.friends,
        contact: data.contact,
        timeZone: data.timeZone,
        notes: data.notes || null,
        adminUrl: `${siteUrl()}/admin#concierge`,
        giftUrl: data.siteId ? `${siteUrl()}/sites/${data.siteId}` : null,
      });
    return { ok: true as const, id: row!.id };
  });

export const listConciergeRequests = createServerFn({ method: "GET" }).handler(async () => {
  await requireAdmin();
  const r = schema.conciergeRequests;
  const rows = await getDb()
    .select({
      id: r.id,
      siteId: r.siteId,
      recipient: r.recipient,
      occasion: r.occasion,
      deadline: r.deadline,
      friends: r.friends,
      contact: r.contact,
      timeZone: r.timeZone,
      notes: r.notes,
      status: r.status,
      createdAt: r.createdAt,
      organiser: schema.user.name,
      organiserEmail: schema.user.email,
    })
    .from(r)
    .leftJoin(schema.user, eq(schema.user.id, r.userId))
    .orderBy(desc(r.createdAt))
    .limit(200);
  return rows.map(toRow);
});

export const setConciergeStatus = createServerFn({ method: "POST" })
  .inputValidator(z.object({ id, status: z.enum(CONCIERGE_STATUSES) }))
  .handler(async ({ data }) => {
    await requireAdmin();
    await getDb()
      .update(schema.conciergeRequests)
      .set({ status: data.status, updatedAt: new Date() })
      .where(eq(schema.conciergeRequests.id, data.id));
    return { ok: true };
  });
/* Metrics (our own events table, see src/server/events.ts)            */
/* ------------------------------------------------------------------ */

/**
 * Events the browser reports: a share, a friend page view, a recipient opening the gift,
 * a "make your own" click. The organiser's own views don't count. Never throws.
 */
export const trackClientEvent = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      name: z.enum(CLIENT_EVENTS),
      siteId: id,
      props: z.record(z.string(), z.union([z.string().max(40), z.boolean()])).optional(),
    }),
  )
  .handler(async ({ data }) => {
    try {
      rateLimit(`event:${clientIp()}`, 60, 60_000, "slow down");
    } catch {
      return { ok: false };
    }
    const [site] = await getDb()
      .select({ id: schema.giftSites.id, creatorId: schema.giftSites.creatorId, status: schema.giftSites.status })
      .from(schema.giftSites)
      .where(eq(schema.giftSites.id, data.siteId));
    if (!site) return { ok: false };
    const me = await currentUser();
    const isOwner = !!me && me.id === site.creatorId;
    // Shares are the organiser's; views and opens only count when it isn't them looking.
    if (data.name === "invite_shared" && !isOwner) return { ok: false };
    if (data.name !== "invite_shared" && data.name !== "make_your_own_clicked" && isOwner) return { ok: false };
    if (data.name === "gift_opened" && site.status !== "published") return { ok: false };
    await track(data.name, { siteId: site.id, userId: me?.id ?? null, ...(data.props ? { props: data.props } : {}) });
    return { ok: true };
  });

const median = (xs: number[]) => {
  if (!xs.length) return null;
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m]! : (s[m - 1]! + s[m]!) / 2;
};

/** The admin metrics page. Counts gifts and notes from the real tables, and the rest from events. */
export const getMetrics = createServerFn({ method: "GET" })
  .inputValidator(z.object({ days: z.number().int().min(1).max(365) }))
  .handler(async ({ data }) => {
    await requireAdmin();
    const db = getDb();
    const since = sql`now() - make_interval(days => ${data.days})`;
    const ev = schema.events;
    const gifts = await db
      .select({
        id: schema.giftSites.id,
        notes: sql<number>`(select count(*)::int from contributions c where c.site_id = "gift_sites"."id" and c.status = 'approved')`,
      })
      .from(schema.giftSites)
      .where(sql`${schema.giftSites.createdAt} > ${since}`);
    const counts = await db
      .select({ name: ev.name, n: sql<number>`count(*)::int`, sites: sql<number>`count(distinct ${ev.siteId})::int` })
      .from(ev)
      .where(sql`${ev.createdAt} > ${since}`)
      .groupBy(ev.name);
    const byName = Object.fromEntries(counts.map((r) => [r.name, r]));
    const friendNotes = await db
      .select({ n: sql<number>`count(*)::int` })
      .from(ev)
      .where(and(eq(ev.name, "note_added"), sql`${ev.createdAt} > ${since}`, sql`coalesce((${ev.props}->>'by_owner')::boolean, false) = false`));
    // Wrapped gifts that were then paid for (the first plan, not upgrades).
    const [wrapPay] = await db
      .select({
        wrapped: sql<number>`count(distinct w.site_id)::int`,
        paid: sql<number>`count(distinct p.site_id)::int`,
      })
      .from(sql`events w left join events p on p.site_id = w.site_id and p.name = 'plan_purchased' and p.props->>'kind' = 'publish'`)
      .where(sql`w.name = 'gift_wrapped' and w.created_at > ${since}`);
    // Gifts published in the window that the recipient opened at least once.
    const [opens] = await db
      .select({
        published: sql<number>`count(*)::int`,
        opened: sql<number>`count(*) filter (where exists (select 1 from events e where e.site_id = gift_sites.id and e.name = 'gift_opened'))::int`,
      })
      .from(schema.giftSites)
      .where(sql`${schema.giftSites.publishedAt} > ${since}`);
    // Sign-up to first share, for people who signed up in the window.
    const shares = await db.execute<{ hours: number }>(sql`
      select extract(epoch from (min(e.created_at) - u.created_at)) / 3600 as hours
      from "user" u join events e on e.user_id = u.id and e.name = 'invite_shared'
      where u.created_at > ${since}
      group by u.id, u.created_at`);
    const hours = [...shares].map((r) => Number(r.hours)).filter((h) => Number.isFinite(h));
    const pct = (a: number, b: number) => (b > 0 ? Math.round((a / b) * 1000) / 10 : null);
    const views = byName["friend_page_viewed"]?.n ?? 0;
    return {
      days: data.days,
      gifts: gifts.length,
      giftsWith5: gifts.filter((g) => g.notes >= 5).length,
      pctWith5: pct(gifts.filter((g) => g.notes >= 5).length, gifts.length),
      friendViews: views,
      friendNotes: friendNotes[0]?.n ?? 0,
      viewToNote: pct(friendNotes[0]?.n ?? 0, views),
      wrapped: wrapPay?.wrapped ?? 0,
      paid: wrapPay?.paid ?? 0,
      wrapToPay: pct(wrapPay?.paid ?? 0, wrapPay?.wrapped ?? 0),
      published: opens?.published ?? 0,
      opened: opens?.opened ?? 0,
      openRate: pct(opens?.opened ?? 0, opens?.published ?? 0),
      medianHoursToShare: median(hours),
      sharers: hours.length,
      events: counts.map((r) => ({ name: r.name, count: r.n, gifts: r.sites })).sort((a, b) => a.name.localeCompare(b.name)),
    };
  });

/**
 * Admin: how each theme does, from events. Region is the visitor's country (payments use the
 * country the gift was made from). Sorted by paid conversion: this decides which themes to build more of.
 */
export const getThemeMetrics = createServerFn({ method: "GET" })
  .inputValidator(z.object({ days: z.number().int().min(1).max(365), region: z.string().regex(/^[A-Z]{2}$/).nullable() }))
  .handler(async ({ data }) => {
    await requireAdmin();
    const db = getDb();
    const since = sql`now() - make_interval(days => ${data.days})`;
    const rows = await db.execute<{
      theme: string | null;
      created: number;
      opened: number;
      started: number;
      completed: number;
      replayed: number;
      shared: number;
      paid: number;
      myo: number;
    }>(sql`
      with ev as (
        select e.name, e.site_id, e.props->>'kind' as kind,
          coalesce(e.props->>'theme', s.theme_id::text) as theme,
          coalesce(e.props->>'region', (select g.props->>'region' from events g where g.site_id = e.site_id and g.name = 'gift_created' limit 1)) as region
        from events e left join gift_sites s on s.id = e.site_id
        where e.created_at > ${since} and e.site_id is not null
      )
      select theme,
        count(*) filter (where name = 'gift_created')::int as created,
        count(*) filter (where name = 'gift_opened')::int as opened,
        count(*) filter (where name = 'theme_opening_started')::int as started,
        count(*) filter (where name = 'theme_opening_completed')::int as completed,
        count(*) filter (where name = 'theme_replayed')::int as replayed,
        count(*) filter (where name = 'theme_shared')::int as shared,
        count(distinct site_id) filter (where name = 'plan_purchased' and kind = 'publish')::int as paid,
        count(*) filter (where name = 'make_your_own_clicked')::int as myo
      from ev
      where ${data.region}::text is null or region = ${data.region}
      group by theme`);
    const regions = await db.execute<{ region: string }>(sql`
      select distinct props->>'region' as region from events
      where created_at > ${since} and props ? 'region' order by 1`);
    const themes = await db.select({ id: schema.themes.id, name: schema.themes.name }).from(schema.themes);
    const nameOf = new Map(themes.map((t) => [t.id, t.name]));
    const rate = (a: number, b: number) => (b > 0 ? Math.round((a / b) * 1000) / 10 : null);
    const list = [...rows].map((r) => ({
      theme: r.theme ? (nameOf.get(r.theme) ?? "Removed theme") : "No theme",
      created: r.created,
      completion: rate(r.completed, r.started),
      replay: rate(r.replayed, r.completed),
      share: rate(r.shared, r.opened),
      paid: rate(r.paid, r.created),
      makeYourOwn: rate(r.myo, r.opened),
      counts: { opened: r.opened, started: r.started, completed: r.completed, paid: r.paid },
    }));
    list.sort((a, b) => (b.paid ?? -1) - (a.paid ?? -1) || b.created - a.created);
    return { rows: list, regions: [...regions].map((r) => r.region).filter(Boolean) };
  });
