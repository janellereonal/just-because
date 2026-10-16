import { defineTheme } from "@/themes/engine/define";

/**
 * Parol Christmas: a capiz parol star. Each note lights one part of the star;
 * when it's all lit the parol glows and a soft bell rings. With Simbang Gabi
 * on, one part opens each night from 16 to 24 December.
 */
export default defineTheme({
  id: "parol",
  name: "Parol Christmas",
  dbName: "Parol Christmas",
  object: "A capiz parol star with streamers",
  gesture: "pop",
  hint: "theme.parol.hint",
  button: "theme.parol.lightAll",
  afterDone: "stay",
  offers: ["simbang"],
  materials: ["capiz", "wood"],
  effects: ["sparks", "dust"],
  sound: "capiz",
  slots: ["recipient", "monogram"],
  palette: { background: "#111833", ink: "#F6EEDC", surface: "#F6EEDC", accent: "#E8B04B", accent2: "#C8453B" },
  fonts: {
    display: { family: '"Young Serif", Georgia, serif', source: "google", query: "Young+Serif" },
    text: { family: '"DM Sans", system-ui, sans-serif', source: "google", query: "DM+Sans:wght@400;500;700" },
  },
  categories: ["Holidays"],
  regions: { available: ["global"], featured: ["PH"] },
  price: { kind: "free" },
  handoff: { default: { mode: "reveal" } },
  load: () => import("./Object"),
  occasion: {
    defaultFormat: "scrapbook",
    sections: ["letters", "photobooth", "songs", "voice"],
    prompts: ["occasion.parol.prompt1", "occasion.parol.prompt2", "occasion.parol.prompt3", "occasion.parol.prompt4"],
    heading: "occasion.parol.heading",
    greeting: "occasion.parol.greeting",
  },
  strings: ["theme.parol.hint", "theme.parol.lightAll", "theme.parol.night", "theme.parol.before", "theme.parol.next", "theme.parol.allLit", "theme.parol.simbangOption"],
  status: "live",
});
