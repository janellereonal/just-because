/**
 * Example gifts for the landing page and /example/$id. Made up, never stored.
 * Four people, four occasions: Ana's 30th, Sam's send-off, Milo the dog and
 * Nora & James's wedding.
 */
import type { GiftSite, ModuleType, SiteModule, ViewContribution } from "@/lib/gift";
import type { Palette, Theme } from "@/lib/themes";
import type { ThemeKind } from "@/lib/themeKind";

export type DemoId = "ana" | "sam" | "milo" | "nora-james";

export type DemoGift = {
  id: DemoId;
  kind: ThemeKind;
  /** Who it's for, as the card says it. */
  who: string;
  occasion: string;
  line: string;
  theme: Theme;
  palette: Palette;
  site: GiftSite;
  modules: SiteModule[];
  notes: ViewContribution[];
  friends: string[];
};

function theme(name: string, category: string, palette: Palette): Theme {
  return {
    id: `demo-${name}`,
    name,
    category,
    preview_image_url: null,
    palettes: [palette],
    suggested_palette_ids: [],
    description: null,
    status: "published",
    default_modules: [],
    created_at: "",
  };
}

function site(
  id: string,
  recipient: string,
  heading: string,
  palette: Palette,
  extra: Partial<GiftSite> = {},
): GiftSite {
  return {
    id: `demo-${id}`,
    creator_id: "demo",
    title: heading,
    theme_id: null,
    slug: `demo-${id}`,
    status: "published",
    format: "scrapbook",
    format_settings: {},
    custom_text: {
      heading,
      recipient_name: recipient,
      intro_message: "Everyone who loves you put something in here. Take your time.",
      footer_note: "With love, from all of us",
    },
    custom_colors: palette,
    palette_id: null,
    share_notes: true,
    font_choice: "theme",
    countdown_date: null,
    countdown_at: null,
    calendar_locked: false,
    intro_text: null,
    intro_settings: {},
    solo: false,
    character: null,
    icon_set: null,
    background_style: "paper",
    tree_reveal_date: null,
    tier: "celebration",
    published_at: null,
    expires_at: null,
    created_at: "",
    password_set: false,
    password_protected: false,
    unlocked: true,
    ...extra,
  };
}

const mods = (id: string, types: ModuleType[]): SiteModule[] =>
  types.map((t, i) => ({
    id: `${id}-m${i}`,
    site_id: `demo-${id}`,
    module_type: t,
    price: 0,
    enabled: true,
  }));

let n = 0;
function note(
  gift: string,
  type: ModuleType,
  who: string,
  text: string | null,
  extra: { media?: string; link?: string; data?: Record<string, unknown> } = {},
): ViewContribution {
  n += 1;
  return {
    id: `${gift}-${n}`,
    site_id: `demo-${gift}`,
    module_type: type,
    author_name: who,
    text_content: text,
    media_url: extra.media ?? null,
    external_link: extra.link ?? null,
    status: "approved",
    ornament_key: null,
    visibility: "public",
    data: extra.data ?? null,
    created_at: "",
  };
}

const inDays = (d: number) => new Date(Date.now() + d * 86400000).toISOString();

/* ---------- Ana's 30th ---------- */

const ANA_FRIENDS = [
  "Liam",
  "Sofia",
  "Mateo",
  "Aisha",
  "Chen",
  "Priya",
  "Noah",
  "Yuki",
  "Omar",
  "Emma",
  "Lucas",
  "Zara",
];
const anaPalette: Palette = { background: "#FFF6E5", primary: "#243087", accent: "#E8577E" };

const ana: DemoGift = {
  id: "ana",
  kind: "birthday",
  who: "Ana",
  occasion: "Turning 30",
  line: "12 friends, 3 countries, one cake",
  theme: theme("Happy Birthday", "Celebration", anaPalette),
  palette: anaPalette,
  site: site("ana", "Ana", "Happy 30th, Ana", anaPalette, { countdown_at: inDays(4) }),
  modules: mods("ana", [
    "letters",
    "photobooth",
    "voice",
    "wordcloud",
    "countdown",
    "superlatives",
    "quiz",
  ]),
  friends: ANA_FRIENDS,
  notes: [
    note(
      "ana",
      "letters",
      "Sofia",
      "Thirty looks good on you. Thank you for every late-night call and every early-morning coffee. Here's to the best decade yet.",
    ),
    note("ana", "photobooth", "Liam", "The cake that almost didn't make it", {
      media: "/demo/cake.webp",
    }),
    note(
      "ana",
      "letters",
      "Mateo",
      "You taught me how to cook rice properly and how to be a good friend. Both have been very useful.",
    ),
    note("ana", "photobooth", "Yuki", "That trip where it rained all week", {
      media: "/demo/city.webp",
    }),
    note(
      "ana",
      "letters",
      "Aisha",
      "You make every room warmer. Never change, and never stop sending voice notes that are six minutes long.",
    ),
    note("ana", "voice", "Priya", "A little voice note from all of us at the office"),
    note("ana", "photobooth", "Emma", "Sunrise hike, worth it", { media: "/demo/mountains.webp" }),
    note(
      "ana",
      "letters",
      "Omar",
      "Happy birthday to the person who remembers everyone's birthday. Today it's your turn.",
    ),
    ...["kind", "funny", "brave", "loyal", "home"].map((w, i) =>
      note("ana", "wordcloud", ANA_FRIENDS[i + 6]!, w),
    ),
    note("ana", "superlatives", "Noah", "Every single wedding.", {
      data: { award: "Most likely to cry at a toast" },
    }),
    note("ana", "superlatives", "Zara", null, { data: { award: "Most likely to cry at a toast" } }),
    note("ana", "superlatives", "Lucas", null, { data: { award: "Best playlist" } }),
    note("ana", "quiz", "Lucas", null, {
      data: {
        question: "Where did Ana and Sofia first meet?",
        answer: "In a library",
        wrong: ["At a concert", "On a train"],
      },
    }),
    note("ana", "quiz", "Chen", null, {
      data: {
        question: "What's Ana's go-to karaoke song?",
        answer: "Dancing Queen",
        wrong: ["Wonderwall", "Bohemian Rhapsody"],
      },
    }),
  ],
};

