/**
 * Sample notes for every section, written to fit any occasion and addressed
 * to whoever the preview is for. Used by the theme page ("try the sections")
 * and the create page's section preview. Made up, never stored.
 */
import type { ModuleType, ViewContribution } from "@/lib/gift";

const FRIENDS = ["Lia", "Jo", "Mika", "Theo", "Noor", "Sam", "Ren", "Dani"];
const inDays = (d: number) => new Date(Date.now() + d * 86400000).toISOString();

export function sampleNotes(recipient: string, siteId: string): ViewContribution[] {
  const who = recipient || "you";
  let n = 0;
  const note = (
    type: ModuleType,
    author: string,
    text: string | null,
    extra: { media?: string; data?: Record<string, unknown> } = {},
  ): ViewContribution => ({
    id: `${siteId}-s${(n += 1)}`,
    site_id: siteId,
    module_type: type,
    author_name: author,
    text_content: text,
    media_url: extra.media ?? null,
    external_link: null,
    status: "approved",
    ornament_key: null,
    visibility: "public",
    data: extra.data ?? null,
    created_at: "",
  });

  return [
    note("letters", "Lia", `I keep a list of the best things that ever happened to me. You're on it twice. Thank you for being exactly who you are, ${who}.`),
    note("letters", "Jo", "You remember everyone's coffee order and nobody remembers yours. Today we remembered. Oat flat white, extra hot."),
    note("letters", "Mika", "Every good story I tell starts with you saying \"wait, let's just go.\" Here's to a hundred more."),
    note("letters", "Theo", "Short and sweet, like you: we love you."),
    note("photobooth", "Noor", "The picnic where the wind took the napkins", { media: "/demo/picnic.webp" }),
    note("photobooth", "Sam", "Rooftop, the night the city went quiet", { media: "/demo/rooftop.webp" }),
    note("photobooth", "Ren", "Beach day we planned in an hour", { media: "/demo/beach.webp" }),
    note("photobooth", "Dani", "Sunrise hike. Worth it, eventually.", { media: "/demo/hike.webp" }),
    note("photobooth", "Jo", "Karaoke. We don't talk about the encore.", { media: "/demo/karaoke.webp" }),
    note("photobooth", "Lia", "Rainy day by the window", { media: "/demo/window.webp" }),
    note("voice", "Mika", "A very serious message (it is not serious)", { media: "/demo/voice-team.mp3" }),
    ...[["Lia", "kind"], ["Jo", "funny"], ["Mika", "brave"], ["Theo", "home"], ["Noor", "loyal"], ["Sam", "golden"], ["Ren", "calm"], ["Dani", "generous"], ["Jo", "kind"], ["Noor", "kind"]].map(([a, w]) =>
      note("wordcloud", a!, w!),
    ),
    note("openwhen", "Lia", "Put the kettle on and call me, whatever the time is. You've done harder things than this, and I was there for most of them.", { data: { when: "you're having a bad day" } }),
    note("openwhen", "Theo", "Remember the taxi that took us to the wrong town and the best noodles of our lives? Getting lost is half the fun.", { data: { when: "you need a laugh" } }),
    note("openwhen", "Noor", "Look out the window. Somewhere out there, all of us are thinking about you. Mostly about you.", { data: { when: "you miss us" } }),
    note("superlatives", "Jo", "Every wedding. Every graduation. One time at a bank.", { data: { award: "Most likely to cry at a toast" } }),
    note("superlatives", "Mika", null, { data: { award: "Most likely to cry at a toast" } }),
    note("superlatives", "Ren", null, { data: { award: "Most likely to cry at a toast" } }),
    note("superlatives", "Dani", "First person I call when things go wrong.", { data: { award: "Kindest in a crisis" } }),
    note("superlatives", "Sam", null, { data: { award: "Kindest in a crisis" } }),
    note("superlatives", "Theo", "The road trip playlist is still undefeated.", { data: { award: "Best playlist" } }),
    note("quiz", "Lia", null, { data: { question: `What does ${who} always order?`, answer: "The thing nobody else would", wrong: ["Whatever's cheapest", "Just a salad"] } }),
    note("quiz", "Jo", null, { data: { question: `Where did ${who} and Jo first meet?`, answer: "In the wrong classroom", wrong: ["At a concert", "On a train"] } }),
    note("quiz", "Noor", null, { data: { question: `How many umbrellas has ${who} lost this year?`, answer: "Three", wrong: ["One", "None, very careful"] } }),
    note("map", "Mika", "Where the rain didn't stop us.", { data: { place: "The old town square" } }),
    note("map", "Ren", "Four in the morning, worth it.", { data: { place: "The sunrise trail" } }),
    note("map", "Lia", "Where it all started.", { data: { place: "The corner café" } }),
    note("coupons", "Jo", null, { data: { title: "One home-cooked dinner", fine_print: "Your pick. I'll do the dishes too." } }),
    note("coupons", "Sam", null, { data: { title: "A no-questions-asked pickup", fine_print: "Any hour. Snacks in the car." } }),
    note("coupons", "Dani", null, { data: { title: "A playlist made to order", fine_print: "Any mood, any length." } }),
    note("video", "Theo", "We made you a little something", { media: "/demo/video-generic.mp4" }),
    note("doodle", "Ren", "a toast, to you", { media: "/demo/doodle-toast.png" }),
    note("doodle", "Noor", "the sky the night we stayed up late", { media: "/demo/doodle-plane.png" }),
    note("capsule", "Lia", `Written a year ago, sealed until today. If you're reading this, ${who}, I was right about everything. Love you.`, { data: { unlock_at: inDays(-1) } }),
    note("capsule", "Mika", null, { data: { unlock_at: inDays(365), locked: true } }),
  ];
}

export const SAMPLE_FRIENDS = FRIENDS;
