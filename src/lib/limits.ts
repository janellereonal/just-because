/**
 * Every text limit in one place. The editor, the friend page and the server
 * all read from here, so the counter a person sees matches what the server
 * accepts. Safe on the server and in the browser.
 */
import type { ModuleType } from "@/lib/gift";

export const LIMITS = {
  recipientName: 40,
  giftTitle: 120,
  heading: 80,
  introMessage: 280,
  /** The small line on the opening (badge). */
  openingLine: 48,
  button: 40,
  /** The greeting on the opening (intro_text). */
  greeting: 120,
  sectionTitle: 60,
  footer: 200,
  friendName: 40,
  letter: 2000,
  /** A few comma-separated words for the word cloud. */
  words: 120,
  caption: 280,
  ornament: 500,
  comicCover: 60,
  password: 100,
  customSlug: 60,
} as const;

/** How long a note's text can be, by section. */
export function noteTextLimit(type: ModuleType): number {
  switch (type) {
    case "letters":
    case "openwhen":
    case "capsule":
      return LIMITS.letter;
    case "wordcloud":
      return LIMITS.words;
    case "tree":
      return LIMITS.ornament;
    default:
      return LIMITS.caption;
  }
}

/** custom_text keys and their limits. Unknown keys get the section title limit. */
export function customTextLimit(key: string): number {
  if (key === "heading") return LIMITS.heading;
  if (key === "recipient_name") return LIMITS.recipientName;
  if (key === "intro_message") return LIMITS.introMessage;
  if (key === "footer_note") return LIMITS.footer;
  if (key === "turning") return 3;
  if (key === "to_place" || key === "from_place") return LIMITS.sectionTitle;
  return LIMITS.sectionTitle;
}

/** Plain-language names for error messages. */
export const FIELD_NAMES: Record<string, string> = {
  heading: "the heading",
  recipient_name: "their name",
  intro_message: "the message under the title",
  footer_note: "the footer note",
  turning: "the age",
  to_place: "where it's going",
  from_place: "where it's from",
};

export const tooLong = (what: string, max: number) => `Keep ${what} under ${max} characters.`;

/**
 * Upload limits per kind of file. Photos are compressed in the browser first (to about
 * 0.2 to 0.5 MB), so the photo limit only matters if compression fails. The server uses
 * the same numbers (src/server/uploads.ts).
 */
export const MEDIA_LIMITS = {
  photo: { mb: 8, seconds: 0 },
  voice: { mb: 5, seconds: 120 },
  video: { mb: 50, seconds: 60 },
} as const;
