import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { CHARACTERS } from "@/themes/_shared/cast/library";
import { PEOPLE } from "@/themes/_shared/cast/person";

/**
 * Dev only: renders every clay figure with three.js. tools/screens/clay.js
 * calls window.__clay(id, px) to save the stills into public/clay/.
 */
export const Route = createFileRoute("/dev/clay")({ component: DevClay });

function DevClay() {
  const [shots, setShots] = useState<{ id: string; url: string }[]>([]);
  useEffect(() => {
    if (!import.meta.env.DEV) return;
    let alive = true;
    void import("@/lib/clay/scene").then(({ CLAY, renderClay, renderPerson }) => {
      const w = window as unknown as { __clay?: (id: string, px?: number) => string; __clayIds?: string[]; __person?: (id: string, px?: number) => string; __peopleIds?: string[] };
      w.__clay = (id, px) => renderClay(id, CHARACTERS.find((c) => c.id === id)!.colors, px);
      w.__person = (id, px) => renderPerson(PEOPLE.find((p) => p.id === id)!.person, px);
      w.__peopleIds = PEOPLE.map((p) => p.id);
      w.__clayIds = Object.keys(CLAY);
      if (!alive) return;
      setShots(Object.keys(CLAY).map((id) => ({ id, url: w.__clay!(id, 320) })));
    });
    return () => {
      alive = false;
    };
  }, []);
  if (!import.meta.env.DEV) return null;
  return (
    <div className="grid min-h-screen grid-cols-5 gap-4 bg-[#F4F2EE] p-6">
      {shots.map((s) => (
        <figure key={s.id} className="grid place-items-center">
          <img src={s.url} alt={s.id} width={220} height={220} />
          <figcaption className="text-xs">{s.id}</figcaption>
        </figure>
      ))}
    </div>
  );
}
