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
    fontChoice: text("font_choice").notNull().default("theme"),
    countdownDate: date("countdown_date"),
    /** The exact moment the countdown ends (UTC). Shown in each viewer's own zone. */
    countdownAt: timestamp("countdown_at", { withTimezone: true }),
    calendarLocked: boolean("calendar_locked").notNull().default(false),
    introText: text("intro_text"),
    /** The star of the opening: { type: "library" | "upload", id, colors, accessory, name_tag, upload_url }. Null = theme default. */
    character: jsonb("character"),
    /** The particles: { id } for a built-in set or { custom: [emoji or url] }. Null = theme default. */
    iconSet: jsonb("icon_set"),
    /** Just from the creator (no friends link). They add every note themselves. */
    solo: boolean("solo").notNull().default(false),
    /** The creator's custom opening: object, stickers, colors, background, button words. */
    introSettings: jsonb("intro_settings").notNull().default(sql`'{}'::jsonb`),
    backgroundStyle: text("background_style").notNull().default("paper"),
    treeRevealDate: date("tree_reveal_date"),
    /** When the creator was last emailed about new notes (throttles alerts). */
    lastNotifiedAt: timestamp("last_notified_at", { withTimezone: true }),
    /** Paid plan: sweet | celebration | keepsake, or legacy for gifts from before payments. Null until paid. */
    tier: text("tier"),
    /** First time the gift went live (after payment). */
    publishedAt: timestamp("published_at", { withTimezone: true }),
    /** When the gift stops being open. Null = never (legacy). */
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    /** When we emailed the organiser that the plan ends soon (once per end date). */
    expiryRemindedAt: timestamp("expiry_reminded_at", { withTimezone: true }),
    /**
     * scrypt hash of the recipient password (paid feature). Never the password
     * itself, and never sent to the browser. Null = no password.
     */
    passwordHash: text("password_hash"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("gift_sites_creator_idx").on(t.creatorId)],
);

/* ------------------------------------------------------------------ */
/* Payments                                                           */
/* ------------------------------------------------------------------ */

export const orders = pgTable(
  "orders",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    /** Null once the gift is deleted: the payment record is kept for accounting and refunds. */
    siteId: uuid("site_id").references(() => giftSites.id, { onDelete: "set null" }),
    /** Null once the account is deleted, for the same reason. */
    ownerId: text("owner_id").references(() => user.id, { onDelete: "set null" }),
    /** publish = first payment, upgrade = paying the difference to a higher tier, extend = more time on the same tier. */
    kind: text("kind").notNull().default("publish"),
    tier: text("tier").notNull(),
    /** For upgrades: the tier the gift was on. */
    fromTier: text("from_tier"),
    /** Charged amount in centavos, computed on the server. */
    amount: integer("amount").notNull(),
    currency: text("currency").notNull().default("PHP"),
    promoApplied: boolean("promo_applied").notNull().default(false),
    /** pending | paid | failed | expired */
    status: text("status").notNull().default("pending"),
    provider: text("provider").notNull().default("paymongo"),
    providerCheckoutId: text("provider_checkout_id").unique(),
    providerPaymentId: text("provider_payment_id"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("orders_site_idx").on(t.siteId)],
);

/**
 * Every payment signal we get and what we did with it: webhooks (signed or
 * not), confirm-page checks, editor checks and the daily job. For debugging
 * and support; never holds card details, only ids and an outcome.
 */
export const paymentLog = pgTable(
  "payment_log",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    at: timestamp("at", { withTimezone: true }).notNull().defaultNow(),
    /** webhook | confirm | billing | cron */
    source: text("source").notNull(),
    event: text("event").notNull(),
    checkoutId: text("checkout_id"),
    orderId: uuid("order_id"),
    outcome: text("outcome").notNull(),
  },
  (t) => [index("payment_log_at_idx").on(t.at), index("payment_log_checkout_idx").on(t.checkoutId)],
);

/** Webhook event ids we've already handled, so retries are ignored. */
export const webhookEvents = pgTable("webhook_events", {
  id: text("id").primaryKey(),
  provider: text("provider").notNull(),
  type: text("type").notNull(),
  receivedAt: timestamp("received_at", { withTimezone: true }).notNull().defaultNow(),
});

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
    /**
     * Random id kept in the friend's browser (localStorage), used only to count
     * contributors for plan caps. Never sent back to the browser. Null on old rows.
     */
    deviceId: uuid("device_id"),
    /** Added by the gift's creator from the editor (their own notes). */
    byOwner: boolean("by_owner").notNull().default(false),
    /** Extra fields for the newer sections (see src/lib/sections.ts). */
    data: jsonb("data"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("contributions_site_idx").on(t.siteId), index("contributions_site_device_idx").on(t.siteId, t.deviceId)],
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

/**
 * Chip-in fund (not live yet). Provider-agnostic on purpose: amounts are in
 * minor units with an ISO currency, and the payment provider is just a name
 * plus its own reference, so PayMongo, PayPal or anything else fits.
 */
export const giftFunds = pgTable("gift_funds", {
  id: uuid("id").primaryKey().defaultRandom(),
  siteId: uuid("site_id")
    .notNull()
    .unique()
    .references(() => giftSites.id, { onDelete: "cascade" }),
  title: text("title"),
  goalMinor: integer("goal_minor"),
  currency: text("currency").notNull().default("USD"),
  /** draft | open | closed | paid_out */
  status: text("status").notNull().default("draft"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const fundPledges = pgTable(
  "fund_pledges",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    fundId: uuid("fund_id")
      .notNull()
      .references(() => giftFunds.id, { onDelete: "cascade" }),
    authorName: text("author_name").notNull(),
    amountMinor: integer("amount_minor").notNull(),
    currency: text("currency").notNull(),
    /** e.g. "paymongo", "paypal". Null until a provider is chosen. */
    provider: text("provider"),
    providerRef: text("provider_ref"),
    /** pending | paid | refunded | failed */
    status: text("status").notNull().default("pending"),
    message: text("message"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("fund_pledges_fund_idx").on(t.fundId)],
);
