import { defineTheme } from "@/themes/engine/define";

/** Winter Cabin Christmas: wipe the frost off a cabin window to find a warm room and a tree hung with friends' notes. */
export default defineTheme({
  id: "winter-cabin",
  name: "Winter Cabin Christmas",
  dbName: "Winter Cabin Christmas",
  object: "A frosted cabin window with a warm room and a tree inside",
  gesture: "wipe",
  gestureOptions: { brush: 0.13, grid: [14, 16], threshold: 0.55 },
  hint: "theme.cabin.hint",
  afterDone: "stay",
  materials: ["wood", "frost", "glass"],
  effects: ["snow", "sparks"],
  sound: "frost",
  slots: ["recipient", "date"],
  palette: { background: "#1E2B3A", ink: "#F4F1EC", surface: "#6B4A33", accent: "#E39A3B", accent2: "#2F5D46" },
  fonts: {
    display: { family: '"Fraunces", Georgia, serif', source: "google", query: "Fraunces:ital,opsz,wght@0,9..144,500;0,9..144,700;1,9..144,500" },
    text: { family: '"DM Sans", system-ui, sans-serif', source: "google", query: "DM+Sans:wght@400;500;700" },
  },
  categories: ["Holidays"],
  regions: { available: ["global"] },
  price: { kind: "free" },
  handoff: { default: { mode: "reveal" } },
  load: () => import("./Object"),
  occasion: {
    defaultFormat: "scrapbook",
    sections: ["letters", "photobooth", "songs", "countdown"],
    prompts: ["occasion.cabin.prompt1", "occasion.cabin.prompt2", "occasion.cabin.prompt3", "occasion.cabin.prompt4"],
    heading: "occasion.cabin.heading",
    greeting: "occasion.cabin.greeting",
  },
  strings: ["theme.cabin.hint", "theme.cabin.inside", "theme.cabin.empty"],
  status: "live",
});
