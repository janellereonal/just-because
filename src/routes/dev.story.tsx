import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { NOINDEX } from "@/lib/seo";
import type { ThemeKind } from "@/lib/themeKind";
import { FriendsArrive } from "@/components/story/FriendsArrive";

/**
 * Dev only: "Friends arrive" on its own.
 * /dev/story?n=5&name=Mia            five friends, interactive
 * /dev/story?n=9&kind=christmas      more friends than fit, Christmas scarves
 * /dev/story?auto=1                  plays itself
 */
const NAMES = ["Jo", "Maria Clara", "Ben", "Aiko", "Sam", "Lola Nena", "Rafa", "Dee", "Kit", "Pia", "Tom"];

export const Route = createFileRoute("/dev/story")({
  head: () => ({ meta: [NOINDEX] }),
  validateSearch: (s: Record<string, unknown>) => ({
    n: typeof s["n"] === "number" ? s["n"] : typeof s["n"] === "string" ? Number(s["n"]) : 5,
    name: typeof s["name"] === "string" ? s["name"] : "Mia",
    kind: (typeof s["kind"] === "string" ? s["kind"] : "birthday") as ThemeKind,
    auto: s["auto"] === true || s["auto"] === 1 || s["auto"] === "1",
  }),
  component: DevStory,
});

function DevStory() {
  const { n, name, kind, auto } = Route.useSearch();
  const [run, setRun] = useState(0);
  const [done, setDone] = useState(false);
  if (!import.meta.env.DEV) return null;
  if (done)
    return (
      <div className="grid min-h-screen place-items-center bg-paper">
        <button type="button" className="rounded-full bg-ink px-5 py-3 text-cream" onClick={() => (setDone(false), setRun(run + 1))}>
          Play again
        </button>
      </div>
    );
  return (
    <FriendsArrive
      key={run}
      names={NAMES.slice(0, n)}
      recipient={name}
      palette={{ background: "#FBF8F2", primary: "#E58FA5", accent: "#B5623E" }}
      kind={kind}
      birthday={kind === "birthday"}
      autoplay={auto}
      onDone={() => setDone(true)}
    />
  );
}
