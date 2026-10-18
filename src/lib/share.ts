/**
 * Link previews for gift and friend links: just enough to make a nice card
 * (who it's for, which theme). Never note content. Password-protected or
 * paused gifts get a generic card.
 */
import { createServerFn } from "@tanstack/react-start";
import { notFound } from "@tanstack/react-router";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { getDb, schema } from "@/server/db";
import { themeKindOf, type ThemeKind } from "@/lib/themeKind";
import { SITE } from "@/config/site";

export type ShareMeta = { recipient: string | null; kind: ThemeKind };

export const getShareMeta = createServerFn({ method: "GET" })
  .inputValidator(z.object({ slug: z.string().trim().min(1).max(120) }))
  .handler(async ({ data }): Promise<ShareMeta | null> => {
    const [row] = await getDb()
      .select({ customText: schema.giftSites.customText, passwordHash: schema.giftSites.passwordHash, disabledAt: schema.giftSites.disabledAt, themeName: schema.themes.name, themeCategory: schema.themes.category })
      .from(schema.giftSites)
      .leftJoin(schema.themes, eq(schema.themes.id, schema.giftSites.themeId))
      .where(eq(schema.giftSites.slug, data.slug));
    // No gift with this link: the page answers 404 (the route shows its friendly not-found page).
    if (!row) throw notFound();
    if (row.disabledAt) return null;
    const kind = themeKindOf({ name: row.themeName, category: row.themeCategory });
    const name = String((row.customText as Record<string, unknown> | null)?.["recipient_name"] ?? "").trim().slice(0, 40);
    return { recipient: row.passwordHash || !name ? null : name, kind };
  });

const OCCASION: Partial<Record<ThemeKind, string>> = {
  birthday: "birthday",
  valentine: "Valentine's",
  anniversary: "anniversary",
  wedding: "wedding",
  bridal: "bridal shower",
  baby: "baby",
  christmas: "Christmas",
  newyear: "New Year",
  voyage: "send-off",
};

const possessive = (name: string) => (/s$/i.test(name) ? `${name}'` : `${name}'s`);
const abs = (path: string) => `${SITE.url}${path}`;

function tags(title: string, description: string, image: string) {
  return [
    { title },
    { name: "description", content: description },
    { property: "og:title", content: title },
    { property: "og:description", content: description },
    { property: "og:type", content: "website" },
    { property: "og:site_name", content: SITE.name },
    { property: "og:image", content: abs(image) },
    { property: "og:image:width", content: "1200" },
    { property: "og:image:height", content: "630" },
    { property: "og:image:alt", content: title },
    { name: "twitter:card", content: "summary_large_image" },
    { name: "twitter:title", content: title },
    { name: "twitter:description", content: description },
    { name: "twitter:image", content: abs(image) },
  ];
}

const known = (k: ThemeKind) => (OG_KINDS as readonly string[]).includes(k) ? k : "default";
export const OG_KINDS = ["birthday", "valentine", "anniversary", "wedding", "bridal", "baby", "christmas", "newyear", "voyage", "pets", "handwritten", "game", "pixel", "default"] as const;

export function giftShareTags(meta: ShareMeta | null | undefined) {
  const title = meta?.recipient ? `A gift for ${meta.recipient}` : "A gift for you";
  return tags(title, "Made by the people who love you. Open it when you're ready.", `/og/gift-${known(meta?.kind ?? "default")}.jpg`);
}

export function contributeShareTags(meta: ShareMeta | null | undefined) {
  const occasion = meta ? OCCASION[meta.kind] : undefined;
  const title = meta?.recipient ? `Add a note to ${possessive(meta.recipient)} ${occasion ? `${occasion} ` : ""}gift` : "Add a note to a group gift";
  return tags(title, "Write a few words, add a photo or a song. It takes a minute and no account.", `/og/add-${known(meta?.kind ?? "default")}.jpg`);
}

export function marketingShareTags(title: string, description: string) {
  return tags(title, description, "/og/default.jpg");
}
