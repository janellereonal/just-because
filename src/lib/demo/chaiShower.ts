/**
 * A test gift for the Wax Seal style, filled in with the Chai shower page it was made from
 * (design-reference/chai-bridal-shower.html). Never stored, never listed: only the dev page
 * /dev/wax-seal shows it, and only locally or on a Vercel preview.
 *
 * The reference had placeholders for the letters and photos, so this does too: the letters
 * say where the real ones go, and the photos are stand-ins from /public/demo.
 */
import type { GiftSite, ModuleType, SiteModule, ViewContribution } from "@/lib/gift";
import type { Palette } from "@/lib/themes";
import { DEMO_GIFTS } from "@/lib/demoGifts";
import { STYLES } from "@/lib/styles";

const ID = "demo-chai";
const palette: Palette = STYLES.find((s) => s.id === "wax-seal")!.palette!;

let n = 0;
function note(
  type: ModuleType,
  who: string,
  text: string | null,
  extra: { media?: string; data?: Record<string, unknown> } = {},
): ViewContribution {
  n += 1;
  return {
    id: `chai-${n}`,
    site_id: ID,
    module_type: type,
    author_name: who,
    text_content: text,
    media_url: extra.media ?? null,
    external_link: null,
    status: "approved",
    ornament_key: null,
    visibility: "public",
    data: extra.data ?? null,
    created_at: "",
  };
}

const letter = "Your letter goes here. Write it the way you’d say it to her face.";

const site: GiftSite = {
  ...DEMO_GIFTS.ana.site,
  id: ID,
  slug: ID,
  title: "a little shower for chai",
  style: "wax-seal",
  occasion: "bridal-shower",
  format: "scrapbook",
  custom_colors: palette,
  countdown_at: null,
  intro_text: null,
  intro_settings: {
    seal: { initial: "c", for_line: "for chai", card_line: "a little shower", date: "2026-11-17" },
  },
  format_settings: {
    event: {
      time: "14:00",
      end: "21:00",
      tz: "Asia/Manila",
      place: "One Legazpi Park",
      address: "Legazpi Village, Makati",
      sign: "love,\ndanielle, lia,\ngwyn & aye",
      schedule: [
        { time: "2:00 PM", what: "Meet up at One Legazpi Park" },
        { time: "2:30 PM", what: "Grocery run for dinner" },
        { time: "4:00 PM", what: "Flower arranging" },
        { time: "5:00 PM", what: "Set the table and start cooking" },
        { time: "7:00 PM", what: "Dinner" },
        { time: "8:30 PM", what: "Letters for Chai and a group photo" },
      ],
      menu: [
        { label: "to start", what: "A salad with whatever looks best at the grocery" },
        { label: "the main", what: "Something we cook together" },
        { label: "for dessert", what: "A little cake for the bride" },
      ],
    },
  } as GiftSite["format_settings"],
  custom_text: {
    heading: "a little shower for chai, before she says it all again.",
    recipient_name: "Chai",
    intro_message:
      "Before Chai and Sebi say their vows again, this time before God, we want one afternoon that’s just for her.\n\nWe’ll spend the afternoon making it ourselves: a grocery run, flowers to arrange, a table to set. Then we sit down to dinner together, with old stories and a few games that will definitely embarrass her. Bring your loudest laugh, and maybe a tissue.\n\nWe’re so glad you’re coming.",
    letters_title: "a little note for chai",
    photobooth_title: "the vision board",
    footer_note: "sebi & chai, 11.24.26",
  },
};

const types: ModuleType[] = ["letters", "photobooth", "babies"];
const modules: SiteModule[] = types.map((t, i) => ({
  id: `chai-m${i}`,
  site_id: ID,
  module_type: t,
  price: 0,
  enabled: true,
}));

const notes: ViewContribution[] = [
  note("babies", "Danielle", null),
  note("babies", "Lia", null),
  note("babies", "Danielle", null, { data: { who: "Chai" } }),
  note("babies", "Gwyn", null),
  note("babies", "Aye", null),
  note("letters", "Danielle", letter),
  note("letters", "Lia", letter),
  note("letters", "Gwyn", letter),
  note("letters", "Aye", letter),
  note("photobooth", "Danielle", "chai", { media: "/demo/bouquet.webp" }),
  note("photobooth", "Danielle", "danielle", { media: "/demo/picnic.webp" }),
  note("photobooth", "Lia", "lia", { media: "/demo/venue.webp" }),
  note("photobooth", "Gwyn", "gwyn", { media: "/demo/window.webp" }),
  note("photobooth", "Aye", "aye", { media: "/demo/cake.webp" }),
];

export const CHAI_SHOWER = { site, modules, notes, palette, theme: null };
