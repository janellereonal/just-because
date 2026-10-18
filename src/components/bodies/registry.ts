/**
 * Which styles read in a body of their own (flag styleBodies). Every theme style
 * gets one, so no two styles read alike; layout styles (Scrapbook, Mixtape...)
 * already are their body. A gift's stored `format` stays as it was, so turning the
 * flag off (or an old gift without a style) reads exactly as before.
 */
import { lazy, type ComponentType } from "react";
import { isFlagOn } from "@/config/flags";
import { isStyleId, type StyleId } from "@/lib/styles";
import type { BodyProps } from "@/components/bodies/kit";

type Lazy = ComponentType<BodyProps>;

const BODIES: Partial<Record<StyleId, Lazy>> = {};

/** Registers a body. Each body file is loaded only when a gift needs it. */
function body(id: StyleId, load: () => Promise<{ default: Lazy }>) {
  BODIES[id] = lazy(load);
}

body("love-letter", () => import("@/components/bodies/LettersBody").then((m) => ({ default: m.LettersBody })));
body("cake", () => import("@/components/bodies/PartyBody").then((m) => ({ default: m.PartyBody })));
body("record-player", () => import("@/components/bodies/CrateBody").then((m) => ({ default: m.CrateBody })));
body("invitation", () => import("@/components/bodies/ReceptionBody").then((m) => ({ default: m.ReceptionBody })));
body("countdown", () => import("@/components/bodies/RooftopBody").then((m) => ({ default: m.RooftopBody })));
body("boarding-pass", () => import("@/components/bodies/PassportBody").then((m) => ({ default: m.PassportBody })));
body("gift-box", () => import("@/components/bodies/PresentsBody").then((m) => ({ default: m.PresentsBody })));
body("crib-mobile", () => import("@/components/bodies/NurseryBody").then((m) => ({ default: m.NurseryBody })));
body("fetch", () => import("@/components/bodies/ToyBasketBody").then((m) => ({ default: m.ToyBasketBody })));
body("board-game", () => import("@/components/bodies/GameBoardBody").then((m) => ({ default: m.GameBoardBody })));
body("arcade", () => import("@/components/bodies/CabinetBody").then((m) => ({ default: m.CabinetBody })));
body("winter-window", () => import("@/components/bodies/FrostBody").then((m) => ({ default: m.FrostBody })));
body("care-package", () => import("@/components/bodies/UnpackBody").then((m) => ({ default: m.UnpackBody })));
body("parol", () => import("@/components/bodies/LanternsBody").then((m) => ({ default: m.LanternsBody })));
body("debut", () => import("@/components/bodies/DanceCardBody").then((m) => ({ default: m.DanceCardBody })));

/** The style's own body for this gift, or null to use its stored layout. */
export function ownBodyFor(style: string | null | undefined): Lazy | null {
  if (!isStyleId(style) || !isFlagOn("styleBodies")) return null;
  return BODIES[style] ?? null;
}

/** Styles that have their own body built (for tests and the dev page). */
export function stylesWithOwnBody(): StyleId[] {
  return Object.keys(BODIES) as StyleId[];
}
