import { defineTheme } from "@/themes/engine/define";

/**
 * Dev-only sample for the engine: a kraft parcel with a strip of tape. Tear
 * the tape off and the flaps open. It exists to prove the engine end to end
 * (gesture, materials, sound, slots, handoff) and as a starting point for
 * Care Package. Never shown in the gallery.
 */
export default defineTheme({
  id: "kraft-parcel",
  name: "Kraft Parcel (sample)",
  object: "A taped cardboard parcel with a shipping label",
  gesture: "tear",
  gestureOptions: { distance: 220 },
  hint: "theme.kraftParcel.hint",
  materials: ["cardboard", "paper"],
  effects: ["sparks"],
  sound: "cardboard",
  slots: ["recipient", "place", "senderPlace", "monogram", "date"],
  palette: { background: "#EFE6D8", ink: "#3B2A1E", surface: "#C89B65", accent: "#B5623E", accent2: "#2F5D50" },
  fonts: {
    display: { family: '"Fraunces", Georgia, serif', source: "google", query: "Fraunces:opsz,wght@9..144,500;9..144,700" },
    text: { family: '"DM Sans", system-ui, sans-serif', source: "google", query: "DM+Sans:wght@400;500;700" },
  },
  categories: ["Family", "Just because"],
  regions: { available: ["global"] },
  price: { kind: "free" },
  handoff: { default: { mode: "reveal" }, comic: { mode: "fade" } },
  load: () => import("./Object"),
  status: "dev",
});
