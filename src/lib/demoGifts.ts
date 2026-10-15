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
/** A local time a few days from now, for countdowns that read naturally ("Sat, 7:00 pm"). */
const atLocal = (days: number, hour: number) => {
  const d = new Date();
  d.setDate(d.getDate() + days);
  d.setHours(hour, 0, 0, 0);
  return d.toISOString();
};

/* ---------- Ana's 30th ---------- */

const ANA_FRIENDS = ["Sofia", "Mateo", "Aisha", "Chen", "Priya", "Noah", "Yuki", "Omar", "Emma", "Lucas", "Zara", "Mom"];
const anaPalette: Palette = { background: "#FFF4DE", primary: "#243087", accent: "#E8577E" };

const ana: DemoGift = {
  id: "ana",
  kind: "birthday",
  who: "Ana",
  occasion: "Turning 30",
  line: "Twelve people, three countries, one very loud party",
  theme: theme("Happy Birthday", "Celebration", anaPalette),
  palette: anaPalette,
  site: site("ana", "Ana", "Happy 30th, Ana", anaPalette, {
    countdown_at: atLocal(4, 19),
    custom_text: {
      heading: "Happy 30th, Ana",
      recipient_name: "Ana",
      intro_message: "Sofia rounded up everyone who loves you. Twelve of us, three time zones, one gift. Take your time with it.",
      letters_title: "Letters for Ana",
      photobooth_title: "Thirty years, roughly in order",
      wordcloud_title: "You, in one word each",
      voice_title: "Press play",
      countdown_title: "the party at Sofia's",
      footer_note: "Saturday, 7pm, Sofia's place. Bring nothing but yourself.",
    },
  }),
  modules: mods("ana", ["letters", "photobooth", "voice", "wordcloud", "countdown", "openwhen", "superlatives", "quiz", "map", "coupons", "video", "doodle", "capsule"]),
  friends: ANA_FRIENDS,
  notes: [
    note("ana", "letters", "Sofia", "Twelve years ago you lent me a pen in a library and never asked for it back. Since then you've been my emergency contact, my second opinion and the person I call before anyone else. Thirty looks wonderful on you. Here's to the decade where you finally believe how good you are."),
    note("ana", "letters", "Mom", "My darling girl. I still remember the night you were born: it was raining, your dad got lost on the way to the hospital, and you arrived like you had somewhere to be. You still do. I am proud of you every single day."),
    note("ana", "letters", "Mateo", "You taught me how to cook rice properly and how to be a decent friend. Both have been extremely useful. Happy birthday from the worst cook you know."),
    note("ana", "letters", "Aisha", "You make every room warmer, and every group chat louder. Never change, and never stop sending voice notes that are six minutes long."),
    note("ana", "letters", "Omar", "Happy birthday to the person who remembers everyone's birthday. Today it's your turn to be remembered. Love from Toronto."),
    note("ana", "photobooth", "Noah", "The beach weekend we planned in an hour", { media: "/demo/beach.webp" }),
    note("ana", "photobooth", "Yuki", "Lisbon, the week it rained every day and we didn't care", { media: "/demo/tram.webp" }),
    note("ana", "photobooth", "Emma", "Sunrise hike. You said you'd never wake up that early again. You did, twice.", { media: "/demo/hike.webp" }),
    note("ana", "photobooth", "Zara", "Karaoke night. We still don't talk about the encore.", { media: "/demo/karaoke.webp" }),
    note("ana", "photobooth", "Priya", "The picnic where the wind took the napkins", { media: "/demo/picnic.webp" }),
    note("ana", "photobooth", "Chen", "Tonight's cake, sneak preview", { media: "/demo/cake.webp" }),
    note("ana", "voice", "Mom", "Your mom, singing (badly) from the kitchen", { media: "/demo/voice-mom.mp3" }),
    ...[["Sofia", "home"], ["Mateo", "kind"], ["Aisha", "brave"], ["Chen", "funny"], ["Priya", "loyal"], ["Noah", "golden"], ["Yuki", "calm"], ["Omar", "generous"], ["Emma", "bright"], ["Lucas", "loud"], ["Zara", "honest"]].map(([w, t]) => note("ana", "wordcloud", w!, t!)),
    note("ana", "openwhen", "Sofia", "Breathe. Put the kettle on. Call me, whatever the time is. You have done harder things than this, and I was there for most of them.", { data: { when: "you're having a bad day" } }),
    note("ana", "openwhen", "Lucas", "Remember the night the taxi took us to the wrong city and we ended up at the best noodle place of our lives? Getting lost is half the fun.", { data: { when: "you need a laugh" } }),
    note("ana", "openwhen", "Priya", "Close the laptop. Seriously. Nothing at work is more important than you. Go for a walk and text me a photo of a dog.", { data: { when: "work is too much" } }),
    note("ana", "superlatives", "Noah", "Every wedding. Every graduation. One time at a bank.", { data: { award: "Most likely to cry at a toast" } }),
    note("ana", "superlatives", "Zara", null, { data: { award: "Most likely to cry at a toast" } }),
    note("ana", "superlatives", "Emma", null, { data: { award: "Most likely to cry at a toast" } }),
    note("ana", "superlatives", "Aisha", "First person I call when things go wrong.", { data: { award: "Kindest in a crisis" } }),
    note("ana", "superlatives", "Omar", null, { data: { award: "Kindest in a crisis" } }),
    note("ana", "superlatives", "Chen", "The road trip playlist is still undefeated.", { data: { award: "Best playlist" } }),
    note("ana", "quiz", "Sofia", null, { data: { question: "Where did Ana and Sofia first meet?", answer: "In a library", wrong: ["At a concert", "On a train"] } }),
    note("ana", "quiz", "Chen", null, { data: { question: "What's Ana's go-to karaoke song?", answer: "Dancing Queen", wrong: ["Wonderwall", "Bohemian Rhapsody"] } }),
    note("ana", "quiz", "Mom", null, { data: { question: "What was Ana's first word?", answer: "Cat", wrong: ["Mama", "No"] } }),
    note("ana", "quiz", "Yuki", null, { data: { question: "How many umbrellas did Ana lose in Lisbon?", answer: "Three", wrong: ["One", "None, she's very careful"] } }),
    note("ana", "map", "Yuki", "Rain all week and we didn't care. You bought a yellow raincoat and wore it like a cape.", { data: { place: "Lisbon" } }),
    note("ana", "map", "Emma", "The sunrise hike. Four in the morning, worth it.", { data: { place: "Mount Rinjani trailhead" } }),
    note("ana", "map", "Sofia", "Where it all started. The pen is still yours.", { data: { place: "The university library" } }),
    note("ana", "map", "Omar", "Your first apartment. Four flights of stairs, one tiny balcony, a lot of good dinners.", { data: { place: "The flat on Rose Street" } }),
    note("ana", "coupons", "Sofia", null, { data: { title: "One weekend away, planned by me", fine_print: "You pick the month, I handle the rest." } }),
    note("ana", "coupons", "Mateo", null, { data: { title: "One home-cooked dinner", fine_print: "Rice included, properly cooked." } }),
    note("ana", "coupons", "Chen", null, { data: { title: "A playlist made to order", fine_print: "Any mood, any length." } }),
    note("ana", "video", "Priya", "Happy 30th from everyone at the office", { media: "/demo/video-ana.mp4" }),
    note("ana", "doodle", "Lucas", "a portrait. I did my best", { media: "/demo/doodle-ana.png" }),
    note("ana", "doodle", "Zara", "your cake, if I made it", { media: "/demo/doodle-cake.png" }),
    note("ana", "capsule", "Noah", "Written on your 29th, sealed for a year. If you're reading this, you made it to 30, and you were right about everything. Happy birthday.", { data: { unlock_at: inDays(-2) } }),
    note("ana", "capsule", "Sofia", null, { data: { unlock_at: inDays(365), locked: true } }),
    note("ana", "capsule", "Mom", null, { data: { unlock_at: inDays(365 * 5), locked: true } }),
  ],
};