/* ---------- Sam's send-off ---------- */

const samPalette: Palette = { background: "#EEF5FB", primary: "#22303F", accent: "#F2652E" };
const sam: DemoGift = {
  id: "sam",
  kind: "voyage",
  who: "Sam",
  occasion: "Moving abroad",
  line: "Open-when letters for the first hard week",
  theme: theme("Bon Voyage", "Farewell", samPalette),
  palette: samPalette,
  site: site("sam", "Sam", "Bon voyage, Sam", samPalette),
  modules: mods("sam", ["letters", "openwhen", "map", "photobooth"]),
  friends: ["Jordan", "Mia", "Ethan", "Leila", "Ravi", "Hana"],
  notes: [
    note(
      "sam",
      "letters",
      "Jordan",
      "The office is going to be so quiet. Go be brilliant somewhere new.",
    ),
    note("sam", "openwhen", "Mia", "Call me. Whatever time it is there, I'll pick up.", {
      data: { when: "you miss home" },
    }),
    note(
      "sam",
      "openwhen",
      "Ethan",
      "Remember the night the taxi took us to the wrong city? You'll find your way.",
      { data: { when: "you get lost" } },
    ),
    note(
      "sam",
      "openwhen",
      "Leila",
      "Go outside, buy the fanciest pastry you can find, and eat it slowly.",
      { data: { when: "you're having a bad day" } },
    ),
    note("sam", "map", "Ravi", "Where we said we'd move one day. You actually did it.", {
      data: { place: "Lisbon" },
    }),
    note("sam", "map", "Hana", "Our first team trip.", { data: { place: "The mountain cabin" } }),
    note("sam", "photobooth", "Hana", "Last team hike", { media: "/demo/mountains.webp" }),
  ],
};

/* ---------- Milo the dog ---------- */

const miloPalette: Palette = { background: "#FBF1E3", primary: "#3A2A22", accent: "#C0582F" };
const milo: DemoGift = {
  id: "milo",
  kind: "pets",
  who: "Milo",
  occasion: "Gotcha day",
  line: "From everyone at the dog park",
  theme: theme("Pets", "Pets", miloPalette),
  palette: miloPalette,
  site: site("milo", "Milo", "Happy gotcha day, Milo", miloPalette),
  modules: mods("milo", ["photobooth", "letters", "superlatives", "doodle"]),
  friends: ["Grace", "Daniel", "Ines", "Kofi"],
  notes: [
    note("milo", "photobooth", "Grace", "Best boy, park edition", { media: "/demo/dog.webp" }),
    note(
      "milo",
      "letters",
      "Daniel",
      "Thank you for always sharing your ball. Even when you don't want to.",
    ),
    note("milo", "superlatives", "Ines", "He has stolen four sandwiches this year.", {
      data: { award: "Fastest sandwich thief" },
    }),
    note("milo", "superlatives", "Kofi", null, { data: { award: "Fastest sandwich thief" } }),
    note("milo", "doodle", "Ines", "a portrait (sorry)"),
  ],
};

/* ---------- Nora & James ---------- */

const weddingPalette: Palette = { background: "#FBF8F1", primary: "#3A3A33", accent: "#8AA27C" };
const nora: DemoGift = {
  id: "nora-james",
  kind: "wedding",
  who: "Nora & James",
  occasion: "Their wedding",
  line: "A guestbook that doesn't get lost in a drawer",
  theme: theme("Weddings", "Wedding", weddingPalette),
  palette: weddingPalette,
  site: site("nora-james", "Nora & James", "Nora & James", weddingPalette),
  modules: mods("nora-james", ["letters", "photobooth", "capsule", "map"]),
  friends: ["Elena", "Sebastian", "Amara", "Hiro", "Lucia"],
  notes: [
    note(
      "nora-james",
      "letters",
      "Elena",
      "Watching you two dance was the best part of the year. Keep dancing in the kitchen.",
    ),
    note("nora-james", "photobooth", "Hiro", "The flowers, before the rain", {
      media: "/demo/flowers.webp",
    }),
    note("nora-james", "capsule", "Amara", null, {
      data: { unlock_at: inDays(365), locked: true },
    }),
    note("nora-james", "map", "Sebastian", "Where James got the ring stuck in the sand.", {
      data: { place: "The beach where he asked" },
    }),
    note("nora-james", "letters", "Lucia", "Two of my favorite people, now one very good team."),
  ],
};

export const DEMO_GIFTS: Record<DemoId, DemoGift> = { ana, sam, milo, "nora-james": nora };
export const DEMO_ORDER: DemoId[] = ["ana", "sam", "milo", "nora-james"];
export const isDemoId = (v: string): v is DemoId => v in DEMO_GIFTS;
