import { defineTheme } from "@/themes/engine/define";

/** Care Package: a parcel from far away. Peel the tape, the flaps open, and friends' notes come out as things packed inside. */
export default defineTheme({
  id: "care-package",
  name: "Care Package",
  dbName: "Care Package",
  regionalNames: {},
  object: "A cardboard parcel with stamps and a shipping label",
  gesture: "peel",
  gestureOptions: { axis: "x", direction: 1, distance: 230, threshold: 0.82 },
  hint: "theme.parcel.hint",
  afterDone: "stay",
  materials: ["cardboard", "paper"],
  effects: ["confetti"],
  sound: "cardboard",
  slots: ["recipient", "place", "senderPlace", "date", "photo"],
  palette: { background: "#EAF0F2", ink: "#2D3640", surface: "#C89B65", accent: "#C8452B", accent2: "#2F5D86" },
  fonts: {
    display: { family: '"Fraunces", Georgia, serif', source: "google", query: "Fraunces:ital,opsz,wght@0,9..144,500;0,9..144,700;1,9..144,500" },
    text: { family: '"Space Mono", ui-monospace, monospace', source: "google", query: "Space+Mono:wght@400;700" },
  },
  categories: ["Family", "Just because"],
  regions: { available: ["global"] },
  price: { kind: "free" },
  handoff: { default: { mode: "reveal" } },
  load: () => import("./Object"),
  occasion: {
    defaultFormat: "hunt",
    sections: ["letters", "photobooth", "voice", "songs"],
    prompts: ["occasion.parcel2.prompt1", "occasion.parcel2.prompt2", "occasion.parcel2.prompt3", "occasion.parcel2.prompt4"],
    heading: "occasion.parcel2.heading",
    greeting: "occasion.parcel2.greeting",
  },
  strings: ["theme.parcel.hint", "theme.parcel.inside", "theme.parcel.to", "theme.parcel.from", "theme.parcel.fragile", "theme.parcel.thisSideUp", "theme.parcel.packedWith"],
  status: "live",
});