/* ---------- Sam's send-off ---------- */

const samPalette: Palette = { background: "#EEF4FA", primary: "#22303F", accent: "#F2652E" };
const sam: DemoGift = {
  id: "sam",
  kind: "voyage",
  who: "Sam",
  occasion: "Moving to Lisbon",
  line: "Letters for the first hard week, from the whole team",
  theme: theme("Bon Voyage", "Farewell", samPalette),
  palette: samPalette,
  site: site("sam", "Sam", "Bon voyage, Sam", samPalette, {
    countdown_at: atLocal(9, 6),
    background_style: "clean",
    custom_text: {
      heading: "Bon voyage, Sam",
      recipient_name: "Sam",
      intro_message: "Five years, two office moves and roughly four hundred plants. Lisbon is lucky. Here's something from all of us for the road.",
      letters_title: "From the design team",
      photobooth_title: "Before you go",
      voice_title: "One last stand-up",
      countdown_title: "your flight",
      footer_note: "Your desk plants are safe with Hana. Mostly.",
    },
  }),
  modules: mods("sam", ["letters", "openwhen", "map", "photobooth", "countdown", "voice", "video", "coupons", "superlatives", "quiz", "capsule", "doodle"]),
  friends: ["Jordan", "Mia", "Ethan", "Leila", "Ravi", "Hana"],
  notes: [
    note("sam", "letters", "Jordan", "The office is going to be very quiet without you humming while you work. Go be brilliant somewhere new. We'll be watching your stories and pretending we're not jealous."),
    note("sam", "letters", "Leila", "You were the first person to say hello on my first day, and you've been saying it every day since. Thank you for making this place feel like ours."),
    note("sam", "letters", "Ravi", "Five years of shared desks, shared snacks and one shared fire alarm we will not discuss. Lisbon is getting the best one."),
    note("sam", "openwhen", "Mia", "Call me. Whatever time it is there, I'll pick up. And if I don't, I'm asleep, so call again.", { data: { when: "you miss home" } }),
    note("sam", "openwhen", "Ethan", "You moved a whole life to a new country. That's the hard part done. Everything else is just finding the good bakery.", { data: { when: "the first week feels long" } }),
    note("sam", "openwhen", "Leila", "Go outside, buy the fanciest pastry you can find, and eat it slowly by the river. Then send us a photo so we suffer.", { data: { when: "you're having a bad day" } }),
    note("sam", "openwhen", "Hana", "Your plants say hello. They've been told you're on holiday.", { data: { when: "you wonder about your plants" } }),
    note("sam", "map", "Ravi", "Where we said we'd move one day. You actually did it.", { data: { place: "Lisbon" } }),
    note("sam", "map", "Hana", "Our team trip. You fixed the heater with a paperclip.", { data: { place: "The mountain cabin" } }),
    note("sam", "map", "Jordan", "Friday drinks, every Friday, for five years.", { data: { place: "The rooftop on Fifth" } }),
    note("sam", "photobooth", "Hana", "Your desk, exactly as you left it", { media: "/demo/desk.webp" }),
    note("sam", "photobooth", "Jordan", "Last Friday on the roof", { media: "/demo/rooftop.webp" }),
    note("sam", "photobooth", "Mia", "Window seat, as requested", { media: "/demo/window.webp" }),
    note("sam", "photobooth", "Ethan", "Team trip, the morning after the heater", { media: "/demo/hike.webp" }),
    note("sam", "voice", "Ravi", "The whole team, humming your going-away song", { media: "/demo/voice-team.mp3" }),
    note("sam", "video", "Mia", "From home to Lisbon, with stamps", { media: "/demo/video-sam.mp4" }),
    note("sam", "coupons", "Jordan", null, { data: { title: "One airport pickup when you visit", fine_print: "Any hour. Snacks in the car." } }),
    note("sam", "coupons", "Leila", null, { data: { title: "A couch to crash on", fine_print: "Blanket included, cat not optional." } }),
    note("sam", "superlatives", "Ethan", "Four hundred plants. We counted.", { data: { award: "Best desk jungle" } }),
    note("sam", "superlatives", "Mia", null, { data: { award: "Best desk jungle" } }),
    note("sam", "superlatives", "Ravi", "Already says obrigado to the coffee machine.", { data: { award: "Most likely to be fluent first" } }),
    note("sam", "quiz", "Hana", null, { data: { question: "How many plants did Sam leave behind?", answer: "Fourteen", wrong: ["Six", "Too many to count"] } }),
    note("sam", "quiz", "Jordan", null, { data: { question: "What's Sam's go-to Friday order?", answer: "Lemonade and fries", wrong: ["A double espresso", "Whatever Ravi orders"] } }),
    note("sam", "capsule", "Leila", null, { data: { unlock_at: inDays(365), locked: true } }),
    note("sam", "doodle", "Hana", "you, flying away (rude)", { media: "/demo/doodle-plane.png" }),
  ],
};

