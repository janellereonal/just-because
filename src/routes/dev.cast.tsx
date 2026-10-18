import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { NOINDEX } from "@/lib/seo";
import { Character } from "@/themes/_shared/cast/Character";
import { CHARACTERS } from "@/themes/_shared/cast/library";
import { ICON_SETS } from "@/themes/_shared/iconSets";
import { IconGlyph } from "@/themes/_shared/Sprinkles";

/** Changes a color by one step, so a character shows its drawn version. */
const nudge = (hex: string) => `#${((parseInt(hex.slice(1), 16) ^ 1) >>> 0).toString(16).padStart(6, "0")}`;

/** Dev only: every character and icon set on one page, for checking the art. */
export const Route = createFileRoute("/dev/cast")({
  head: () => ({ meta: [NOINDEX] }),
  component: () => {
    // ?size=64 shows everything at phone size.
    const [size, setSize] = useState(220);
    useEffect(() => setSize(Number(new URLSearchParams(window.location.search).get("size")) || 220), []);
    return import.meta.env.DEV ? (
      <div className="min-h-screen bg-[#F4EEE3] p-6">
        <div className="grid grid-cols-4 gap-6">
          {CHARACTERS.map((c) => (
            <div key={c.id} className="grid place-items-center rounded-3xl bg-white p-4">
              <Character setting={{ type: "library", id: c.id }} size={size} live={false} follow={false} showName={false} />
              <p className="mt-2 text-sm">{c.name}</p>
            </div>
          ))}
        </div>
        {/* The drawn (SVG) versions, shown when someone picks their own colors. A tiny color
            change forces the drawn body instead of the clay still. */}
        <h2 className="mt-10 mb-4 text-lg">Drawn versions (custom colors)</h2>
        <div className="grid grid-cols-4 gap-6">
          {CHARACTERS.filter((c) => c.body).map((c) => (
            <div key={c.id} className="grid place-items-center rounded-3xl bg-white p-4">
              <Character setting={{ type: "library", id: c.id, colors: { primary: nudge(c.colors.primary) } }} size={size} live={false} follow={false} showName={false} />
              <p className="mt-2 text-sm">{c.name} (drawn)</p>
            </div>
          ))}
        </div>
        <div className="mt-8 grid grid-cols-4 gap-6">
          {ICON_SETS.map((s) => (
            <div key={s.id} className="flex flex-wrap items-center gap-4 rounded-3xl bg-white p-4">
              {s.items.map((it, i) => (
                <IconGlyph key={i} item={it} color={s.colors[i % Math.max(1, s.colors.length)] ?? "#B5623E"} size={56} />
              ))}
              <p className="w-full text-sm">{s.name}</p>
            </div>
          ))}
        </div>
      </div>
    ) : null;
  },
});
