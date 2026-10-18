/**
 * What an engine theme's opening needs from a gift: personalisation slots,
 * friends' notes and theme options. One place, so the gift page, the editor
 * and previews all agree.
 */
import type { Contribution, CustomText, GiftSite } from "@/lib/gift";
import type { EngineNote, ThemeOptions } from "@/themes/engine/define";
import type { SlotInput } from "@/themes/engine/slots";
import { openedNotes, simbangNight, simbangYear } from "@/themes/engine/simbang";
import { engineThemeForName } from "@/themes/engine/registry";
import { isFlagOn } from "@/config/flags";
import { sampleNotes } from "@/lib/sampleSections";

/** Notes an opening may show: approved, public, with words or a photo; sealed and recipient-only ones never. */
export function engineNotes(contributions: (Contribution & { sealed?: boolean })[]): EngineNote[] {
  return contributions
    .filter((c) => c.status === "approved" && c.visibility !== "recipient" && !c.sealed && c.module_type !== "tree" && c.module_type !== "capsule")
    .filter((c) => (c.text_content ?? "").trim() || c.media_url)
    .map((c) => ({ id: c.id, author: c.author_name, text: c.text_content, media: c.media_url, kind: c.module_type }));
}

/** The age, as the organiser typed it in "Turning". */
export function turningOf(text: CustomText): number | null {
  const n = Number.parseInt(String((text as Record<string, unknown>)["turning"] ?? ""), 10);
  return Number.isFinite(n) && n > 0 && n < 130 ? n : null;
}

export function engineSlots(site: Pick<GiftSite, "custom_text" | "countdown_at" | "countdown_date">, contributions: Contribution[] = []): SlotInput {
  const ct = site.custom_text as Record<string, string | undefined>;
  const photo = contributions.find((c) => c.module_type === "photobooth" && c.status === "approved" && c.media_url)?.media_url ?? null;
  return {
    recipient: site.custom_text.recipient_name ?? "",
    age: turningOf(site.custom_text),
    date: site.countdown_at ?? site.countdown_date ?? null,
    place: ct["to_place"] ? { city: ct["to_place"] } : null,
    senderPlace: ct["from_place"] ? { city: ct["from_place"] } : null,
    photo,
  };
}

export function engineOptions(site: Pick<GiftSite, "intro_settings" | "created_at">): ThemeOptions {
  const simbang = site.intro_settings.simbang === true;
  return simbang ? { simbang, year: simbangYear(site.created_at) } : {};
}

/**
 * Simbang Gabi: the notes the recipient can see tonight. Everything else
 * waits for its night. Other themes get every note.
 */
export function simbangVisible<T extends { created_at: string }>(
  themeName: string | null | undefined,
  site: Pick<GiftSite, "intro_settings" | "created_at">,
  notes: T[],
  now = new Date(),
): { notes: T[]; night: number | null } {
  const def = engineThemeForName(themeName);
  if (!def?.offers?.includes("simbang") || site.intro_settings.simbang !== true) return { notes, night: null };
  const night = simbangNight(now, simbangYear(site.created_at));
  const ordered = [...notes].sort((a, b) => a.created_at.localeCompare(b.created_at));
  const open = new Set(openedNotes(ordered, night));
  return { notes: notes.filter((n) => open.has(n)), night };
}

/** Does this gift's opening come from the theme engine? */
export function usesEngine(themeName: string | null | undefined) {
  return !!engineThemeForName(themeName);
}

export { isFlagOn };

/** Everything GiftIntro needs for an engine theme, ready to spread onto it. */
export function engineIntroProps(
  themeName: string | null | undefined,
  site: Pick<GiftSite, "custom_text" | "countdown_at" | "countdown_date" | "intro_settings" | "created_at">,
  contributions: Contribution[],
) {
  const age = isFlagOn("birthdayAge") ? turningOf(site.custom_text) : null;
  if (!usesEngine(themeName)) return { themeName, age };
  const approved = contributions.filter((c) => c.status === "approved");
  return { themeName, age, notes: engineNotes(approved), slots: engineSlots(site, approved), themeOptions: engineOptions(site) };
}

/** For gallery cards and previews: sample notes and places, so engine themes show what's inside. */
export function previewEngineProps(themeName: string | null | undefined, recipient: string) {
  if (!usesEngine(themeName)) return { themeName };
  const notes: EngineNote[] = sampleNotes(recipient, "preview")
    .filter((n) => n.module_type !== "tree")
    .map((n) => ({ id: n.id, author: n.author_name, text: n.text_content, media: n.media_url, kind: n.module_type }));
  const slots: SlotInput = {
    recipient,
    place: { city: "Lisbon", country: "PT" },
    senderPlace: { city: "Manila", country: "PH" },
    date: `${new Date().getFullYear()}-12-24`,
  };
  return { themeName, notes, slots };
}