/* ---------- Milo the dog ---------- */

const miloPalette: Palette = { background: "#FBF1E3", primary: "#3A2A22", accent: "#C0582F" };
const milo: DemoGift = {
  id: "milo",
  kind: "pets",
  who: "Milo",
  occasion: "Three years home",
  line: "From everyone at the dog park, and one cat",
  theme: theme("Pets", "Pets", miloPalette),
  palette: miloPalette,
  site: site("milo", "Milo", "Happy gotcha day, Milo", miloPalette, {
    custom_text: {
      heading: "Happy gotcha day, Milo",
      recipient_name: "Milo",
      intro_message: "Three years ago Grace brought home a very nervous puppy. Now he runs the dog park. This is from all his friends (and one cat).",
      letters_title: "Letters to a very good boy",
      photobooth_title: "Milo's greatest hits",
      footer_note: "Treats are in the usual drawer. Don't tell him.",
    },
  }),
  modules: mods("milo", ["photobooth", "letters", "video", "superlatives", "quiz", "coupons", "map", "doodle"]),
  friends: ["Grace", "Daniel", "Ines", "Kofi", "Biscuit"],
  notes: [
    note("milo", "photobooth", "Grace", "Day one at the park, three years ago", { media: "/demo/dogpark.webp" }),
    note("milo", "photobooth", "Daniel", "Frisbee champion, beach division", { media: "/demo/dogbeach.webp" }),
    note("milo", "photobooth", "Ines", "Exhausted after doing absolutely nothing", { media: "/demo/dognap.webp" }),
    note("milo", "letters", "Grace", "Three years ago you hid under the bed for a whole day. Now you greet every delivery driver like a long-lost friend. Thank you for choosing us back. Best boy, forever."),
    note("milo", "letters", "Daniel", "Thank you for always sharing your ball. Even when you clearly don't want to. Especially then."),
    note("milo", "letters", "Biscuit", "(Translated from the cat next door.) You are loud and you smell of grass. I suppose you are acceptable. Happy gotcha day."),
    note("milo", "video", "Kofi", "Zoomies, 6pm, every single day", { media: "/demo/video-milo.mp4" }),
    note("milo", "superlatives", "Ines", "Four sandwiches this year. Four.", { data: { award: "Fastest sandwich thief" } }),
    note("milo", "superlatives", "Kofi", null, { data: { award: "Fastest sandwich thief" } }),
    note("milo", "superlatives", "Daniel", null, { data: { award: "Fastest sandwich thief" } }),
    note("milo", "superlatives", "Grace", "Knows sit, paw and 'where's your ball'.", { data: { award: "Smartest in the park" } }),
    note("milo", "quiz", "Grace", null, { data: { question: "What's Milo's favorite toy?", answer: "The squeaky duck", wrong: ["Any tennis ball", "Grace's left shoe"] } }),
    note("milo", "quiz", "Kofi", null, { data: { question: "Where does Milo nap after the park?", answer: "On the round rug by the window", wrong: ["In his bed, obviously", "On Grace's pillow"] } }),
    note("milo", "coupons", "Daniel", null, { data: { title: "One extra-long walk", fine_print: "The river path, all the way to the bridge." } }),
    note("milo", "coupons", "Ines", null, { data: { title: "Belly rubs, unlimited", fine_print: "No expiry date." } }),
    note("milo", "map", "Grace", "Where we walk every morning.", { data: { place: "The river path" } }),
    note("milo", "map", "Kofi", "Your bench. Nobody else sits there.", { data: { place: "The dog park bench" } }),
    note("milo", "doodle", "Ines", "a portrait (sorry, Milo)", { media: "/demo/doodle-milo.png" }),
  ],
};

