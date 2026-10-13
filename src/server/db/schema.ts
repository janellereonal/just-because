import { sql } from "drizzle-orm";
import {
  boolean,
  date,
  index,
  integer,
  jsonb,
  numeric,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";

/* ------------------------------------------------------------------ */
/* Accounts (Better Auth). `is_admin` lives on the user row.           */
/* ------------------------------------------------------------------ */

export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").notNull().default(false),
  image: text("image"),
  isAdmin: boolean("is_admin").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const session = pgTable(
  "session",
  {
    id: text("id").primaryKey(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    token: text("token").notNull().unique(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
  },
  (t) => [index("session_user_id_idx").on(t.userId)],
);

export const account = pgTable(
  "account",
  {
    id: text("id").primaryKey(),
    accountId: text("account_id").notNull(),
    providerId: text("provider_id").notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    idToken: text("id_token"),
    accessTokenExpiresAt: timestamp("access_token_expires_at", { withTimezone: true }),
    refreshTokenExpiresAt: timestamp("refresh_token_expires_at", { withTimezone: true }),
    scope: text("scope"),
    password: text("password"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("account_user_id_idx").on(t.userId)],
);

export const verification = pgTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

/* ------------------------------------------------------------------ */
/* Gift data                                                          */
/* ------------------------------------------------------------------ */

export const palettes = pgTable("palettes", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull().unique(),
  groupName: text("group_name").notNull(),
  background: text("background").notNull(),
  primaryColor: text("primary_color").notNull(),
  accent: text("accent").notNull(),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const themes = pgTable("themes", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  category: text("category").notNull(),
  previewImageUrl: text("preview_image_url"),
  /** Deprecated: replaced by suggested_palette_ids. Kept for old gifts. */
  palettes: jsonb("palettes").notNull().default(sql`'[]'::jsonb`),
  suggestedPaletteIds: uuid("suggested_palette_ids")
    .array()
    .notNull()
    .default(sql`'{}'::uuid[]`),
  description: text("description"),
  status: text("status").notNull().default("published"),
  defaultModules: text("default_modules")
    .array()
    .notNull()
    .default(sql`'{}'::text[]`),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const giftSites = pgTable(
  "gift_sites",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    creatorId: text("creator_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    themeId: uuid("theme_id").references(() => themes.id, { onDelete: "set null" }),
    slug: text("slug").notNull().unique(),
    status: text("status").notNull().default("draft"),
    format: text("format").notNull().default("scrapbook"),
    formatSettings: jsonb("format_settings").notNull().default(sql`'{}'::jsonb`),
    customText: jsonb("custom_text").notNull().default(sql`'{}'::jsonb`),
    customColors: jsonb("custom_colors").notNull().default(sql`'{}'::jsonb`),
    paletteId: uuid("palette_id").references(() => palettes.id),
    shareNotes: boolean("share_notes").notNull().default(false),
    fontChoice: text("font_choice").notNull().default("romantic"),
    countdownDate: date("countdown_date"),
    calendarLocked: boolean("calendar_locked").notNull().default(false),
    introText: text("intro_text"),
    backgroundStyle: text("background_style").notNull().default("paper"),
    treeRevealDate: date("tree_reveal_date"),
    /** When the creator was last emailed about new notes (throttles alerts). */
    lastNotifiedAt: timestamp("last_notified_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("gift_sites_creator_idx").on(t.creatorId)],
);

export const siteModules = pgTable(
  "site_modules",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    siteId: uuid("site_id")
      .notNull()
      .references(() => giftSites.id, { onDelete: "cascade" }),
    moduleType: text("module_type").notNull(),
    price: numeric("price").notNull().default("0"),
    enabled: boolean("enabled").notNull().default(true),
  },
  (t) => [unique("site_modules_site_type").on(t.siteId, t.moduleType)],
);

export const contributions = pgTable(
  "contributions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    siteId: uuid("site_id")
      .notNull()
      .references(() => giftSites.id, { onDelete: "cascade" }),
    moduleType: text("module_type").notNull(),
    authorName: text("author_name").notNull(),
    textContent: text("text_content"),
    mediaUrl: text("media_url"),
    externalLink: text("external_link"),
    status: text("status").notNull().default("pending"),
    ornamentKey: text("ornament_key"),
    visibility: text("visibility").notNull().default("public"),
    /** Secret kept on the contributor's device so they can edit until publish. */
    editToken: uuid("edit_token"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("contributions_site_idx").on(t.siteId)],
);

export const calendarEntries = pgTable(
  "calendar_entries",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    siteId: uuid("site_id")
      .notNull()
      .references(() => giftSites.id, { onDelete: "cascade" }),
    entryDate: date("entry_date").notNull(),
    type: text("type").notNull().default("message"),
    textContent: text("text_content"),
    mediaUrl: text("media_url"),
    externalLink: text("external_link"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [unique("calendar_entries_site_date").on(t.siteId, t.entryDate)],
);
