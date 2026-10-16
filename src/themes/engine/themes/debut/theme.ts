import { defineTheme } from "@/themes/engine/define";

/**
 * Debut: an 18th birthday, after the Filipino tradition. Pull the cord and the
 * curtain opens on a stage with 18 candles and 18 roses. Each candle holds a
 * friend's note ("18 treasures"): light one to read it, and its rose blooms.
 */
export default defineTheme({
  id: "debut",
  name: "Debut",
  dbName: "Debut",
  object: "A grand doorway with a velvet curtain, 18 candles and 18 roses",
  gesture: "pull",
  gestureOptions: { distance: 150, threshold: 0.8 },
  hint: "theme.debut.hint",
  afterDone: "stay",
  materials: ["fabric", "metal", "paper"],
  effects: ["petals", "sparks"],
  sound: "fabric",
  slots: ["recipient", "date"],
  palette: { background: "#2A1A22", ink: "#FBF3EA", surface: "#B8707A", accent: "#D9B46A", accent2: "#E9C9B6" },
  fonts: {
    display: { family: '"Cormorant Garamond", Georgia, serif', source: "google", query: "Cormorant+Garamond:ital,wght@0,500;0,600;1,500;1,600" },
    text: { family: '"DM Sans", system-ui, sans-serif', source: "google", query: "DM+Sans:wght@400;500;700" },
  },
  categories: ["Birthdays", "Milestones"],
  regions: { available: ["global"], featured: ["PH"] },
  price: { kind: "free" },
  handoff: { default: { mode: "reveal" } },
  load: () => import("./Object"),
  occasion: {
    defaultFormat: "storybook",
    sections: ["letters", "photobooth", "songs", "voice", "superlatives"],
    prompts: ["occasion.debut.prompt1", "occasion.debut.prompt2", "occasion.debut.prompt3", "occasion.debut.prompt4", "occasion.debut.prompt5"],
    heading: "occasion.debut.heading",
    greeting: "occasion.debut.greeting",
  },
  strings: ["theme.debut.hint", "theme.debut.light", "theme.debut.lightAll", "theme.debut.treasures", "theme.debut.candle", "theme.debut.rose"],
  status: "live",
});