/* ---------- Nora & James ---------- */

const weddingPalette: Palette = { background: "#FBF8F1", primary: "#3A3A33", accent: "#7E9A70" };
const nora: DemoGift = {
  id: "nora-james",
  kind: "wedding",
  who: "Nora & James",
  occasion: "Their wedding",
  line: "A guestbook that won't get lost in a drawer",
  theme: theme("Weddings", "Wedding", weddingPalette),
  palette: weddingPalette,
  site: site("nora-james", "Nora & James", "Nora & James", weddingPalette, {
    background_style: "formal",
    custom_text: {
      heading: "Nora & James",
      recipient_name: "Nora & James",
      intro_message: "For the two of you, from everyone who danced at Villa Rosa. Open it on a quiet morning with coffee.",
      letters_title: "The guestbook",
      photobooth_title: "The day",
      voice_title: "A message from Grandma Rose",
      footer_note: "Here's to the next fifty years.",
    },
  }),
  modules: mods("nora-james", ["letters", "photobooth", "voice", "video", "openwhen", "capsule", "map", "superlatives", "quiz", "coupons", "doodle"]),
  friends: ["Elena", "Sebastian", "Amara", "Hiro", "Lucia", "Grandma Rose"],
  notes: [
    note("nora-james", "letters", "Elena", "Watching you two dance under the lights was the best part of my year. Keep dancing in the kitchen, keep choosing each other on the boring days, and call me when you need a referee."),
    note("nora-james", "letters", "Sebastian", "James, you were nervous all morning and calm the second you saw her. Nora, thank you for making my best friend the happiest I've ever seen him."),
    note("nora-james", "letters", "Lucia", "Two of my favorite people, now one very good team. Wishing you a home full of friends, books and slightly burnt toast."),
    note("nora-james", "letters", "Hiro", "May your Wi-Fi be strong, your arguments short and your holidays long."),
    note("nora-james", "photobooth", "Hiro", "The table, just before everyone sat down", { media: "/demo/venue.webp" }),
    note("nora-james", "photobooth", "Amara", "First dance", { media: "/demo/dance.webp" }),
    note("nora-james", "photobooth", "Lucia", "The bouquet, before Elena caught it", { media: "/demo/bouquet.webp" }),
    note("nora-james", "photobooth", "Sebastian", "The rings I definitely didn't almost forget", { media: "/demo/rings.webp" }),
    note("nora-james", "voice", "Grandma Rose", "Grandma Rose, humming the song from her own wedding", { media: "/demo/voice-grandma.mp3" }),
    note("nora-james", "video", "Elena", "The toast, in under five seconds", { media: "/demo/video-wedding.mp4" }),
    note("nora-james", "openwhen", "Elena", "Stop. Hold hands. Remember the dance. Then talk it out over toast.", { data: { when: "you have your first big fight" } }),
    note("nora-james", "openwhen", "Grandma Rose", "Sixty-one years in, here's my secret: say thank you for the small things. Every single day.", { data: { when: "you've been married a year" } }),
    note("nora-james", "openwhen", "Amara", "New walls, same two people. It's home the minute you're both in it.", { data: { when: "you move into your first home" } }),
    note("nora-james", "capsule", "Sebastian", null, { data: { unlock_at: inDays(365), locked: true } }),
    note("nora-james", "capsule", "Elena", null, { data: { unlock_at: inDays(365 * 10), locked: true } }),
    note("nora-james", "map", "Lucia", "Where James knocked over a whole shelf and Nora helped pick it up.", { data: { place: "The bookshop on King Street" } }),
    note("nora-james", "map", "Sebastian", "Where he asked. The ring got stuck in the sand for a full minute.", { data: { place: "The beach where he asked" } }),
    note("nora-james", "map", "Hiro", "Where everyone danced until the lights came on.", { data: { place: "Villa Rosa" } }),
    note("nora-james", "superlatives", "Amara", "Still holding hands at the grocery store.", { data: { award: "Most likely to hold hands at ninety" } }),
    note("nora-james", "superlatives", "Lucia", null, { data: { award: "Most likely to hold hands at ninety" } }),
    note("nora-james", "superlatives", "Elena", "Sorry, Nora. It's James.", { data: { award: "Best dance moves" } }),
    note("nora-james", "quiz", "Lucia", null, { data: { question: "Where did Nora and James meet?", answer: "In a bookshop", wrong: ["At a wedding", "On a dating app"] } }),
    note("nora-james", "quiz", "Sebastian", null, { data: { question: "How long was the ring stuck in the sand?", answer: "About a minute", wrong: ["An hour", "It's still there"] } }),
    note("nora-james", "coupons", "Amara", null, { data: { title: "One night of babysitting", fine_print: "Valid for any future small humans or dogs." } }),
    note("nora-james", "coupons", "Hiro", null, { data: { title: "A date night, our treat", fine_print: "Dinner booked, tables for two." } }),
    note("nora-james", "doodle", "Amara", "the two of you, under the flowers", { media: "/demo/doodle-wedding.png" }),
    note("nora-james", "doodle", "Hiro", "cheers", { media: "/demo/doodle-toast.png" }),
  ],
};

export const DEMO_GIFTS: Record<DemoId, DemoGift> = { ana, sam, milo, "nora-james": nora };
export const DEMO_ORDER: DemoId[] = ["ana", "sam", "milo", "nora-james"];
export const isDemoId = (v: string): v is DemoId => v in DEMO_GIFTS;
