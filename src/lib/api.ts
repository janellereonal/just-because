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
 */
import { createServerFn } from "@tanstack/react-start";
import { and, asc, desc, eq, inArray, ne, or } from "drizzle-orm";
import { z } from "zod";
import { getDb, schema } from "@/server/db";
import { notifyGiftLive, notifyNewNote } from "@/server/notify";
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
] as const;
const GUEST_TYPES = ["letters", "photobooth", "songs", "wordcloud", "voice", "tree"] as const;
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

export const getSiteBySlug = createServerFn({ method: "GET" })
  .inputValidator(z.object({ slug: z.string().min(1).max(120) }))
  .handler(async ({ data }) => {
    const [row] = await getDb().select().from(schema.giftSites).where(eq(schema.giftSites.slug, data.slug));
    return row ? toRow(row) : null;
  });

export const getSiteById = createServerFn({ method: "GET" })
  .inputValidator(z.object({ id }))
  .handler(async ({ data }) => {
    const user = await requireUser();
    const [row] = await getDb().select().from(schema.giftSites).where(eq(schema.giftSites.id, data.id));
    if (!row) return null;
    if (row.creatorId !== user.id && !user.isAdmin) return null;
    return toRow(row);
  });

export const listMySites = createServerFn({ method: "GET" }).handler(async () => {
  const user = await requireUser();
  const rows = await getDb()
    .select()
    .from(schema.giftSites)
    .where(eq(schema.giftSites.creatorId, user.id))
    .orderBy(desc(schema.giftSites.createdAt));
  return rows.map(toRow);
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
      themeId: id.nullable(),
      format: z.enum(["scrapbook", "comic"]),
      paletteId: id.nullable(),
      customColors: paletteShape,
      treeRevealDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable(),
      modules: z.array(z.enum(MODULE_TYPES)).min(1),
    }),
  )
  .handler(async ({ data }) => {
    const user = await requireUser();
    const db = getDb();
    return db.transaction(async (tx) => {
      const [site] = await tx
        .insert(schema.giftSites)
        .values({
          creatorId: user.id,
          title: data.title,
          themeId: data.themeId,
          format: data.format,
          slug: slugify(data.title),
          customText: { heading: data.title },
          paletteId: data.paletteId,
          customColors: data.customColors,
          treeRevealDate: data.treeRevealDate,
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
        font_choice: z.enum(["romantic", "playful", "modern", "handwritten"]),
        countdown_date: date,
        calendar_locked: z.boolean(),
        intro_text: z.string().max(2000).nullable(),
        background_style: z.enum(["paper", "clean", "formal", "gradient"]),
        tree_reveal_date: date,
        palette_id: id.nullable(),
        share_notes: z.boolean(),
        status: z.enum(["draft", "published"]),
        format: z.enum(["scrapbook", "comic"]),
        format_settings: jsonObject,
      }),
    }),
  )
  .handler(async ({ data }) => {
    const { site } = await requireSiteOwner(data.id);
    const p = data.patch;
    await getDb()
      .update(schema.giftSites)
      .set({
        title: p.title,
        customText: p.custom_text,
        customColors: p.custom_colors,
        fontChoice: p.font_choice,
        countdownDate: p.countdown_date,
        calendarLocked: p.calendar_locked,
        introText: p.intro_text,
        backgroundStyle: p.background_style,
        treeRevealDate: p.tree_reveal_date,
        paletteId: p.palette_id,
        shareNotes: p.share_notes,
        status: p.status,
        format: p.format,
        formatSettings: p.format_settings,
      })
      .where(eq(schema.giftSites.id, data.id));
    if (site.status !== "published" && p.status === "published") {
      await notifyGiftLive(data.id).catch((e) => console.error("[notify]", e));
    }
    return { ok: true };
  });

export const deleteSite = createServerFn({ method: "POST" })
  .inputValidator(z.object({ id }))
  .handler(async ({ data }) => {
    await requireSiteOwner(data.id);
    await getDb().delete(schema.giftSites).where(eq(schema.giftSites.id, data.id));
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
    return rows.map(toRow);
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
      authorName: z.string().trim().min(1).max(120),
      textContent: shortText,
      mediaUrl,
      externalLink: link,
      ornamentKey: z.enum(ORNAMENT_KEYS).nullable(),
      visibility: z.enum(["public", "recipient"]),
    }),
  )
  .handler(async ({ data }) => {
    const db = getDb();
    const [site] = await db
      .select({ id: schema.giftSites.id })
      .from(schema.giftSites)
      .where(eq(schema.giftSites.id, data.siteId));
    if (!site) throw new HttpError(404, "We couldn't find that gift.");
    const [module] = await db
      .select({ enabled: schema.siteModules.enabled })
      .from(schema.siteModules)
      .where(and(eq(schema.siteModules.siteId, data.siteId), eq(schema.siteModules.moduleType, data.moduleType)));
    if (!module?.enabled) throw new HttpError(400, "That section isn't open on this gift.");
    await db.insert(c).values({
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
    });
    await notifyNewNote(data.siteId, data.authorName).catch((e) => console.error("[notify]", e));
    return { ok: true };
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
    }),
  )
  .handler(async ({ data }) => {
    const row = await ownDraftContribution(data.id, data.token);
    if (!row) return { ok: false };
    await getDb()
      .update(c)
      .set({
        textContent: data.textContent,
        externalLink: data.externalLink,
        ...(data.mediaUrl ? { mediaUrl: data.mediaUrl } : {}),
        ...(row.moduleType === "tree" && data.visibility ? { visibility: data.visibility } : {}),
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
    await getDb().delete(c).where(eq(c.id, data.id));
    return { ok: true };
  });

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
    await requireSiteOwner(await contributionSite(data.ids));
    await getDb().update(c).set({ status: data.status }).where(inArray(c.id, data.ids));
    return { ok: true };
  });

export const deleteContributions = createServerFn({ method: "POST" })
  .inputValidator(z.object({ ids: z.array(id).min(1).max(500) }))
  .handler(async ({ data }) => {
    await requireSiteOwner(await contributionSite(data.ids));
    await getDb().delete(c).where(inArray(c.id, data.ids));
    return { ok: true };
  });

/* ------------------------------------------------------------------ */
/* Calendar                                                           */
/* ------------------------------------------------------------------ */

export const listCalendarEntries = createServerFn({ method: "GET" })
  .inputValidator(z.object({ siteId: id }))
  .handler(async ({ data }) => {
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
