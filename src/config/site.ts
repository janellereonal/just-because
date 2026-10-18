/**
 * Site-wide settings that aren't prices (those live in pricing.ts).
 */
export const SITE = {
  name: "Just Because",
  url: "https://justbecause.site",
  /** The inbox for questions, refunds and privacy requests. Used on /contact, the legal pages and the footer. */
  contactEmail: "madewithjustbecause@gmail.com",
  /**
   * The legal pages show a "Draft: under review" banner while this is true.
   * Switch it off once the pages have been reviewed.
   */
  legalDraft: true,
  /** The date the legal pages were last changed (shown on each page). */
  legalUpdated: "2026-10-18",
  /** Socials for the footer. Empty until Janelle sends them; empty ones are hidden. */
  socials: { instagram: "", tiktok: "", facebook: "" } as Record<string, string>,
} as const;
