import { createFileRoute } from "@tanstack/react-router";
import { Character } from "@/themes/_shared/cast/Character";
import { CHARACTERS } from "@/themes/_shared/cast/library";
import { ICON_SETS } from "@/themes/_shared/iconSets";
import { IconGlyph } from "@/themes/_shared/Sprinkles";

/** Dev only: every character and icon set on one page, for checking the art. */
export const Route = createFileRoute("/dev/cast")({
  component: () =>
    import.meta.env.DEV ? (
      <div className="min-h-screen bg-[#F4EEE3] p-6">
        <div className="grid grid-cols-4 gap-6">
          {CHARACTERS.map((c) => (
            <div key={c.id} className="grid place-items-center rounded-3xl bg-white p-4">
              <Character setting={{ type: "library", id: c.id }} size={220} live={false} follow={false} showName={false} />
              <p className="mt-2 text-sm">{c.name}</p>
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
    ) : null,
});
