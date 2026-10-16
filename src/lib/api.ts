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
import { FORMAT_IDS } from "@/lib/formats";
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
import { notifyNewNote } from "@/server/notify";
import { clientIp, rateLimit } from "@/server/rateLimit";
import {
  checkRoom,
  expireStaleOrders,
  isExpired,
  isOpen,
  quote,
  quoteExtend,
  siteUsage,
  tierBlocker,
  upgradeOptions,
} from "@/server/billing";
import { TIERS, LEGACY_TIER, getTier, hasFeature } from "@/config/pricing";
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
function sectionPayload(type: string, raw: unknown, text: string | null, media: string | null) {
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

function slugify(value: string) {
  const base = value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 40);
  return `${base || "gift"}-${Math.random().toString(36).slice(2, 7)}`;
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
    return db.transaction(async (tx) => {
      const [site] = await tx
        .insert(schema.giftSites)
        .values({
          creatorId: user.id,
          title: data.title,
          themeId: data.themeId,
          format: data.format,
          slug: slugify(data.title),
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
  });

const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable();

export const updateSite = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      id,
      patch: z.object({
        title: z.string().trim().min(1).max(200),
        custom_text: jsonObject,
        custom_colors: paletteShape,
        font_choice: z.enum(FONT_CHOICE_IDS),
        countdown_date: date,
        countdown_at: z.string().datetime({ offset: true }).nullable().optional(),
        calendar_locked: z.boolean(),
        intro_text: z.string().trim().max(LIMITS.greeting, tooLong("the greeting", LIMITS.greeting)).nullable(),
        background_style: z.enum(["paper", "clean", "formal", "gradient"]),
        tree_reveal_date: date,
        palette_id: id.nullable(),
        share_notes: z.boolean(),
        status: z.enum(["draft", "published"]).optional(),
        format: z.enum(FORMAT_IDS),
        format_settings: jsonObject,
        solo: z.boolean().optional(),
      }),
    }),
  )
  .handler(async ({ data }) => {
    await requireSiteOwner(data.id);
    const [site] = await getDb().select().from(schema.giftSites).where(eq(schema.giftSites.id, data.id));
    if (!site) throw new HttpError(404, "We couldn't find that gift.");
    const p = data.patch;
    // Words: trimmed, with the same limits the editor's counters show.
    const cleanText: Record<string, string> = {};
    for (const [k, v] of Object.entries(p.custom_text)) {
      if (typeof v !== "string") continue;
      const t = v.trim();
      const max = customTextLimit(k);
      if ([...t].length > max) throw new HttpError(422, tooLong(FIELD_NAMES[k] ?? "that title", max));
      if (t) cleanText[k] = t;
    }
    p.custom_text = cleanText;
    // Going live needs a paid plan. The first publish happens in the payment webhook;
    // this only re-opens a paid gift that the owner had taken offline.
    if (p.status === "published" && site.status !== "published") {
      if (!site.tier) throw new HttpError(402, "Pick a plan to publish this gift.");
      if (isExpired(site)) throw new HttpError(400, "This gift has ended.");
      // While it was offline it could collect past its plan's limits; it has to fit again to reopen.
      const reopenTier = getTier(site.tier);
      if (reopenTier) {
        const blocker = tierBlocker(reopenTier, await siteUsage(site.id), p.format);
        if (blocker) throw new HttpError(409, `${blocker} Upgrade, or hide a few, to reopen it.`);
      }
    }
    const tier = getTier(site.tier);
    if (tier && !tier.formats.includes(p.format)) {
      throw new HttpError(400, `${tier.name} doesn't include that format. Upgrade to use it.`);
    }
    await getDb()
      .update(schema.giftSites)
      .set({
        title: p.title,
        customText: p.custom_text,
        customColors: p.custom_colors,
        fontChoice: p.font_choice,
        countdownDate: p.countdown_date,
        ...(p.countdown_at !== undefined ? { countdownAt: p.countdown_at ? new Date(p.countdown_at) : null } : {}),
        calendarLocked: p.calendar_locked,
        introText: p.intro_text,
        backgroundStyle: p.background_style,
        treeRevealDate: p.tree_reveal_date,
        paletteId: p.palette_id,
        shareNotes: p.share_notes,
        ...(p.status ? { status: p.status } : {}),
        format: p.format,
        formatSettings: p.format_settings,
        ...(p.solo !== undefined ? { solo: p.solo } : {}),
      })
      .where(eq(schema.giftSites.id, data.id));
    return { ok: true };
  });

