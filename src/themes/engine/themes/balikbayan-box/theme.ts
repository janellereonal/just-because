import { defineTheme } from "@/themes/engine/define";

/**
 * Balikbayan Box: the same parcel engine as Care Package, styled as a real
 * balikbayan box (taped all over, printed markings, the name in marker on the
 * side). Shown first to visitors from the Philippines; Care Package is shown
 * first to everyone else. Both are in the gallery for everyone.
 */
export default defineTheme({
  id: "balikbayan-box",
  name: "Balikbayan Box",
  dbName: "Balikbayan Box",
  object: "A balikbayan box, taped and marked, with a cargo label",
  gesture: "peel",
  gestureOptions: { axis: "x", direction: 1, distance: 230, threshold: 0.82 },
  hint: "theme.parcel.hint",
  afterDone: "stay",
  materials: ["cardboard", "paper"],
  effects: ["confetti"],
  sound: "cardboard",
  slots: ["recipient", "place", "senderPlace", "date", "photo"],
  palette: { background: "#F6EBDD", ink: "#3A2A20", surface: "#C3925B", accent: "#C8352B", accent2: "#1F4E8C" },
  fonts: {
    display: { family: '"Permanent Marker", "Comic Sans MS", cursive', source: "google", query: "Permanent+Marker" },
    text: { family: '"Archivo", system-ui, sans-serif', source: "google", query: "Archivo:wght@500;700;900" },
  },
  categories: ["Family", "Just because"],
  regions: { available: ["global"], featured: ["PH"] },
  price: { kind: "free" },
  handoff: { default: { mode: "reveal" } },
  load: () => import("./Object"),
  occasion: {
    defaultFormat: "hunt",
    sections: ["letters", "photobooth", "voice", "songs"],
    prompts: ["occasion.parcel2.prompt1", "occasion.parcel2.prompt2", "occasion.parcel2.prompt3", "occasion.parcel2.prompt4"],
    heading: "occasion.balikbayan.heading",
    greeting: "occasion.balikbayan.greeting",
  },
  strings: ["theme.balikbayan.para", "theme.balikbayan.box", "theme.balikbayan.doorToDoor", "theme.parcel.handleWithCare", "theme.parcel.thisSideUp"],
  status: "live",
});
