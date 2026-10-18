/**
 * Words we filled in for the organiser follow their choices. A new gift gets an
 * automatic heading ("Happy birthday, Ana") from its occasion, or from its style's
 * theme when there's no occasion. If the occasion or style changes and the heading
 * (or the gift's name, or a section title) still says exactly what we filled in,
 * it changes with it. Anything the organiser wrote themselves stays as it is.
 */
import { defaultTitles, type CustomText } from "@/lib/gift";
import { giftWords, occasionTitle, themeKindOf } from "@/lib/themeKind";
import type { OccasionId } from "@/lib/occasions";

type ThemeLike = { name?: string | null; category?: string | null } | null | undefined;

/** What the automatic words are made from: the theme the gift wears and its occasion. */
export type WordsSource = { theme: ThemeLike; occasion: OccasionId | null | undefined };

/**
 * The words to change when a gift goes from `before` to `after`. Returns only what changes:
 * `title` and/or a full `custom_text` with the automatic entries swapped. Empty when nothing does.
 */
export function followAutoWords(
  site: { title: string; custom_text: CustomText },
  before: WordsSource,
  after: WordsSource,
): { title?: string; custom_text?: CustomText } {
  const name = site.custom_text.recipient_name?.trim() ?? "";
  // The heading is made two ways: with the name ("Happy birthday, Ana") or without ("Happy birthday").
  const pairs: [string, string][] = [
    [occasionTitle(before.theme, name, before.occasion), occasionTitle(after.theme, name, after.occasion)],
    [giftWords(before.theme, before.occasion).occasion, giftWords(after.theme, after.occasion).occasion],
  ];
  const swap = (value: string | undefined) => {
    const v = value?.trim();
    if (!v) return undefined;
    const hit = pairs.find(([old]) => old === v);
    return hit && hit[1] !== v ? hit[1] : undefined;
  };

  const out: { title?: string; custom_text?: CustomText } = {};
  const text: Record<string, string> = {};
  const heading = swap(site.custom_text.heading);
  if (heading) text["heading"] = heading;
  const title = swap(site.title);
  if (title) out.title = title;

  // Section titles we'd fill in, in case one was saved as is.
  const oldTitles = defaultTitles(site.custom_text, themeKindOf(before.theme), before.occasion) as Record<string, string>;
  const newTitles = defaultTitles(site.custom_text, themeKindOf(after.theme), after.occasion) as Record<string, string>;
  for (const [key, old] of Object.entries(oldTitles)) {
    if (key === "heading") continue;
    const v = (site.custom_text as Record<string, string | undefined>)[key]?.trim();
    if (v && v === old && newTitles[key] && newTitles[key] !== v) text[key] = newTitles[key];
  }

  if (Object.keys(text).length) out.custom_text = { ...site.custom_text, ...text };
  return out;
}

/**
 * The saved fields a followAutoWords result changes, as flat keys (`title`, `custom_text.heading`),
 * so the editor can save them as automatic (soft) changes that never clash with a typed one.
 */
export function autoWordKeys(words: { title?: string; custom_text?: CustomText }): string[] {
  return [...(words.title !== undefined ? ["title"] : []), ...Object.keys(words.custom_text ?? {}).map((k) => `custom_text.${k}`)];
}
