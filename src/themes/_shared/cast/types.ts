/**
 * The cast contract. A character is anything that can idle, look at a point,
 * react to a tap, anticipate, celebrate and be a little sad. Placeholder
 * characters (geometric SVG) and future Rive characters both implement it:
 * a Rive file with a state machine called "Main" and inputs idle, lookX,
 * lookY, tap, anticipate, celebrate and sad maps one to one onto this handle.
 * See docs/characters.md.
 */
import { isSafeMediaUrl } from "@/lib/intro";

export type AccessoryId =
  | "bow"
  | "rose"
  | "party-hat"
  | "veil"
  | "bowtie"
  | "bonnet"
  | "scarf"
  | "crown"
  | "pilot-cap"
  | "bandana";

export type CharacterSetting =
  | {
      type: "library";
      id: string;
      colors?: { primary?: string; secondary?: string; skin?: string };
      /** Wear the theme's costume (party hat, veil…). */
      accessory?: boolean;
      name_tag?: string;
    }
  | { type: "upload"; upload_url: string; accessory?: boolean; name_tag?: string }
  /** No character: the object tells the story on its own. */
  | { type: "none"; accessory?: boolean; name_tag?: string };

/** What a theme can ask a character to do. Mirrors the Rive "Main" state machine inputs. */
export type CharacterHandle = {
  tap: () => void;
  anticipate: () => void;
  celebrate: () => void;
  sad: () => void;
  /** -1..1 in both axes. Characters also follow the pointer on their own. */
  look: (x: number, y: number) => void;
  /** Back to idle. */
  idle: () => void;
};

const HEX = /^#[0-9a-fA-F]{6}$/;
const color = (v: unknown) => (typeof v === "string" && HEX.test(v) ? v : undefined);

export function normalizeCharacter(value: unknown): CharacterSetting | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const v = value as Record<string, unknown>;
  const name =
    typeof v["name_tag"] === "string" && v["name_tag"].trim() ? v["name_tag"].trim().slice(0, 24) : undefined;
  const accessory = v["accessory"] === false ? false : true;
  if (v["type"] === "none") return { type: "none" };
  if (v["type"] === "upload" && isSafeMediaUrl(v["upload_url"])) {
    return { type: "upload", upload_url: v["upload_url"], accessory, ...(name ? { name_tag: name } : {}) };
  }
  if (v["type"] === "library" && typeof v["id"] === "string" && /^[a-z0-9-]{1,24}$/.test(v["id"])) {
    const c = (v["colors"] ?? {}) as Record<string, unknown>;
    const colors = {
      ...(color(c["primary"]) ? { primary: color(c["primary"])! } : {}),
      ...(color(c["secondary"]) ? { secondary: color(c["secondary"])! } : {}),
      ...(color(c["skin"]) ? { skin: color(c["skin"])! } : {}),
    };
    return {
      type: "library",
      id: v["id"],
      accessory,
      ...(Object.keys(colors).length ? { colors } : {}),
      ...(name ? { name_tag: name } : {}),
    };
  }
  return null;
}