/** The creator's custom opening. Cleaned server side: only known keys, hex colors, safe upload URLs. */
export const updateIntroSettings = createServerFn({ method: "POST" })
  .inputValidator(z.object({ id, settings: jsonObject }))
  .handler(async ({ data }) => {
    await requireSiteOwner(data.id);
    if (JSON.stringify(data.settings).length > 12_000) throw new HttpError(400, "That opening has too much in it.");
    const settings = normalizeIntroSettings(data.settings);
    await getDb()
      .update(schema.giftSites)
      .set({ introSettings: settings })
      .where(eq(schema.giftSites.id, data.id));
    return { ok: true, settings };
  });

/** The gift's cast: its character and icon set. Cleaned server side; null = theme default. */
export const updateCast = createServerFn({ method: "POST" })
  .inputValidator(z.object({ id, character: jsonObject.nullable(), iconSet: jsonObject.nullable() }))
  .handler(async ({ data }) => {
    await requireSiteOwner(data.id);
    const character = data.character ? normalizeCharacter(data.character) : null;
    const iconSet = data.iconSet ? normalizeIconSetting(data.iconSet) : null;
    await getDb()
      .update(schema.giftSites)
      .set({ character, iconSet })
      .where(eq(schema.giftSites.id, data.id));
    return { ok: true, character, iconSet };
  });

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
    if (paid) throw new Error("This gift has a paid plan, so it stays. You can unpublish it from the editor.");
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
    const sectionData = sectionPayload(data.moduleType, data.data, data.textContent, data.mediaUrl);
    const [site] = await db.select().from(schema.giftSites).where(eq(schema.giftSites.id, data.siteId));
    if (!site) throw new HttpError(404, "We couldn't find that gift.");
    if (site.solo) throw new HttpError(403, "This gift is just from one person, so it isn't taking notes from friends.");
    // The same note sent twice (fast taps, a retry after a dropped connection) is saved once.
    const [already] = await db.select({ siteId: c.siteId, editToken: c.editToken }).from(c).where(eq(c.id, data.id));
    if (already) {
      if (already.siteId === data.siteId && already.editToken === data.editToken) return { ok: true as const, full: null };
      throw new HttpError(409, "Something got mixed up. Refresh the page and try again.");
    }
    rateLimit(`note:ip:${clientIp()}`, 30, 10 * 60_000, "You're adding notes very quickly. Wait a few minutes and try again.");
    rateLimit(`note:gift:${data.siteId}`, 200, 60 * 60_000, "This gift is getting a lot of notes right now. Try again in a little while.");
    // Paid plans have caps. Tell the friend kindly instead of failing.
    const deviceId = data.deviceId ?? null;
    const room = await checkRoom(site, data.authorName, data.moduleType, deviceId);
    if (!room.ok) return { ok: false as const, full: room.reason };
    const [module] = await db
      .select({ enabled: schema.siteModules.enabled })
      .from(schema.siteModules)
      .where(and(eq(schema.siteModules.siteId, data.siteId), eq(schema.siteModules.moduleType, data.moduleType)));
    if (!module?.enabled) throw new HttpError(400, "That section isn't open on this gift.");
    const inserted = await db.insert(c).values({
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
    // Two identical requests at the same moment: only the first one notifies.
    if (inserted.length) await notifyNewNote(data.siteId, data.authorName).catch((e) => console.error("[notify]", e));
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
    await requireSiteOwner(data.siteId);
    data.textContent = data.textContent?.trim() || null;
    const textMax = noteTextLimit(data.moduleType);
    if (data.textContent && [...data.textContent].length > textMax) throw new HttpError(422, tooLong(data.moduleType === "wordcloud" ? "the word" : "the note", textMax));
    const sectionData = sectionPayload(data.moduleType, data.data, data.textContent, data.mediaUrl);
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
    const [site] = await db.select().from(schema.giftSites).where(eq(schema.giftSites.id, data.siteId));
    if (!site) throw new HttpError(404, "We couldn't find that gift.");
    const room = await checkRoom(site, data.authorName, data.moduleType, null);
    if (!room.ok) return { ok: false as const, full: room.reason };
    // Turn the section on if it isn't yet, so the note actually shows.
    await db
      .insert(schema.siteModules)
      .values({ siteId: data.siteId, moduleType: data.moduleType, price: "0", enabled: true })
      .onConflictDoUpdate({
        target: [schema.siteModules.siteId, schema.siteModules.moduleType],
        set: { enabled: true },
      });
    const inserted = await db.insert(c).values({
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
      fit: TIERS.map((t) => ({ id: t.id, blocker: tierBlocker(t, usage, site.format) })),
      upgrades: upgradeOptions(site.tier).map((t) => ({
        id: t.id,
        amount: t.amount - (tier?.amount ?? 0),
        blocker: tierBlocker(t, usage, site.format),
      })),
      latestOrder: latest ?? null,
      /** Price and length of one more stretch on the current plan (null for legacy or unpaid). */
      extend: tier ? { amount: tier.extendAmount, label: tier.liveFor.label } : null,
    };
  });

type Quote = Awaited<ReturnType<typeof quote>>;

/** Saves the order and opens a PayMongo checkout for it. The amount always comes from the quote. */
async function openCheckout(
  user: { id: string; email: string; name: string },
  site: typeof schema.giftSites.$inferSelect,
  q: Quote,
) {
  const db = getDb();
  const [order] = await db
    .insert(schema.orders)
    .values({
      siteId: site.id,
      ownerId: user.id,
      kind: q.kind,
      tier: q.tier.id,
      fromTier: q.fromTier,
      amount: q.amount,
      currency: "PHP",
      promoApplied: q.promoApplied,
      provider: "paymongo",
    })
    .returning({ id: schema.orders.id });
  const { getProvider } = await import("@/server/payments");
  const { siteUrl } = await import("@/server/email");
  const base = siteUrl();
  const recipient =
    ((site.customText as { recipient_name?: string } | null)?.recipient_name ?? "").trim() || site.title;
  const itemName =
    q.kind === "upgrade"
      ? `Upgrade to ${q.tier.name}`
      : q.kind === "extend"
        ? `Keep the gift open for ${q.tier.liveFor.label} more`
        : `Just Because ${q.tier.name}`;
  const itemDescription =
    q.kind === "extend"
      ? `${recipient}'s gift, ${q.tier.name} plan, open for another ${q.tier.liveFor.label}`
      : `${recipient}'s gift, ${q.tier.name} plan (live for ${q.tier.liveFor.label})`;
  try {
    const provider = getProvider("paymongo");
    const checkout = await provider.createCheckout({
      orderId: order!.id,
      siteId: site.id,
      amount: q.amount,
      currency: "PHP",
      itemName,
      itemDescription,
      successUrl: `${base}/checkout/${order!.id}`,
      cancelUrl: `${base}/checkout/${order!.id}?cancelled=1`,
      customerEmail: user.email,
      customerName: user.name,
    });
    await db
      .update(schema.orders)
      .set({ providerCheckoutId: checkout.checkoutId, updatedAt: new Date() })
      .where(eq(schema.orders.id, order!.id));
    return { orderId: order!.id, checkoutUrl: checkout.checkoutUrl };
  } catch (error) {
    console.error("[payments] createCheckout failed", error);
    await db
      .update(schema.orders)
      .set({ status: "failed", updatedAt: new Date() })
      .where(eq(schema.orders.id, order!.id));
    throw new HttpError(502, "We couldn't open the payment page just now. Please try again.");
  }
}

/** Creates an order and a PayMongo checkout. The amount is worked out here, never sent by the browser. */
export const startCheckout = createServerFn({ method: "POST" })
  .inputValidator(z.object({ siteId: id, tier: z.enum(["sweet", "celebration", "keepsake"]) }))
  .handler(async ({ data }) => {
    const { user, site } = await ownedSite(data.siteId);
    return openCheckout(user, site, await quote(site, data.tier));
  });

/** Pays to keep a gift open for another stretch of its plan (works before or after it ends). */
export const startExtendCheckout = createServerFn({ method: "POST" })
  .inputValidator(z.object({ siteId: id }))
  .handler(async ({ data }) => {
    const { user, site } = await ownedSite(data.siteId);
    return openCheckout(user, site, quoteExtend(site));
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
 * every 5s per order) whenever the order isn't marked paid, including after a
 * cancel or a timeout, since the buyer may have paid in another tab. Nothing
 * from the browser is trusted.
 */
export const getOrderStatus = createServerFn({ method: "GET" })
  .inputValidator(z.object({ orderId: id }))
  .handler(async ({ data }) => {
    let order = await ownedOrder(data.orderId);
    if (order.status !== "paid") {
      const { reconcileOrder } = await import("@/server/billing");
      if (await reconcileOrder(order, "confirm", 5000)) order = await ownedOrder(data.orderId);
    }
    if (!order.siteId) return { id: order.id, status: order.status, kind: order.kind, tier: order.tier, amount: order.amount, site: null };
    const [site] = await getDb()
      .select({
        id: schema.giftSites.id,
        slug: schema.giftSites.slug,
        title: schema.giftSites.title,
        expiresAt: schema.giftSites.expiresAt,
      })
      .from(schema.giftSites)
      .where(eq(schema.giftSites.id, order.siteId!));
    return {
      id: order.id,
      status: order.status,
      kind: order.kind,
      tier: order.tier,
      amount: order.amount,
      site: site ? { ...site, expiresAt: site.expiresAt?.toISOString() ?? null } : null,
    };
  });

/** The person came back from PayMongo via "cancel". A late payment still counts if it arrives. */
export const cancelOrder = createServerFn({ method: "POST" })
  .inputValidator(z.object({ orderId: id }))
  .handler(async ({ data }) => {
    const order = await ownedOrder(data.orderId);
    if (order.status === "pending") {
      await getDb()
        .update(schema.orders)
        .set({ status: "failed", updatedAt: new Date() })
        .where(and(eq(schema.orders.id, order.id), eq(schema.orders.status, "pending")));
    }
    return { ok: true };
  });

/** Admin: the latest payment signals and what we did with each (webhooks, checks, the daily job). */
export const listPaymentLog = createServerFn({ method: "GET" }).handler(async () => {
  await requireAdmin();
  const rows = await getDb().select().from(schema.paymentLog).orderBy(desc(schema.paymentLog.at)).limit(60);
  return rows.map((r) => ({ ...r, at: r.at.toISOString() }));
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
    if (taken) return { ok: false, slug: site.slug, error: "That link name is taken. Try another." };
    await getDb().update(schema.giftSites).set({ slug: data.slug }).where(eq(schema.giftSites.id, site.id));
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
    const sectionData = data.data !== undefined ? sectionPayload(row.moduleType, data.data, data.textContent, data.mediaUrl ?? "keep") : undefined;
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
    const [site] = await getDb().select().from(schema.giftSites).where(eq(schema.giftSites.id, siteId));
    if (site && data.status !== "hidden") {
      // Showing hidden items again counts towards the plan, like a new note would.
      const hidden = await getDb().select().from(c).where(and(inArray(c.id, data.ids), eq(c.status, "hidden")));
      for (const row of hidden) {
        const room = await checkRoom(site, row.authorName, row.moduleType, row.deviceId);
        if (!room.ok && room.reason !== "ended") {
          throw new HttpError(409, room.reason === "photos" ? "This gift has all the photos its plan holds. Upgrade to show more." : "This gift has all the friends its plan holds. Upgrade to show more.");
        }
        await getDb().update(c).set({ status: data.status }).where(eq(c.id, row.id));
      }
    }
    await getDb().update(c).set({ status: data.status }).where(inArray(c.id, data.ids));
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
