import { createFileRoute } from "@tanstack/react-router";
import { Character } from "@/themes/_shared/cast/Character";
import { DEFAULT_PERSON, HAIRS, PEOPLE, SKIN_TONES, type PersonConfig } from "@/themes/_shared/cast/person";

/**
 * Dev only.
 *  /dev/people           the 40 ready-made people with their live faces.
 *  /dev/people?grid=hair every hair style with every skin tone (rows: hair, columns: skin),
 *                        for checking that hair never covers the eyes and skin parts match.
 *  &age=kid|teen|adult|senior and &hairColor=<id> change the grid's person.
 */
export const Route = createFileRoute("/dev/people")({
  validateSearch: (s: Record<string, unknown>) => ({
    grid: typeof s["grid"] === "string" ? s["grid"] : undefined,
    age: typeof s["age"] === "string" ? s["age"] : undefined,
    hairColor: typeof s["hairColor"] === "string" ? s["hairColor"] : undefined,
    only: typeof s["only"] === "string" ? s["only"] : undefined,
    size: typeof s["size"] === "string" || typeof s["size"] === "number" ? Number(s["size"]) : undefined,
    skins: typeof s["skins"] === "string" ? s["skins"] : undefined,
  }),
  component: DevPeople,
});

function DevPeople() {
  const { grid, age, hairColor, only, size: sizeParam, skins: skinsParam } = Route.useSearch();
  const size = sizeParam && sizeParam > 40 ? sizeParam : 88;
  const hairs = only ? HAIRS.filter((h) => only.split(",").includes(h.id)) : HAIRS;
  const skins = skinsParam ? skinsParam.split(",").map(Number).filter((n) => n >= 0 && n < SKIN_TONES.length) : SKIN_TONES.map((_, i) => i);
  if (!import.meta.env.DEV) return null;
  if (grid === "hair") {
    const base: PersonConfig = {
      ...DEFAULT_PERSON,
      ...(age ? { age: age as PersonConfig["age"] } : {}),
      ...(hairColor ? { hairColor: hairColor as PersonConfig["hairColor"] } : {}),
      headwear: "none",
      eyewear: "none",
      facial: "none",
    };
    return (
      <div className="min-h-screen bg-[#F4EEE3] p-4">
        <div className="grid gap-1" style={{ gridTemplateColumns: `90px repeat(${skins.length}, ${size + 4}px)` }}>
          <span />
          {skins.map((i) => (
            <span key={i} className="flex items-center justify-center gap-1 font-mono text-[10px]">
              <span className="size-3 rounded-full" style={{ background: SKIN_TONES[i] }} />
              {i}
            </span>
          ))}
          {hairs.map((h) => (
            <Row key={h.id} label={h.label}>
              {skins.map((skin) => (
                <div key={skin} data-cell className="grid place-items-center rounded-xl bg-white">
                  <Character setting={{ type: "person", person: { ...base, hair: h.id, skin } }} size={size} live={false} follow={false} showName={false} />
                </div>
              ))}
            </Row>
          ))}
        </div>
      </div>
    );
  }
  return (
    <div className="grid min-h-screen grid-cols-5 gap-4 bg-[#F4EEE3] p-6">
      {PEOPLE.map((p) => (
        <div key={p.id} className="grid place-items-center rounded-3xl bg-white p-3">
          <Character setting={{ type: "person", person: p.person, preset: p.id }} size={200} live={false} follow={false} showName={false} />
          <p className="mt-1 text-sm">{p.name}</p>
        </div>
      ))}
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <>
      <span className="flex items-center font-mono text-[11px]">{label}</span>
      {children}
    </>
  );
}
