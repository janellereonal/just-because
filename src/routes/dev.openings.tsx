import { createFileRoute } from "@tanstack/react-router";
import { NOINDEX } from "@/lib/seo";
import { useEffect, useState } from "react";
import type { ThemeKind } from "@/lib/themeKind";
import { TactileOpening } from "@/themes/TactileOpening";
import { presetById } from "@/themes/_shared/cast/person";
import type { CharacterSetting } from "@/themes/_shared/cast/types";

/**
 * Dev only: one theme's opening, full screen, for checking light and depth.
 * /dev/openings?kind=valentine            the resting state, interactive
 * /dev/openings?kind=valentine&auto=1     plays the gesture by itself
 * /dev/openings?kind=valentine&beat=2     frozen on a beat (needs auto=1)
 * /dev/openings?kind=valentine&auto=1&stay=1  plays it all, then holds the last moment
 * /dev/openings?kind=birthday&char=fox     with a library character (or char=person:bookworm)
 * /dev/openings?style=mixtape              a layout style's own opening (scrapbook, mixtape, zine...)
 * /dev/openings?style=mixtape&pal=berry    in another gift palette (cream, berry, night, sage)
 */
export const Route = createFileRoute("/dev/openings")({
  head: () => ({ meta: [NOINDEX] }),
  validateSearch: (s: Record<string, unknown>) => ({
    kind: (typeof s["kind"] === "string" ? s["kind"] : "valentine") as ThemeKind,
    age: typeof s["age"] === "number" ? s["age"] : undefined,
    auto: s["auto"] === true || s["auto"] === 1 || s["auto"] === "1" || s["auto"] === "true",
    beat:
      typeof s["beat"] === "number"
        ? s["beat"]
        : typeof s["beat"] === "string"
          ? Number(s["beat"])
          : undefined,
    name: typeof s["name"] === "string" ? s["name"] : "Ana",
    stay: s["stay"] === true || s["stay"] === 1 || s["stay"] === "1",
    char: typeof s["char"] === "string" ? s["char"] : undefined,
    style: typeof s["style"] === "string" ? s["style"] : undefined,
    pal: typeof s["pal"] === "string" ? s["pal"] : "cream",
  }),
  component: DevOpenings,
});

const PALETTES: Record<string, { background: string; primary: string; accent: string }> = {
  cream: { background: "#FBF8F2", primary: "#B5623E", accent: "#E9C9B6" },
  berry: { background: "#FFF4F6", primary: "#7A5CFF", accent: "#C2366B" },
  night: { background: "#151A2E", primary: "#3B4A8C", accent: "#F2C14E" },
  sage: { background: "#F3F6EF", primary: "#5E7D5A", accent: "#D9895B" },
};

function DevOpenings() {
  const search = Route.useSearch();
  const { kind, auto, beat, name, stay, char, style, pal } = search;
  const preset = char?.startsWith("person:") ? presetById(char.slice(7)) : undefined;
  const character: CharacterSetting | null = preset
    ? { type: "person", person: preset.person, preset: preset.id, accessory: true }
    : char
      ? { type: "library", id: char, accessory: true }
      : null;
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const w = window as unknown as { __jbBeat?: number; __jbStay?: boolean };
    if (typeof beat === "number" && !Number.isNaN(beat)) w.__jbBeat = beat;
    else delete w.__jbBeat;
    w.__jbStay = stay;
    setReady(true);
    return () => {
      delete w.__jbBeat;
      delete w.__jbStay;
    };
  }, [beat, stay]);
  if (!import.meta.env.DEV || !ready) return null;
  return (
    <div className="fixed inset-0">
      <TactileOpening
        key={`${kind}-${style ?? ""}-${pal}`}
        kind={style ? "default" : kind}
        style={style}
        palette={PALETTES[pal] ?? PALETTES["cream"]!}
        recipientName={name}
        contributors={["Mia", "Leo", "Priya", "Tom", "Sofia"]}
        age={search.age ?? null}
        autoplay={auto}
        character={character}
        onOpen={() => {}}
      />
    </div>
  );
}
