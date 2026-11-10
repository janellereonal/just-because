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
      link: "https://sebiandchai.maxima.studio/",
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
    songs_title: "songs for the afternoon",
    video_title: "after the shower",
    doodle_title: "chai & the dogs",
  },
};

const types: ModuleType[] = ["letters", "photobooth", "babies", "songs", "video", "doodle"];
const modules: SiteModule[] = types.map((t, i) => ({
  id: `chai-m${i}`,
  site_id: ID,
  module_type: t,
  price: 0,
  enabled: true,
}));

const notes: ViewContribution[] = [
  // Guess the baby: clay characters stand in for the real baby photos.
  note("babies", "Danielle", null, { media: "/clay/people/birthday-kid.webp" }),
  note("babies", "Lia", "I had more hair then", { media: "/clay/people/sunny.webp" }),
  note("babies", "Danielle", null, {
    media: "/clay/people/little-one.webp",
    data: { who: "Chai" },
  }),
  note("babies", "Gwyn", null, { media: "/clay/people/dreamer.webp" }),
  note("babies", "Aye", "Already bossy at two", { media: "/clay/people/sporty.webp" }),
  // Letters: samples until the real ones are pasted in.
  note(
    "letters",
    "Danielle",
    "A sample letter, so you can see how it reads.\n\nChai, you were the first person to make me feel at home in the city. I can't wait to watch you say it all again.",
  ),
  note(
    "letters",
    "Lia",
    "A sample letter.\n\nYou make every table feel like a feast. Thank you for always saving me a seat.",
  ),
  note(
    "letters",
    "Gwyn",
    "A sample letter.\n\nTen dogs, one bride, zero chill. We love you so much.",
  ),
  note(
    "letters",
    "Aye",
    "A sample letter.\n\nHere's to the girl who plans everything, finally letting us plan something for her.",
  ),
  // The vision board: stand-in photos.
  note("photobooth", "Danielle", "chai", { media: "/demo/bouquet.webp" }),
  note("photobooth", "Danielle", "danielle", { media: "/demo/picnic.webp" }),
  note("photobooth", "Lia", "lia", { media: "/demo/venue.webp" }),
  note("photobooth", "Gwyn", "gwyn", { media: "/demo/window.webp" }),
  note("photobooth", "Aye", "aye", { media: "/demo/cake.webp" }),
  // Songs for the afternoon: sample clips that play right on the page.
  note("songs", "Lia", "The one we sang the whole way to Batangas.", {
    media: "/demo/voice-team.mp3",
  }),
  // After the shower: sample videos.
  note("video", "Danielle", "the grocery run", { media: "/demo/video-wedding.mp4" }),
  note("video", "Lia", "flowers, attempt one", { media: "/demo/video-generic.mp4" }),
  note("video", "Gwyn", "dinner is served", { media: "/demo/video-sam.mp4" }),
  note("video", "Aye", "the group photo", { media: "/demo/video-ana.mp4" }),
  // The drawing from the reference (a girl with ten dogs), until the real one is uploaded.
  note("doodle", "Danielle", null, { media: "/demo/chai-dogs.svg" }),
];

export const CHAI_SHOWER = { site, modules, notes, palette, theme: null };
