/**
 * "Make a person": build a little clay person part by part. Every option shows
 * as a real thumbnail of *this* person wearing it (rendered in the browser,
 * one at a time). Changes show in the phone preview at once; a few seconds
 * after the last change the finished still is baked and uploaded, so the gift
 * page never needs 3D to show them.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "motion/react";
import { ChevronLeft, Shuffle } from "lucide-react";
import { uploadFile } from "@/lib/upload";
import { CAST_COPY } from "@/copy/strings";
import { Character } from "@/themes/_shared/cast/Character";
import {
  DEFAULT_PERSON,
  HAIR_COLORS,
  OUTFIT_COLORS,
  PEOPLE,
  PERSON_PARTS,
  SKIN_TONES,
  personKey,
  presetById,
  type PersonConfig,
} from "@/themes/_shared/cast/person";
import type { AccessoryId, CharacterSetting } from "@/themes/_shared/cast/types";

type PersonSetting = Extract<CharacterSetting, { type: "person" }>;
type PartKey = (typeof PERSON_PARTS)[number]["key"] | "skin";

/** Parts shown zoomed in on the head. */
const HEAD_PARTS = new Set<PartKey>(["hair", "facial", "eyewear", "headwear", "expression"]);

const TABS: { key: PartKey; label: string }[] = [
  { key: "age", label: "Age" },
  { key: "skin", label: "Skin" },
  { key: "expression", label: "Face" },
  { key: "hair", label: "Hair" },
  { key: "facial", label: "Facial hair" },
  { key: "eyewear", label: "Glasses" },
  { key: "headwear", label: "Hat" },
  { key: "outfit", label: "Outfit" },
  { key: "held", label: "Holding" },
];

export function randomPerson(): PersonConfig {
  const any = <T,>(list: readonly T[]) => list[Math.floor(Math.random() * list.length)]!;
  const part = (k: (typeof PERSON_PARTS)[number]["key"]) => any(PERSON_PARTS.find((p) => p.key === k)!.options as readonly { id: string }[]).id;
  const facial = Math.random() < 0.3 ? part("facial") : "none";
  return {
    age: part("age") as PersonConfig["age"],
    skin: Math.floor(Math.random() * SKIN_TONES.length),
    expression: part("expression") as PersonConfig["expression"],
    hair: part("hair") as PersonConfig["hair"],
    hairColor: any(HAIR_COLORS.slice(0, 8)).id,
    facial: facial as PersonConfig["facial"],
    eyewear: (Math.random() < 0.35 ? part("eyewear") : "none") as PersonConfig["eyewear"],
    headwear: (Math.random() < 0.3 ? part("headwear") : "none") as PersonConfig["headwear"],
    outfit: part("outfit") as PersonConfig["outfit"],
    outfitColor: any(OUTFIT_COLORS).id,
    held: part("held") as PersonConfig["held"],
  };
}

export function PersonBuilder({
  siteId,
  value,
  accessory,
  onChange,
  onBack,
}: {
  siteId: string;
  value: PersonSetting;
  accessory: AccessoryId | null;
  onChange: (next: PersonSetting) => void;
  onBack: () => void;
}) {
  const [tab, setTab] = useState<PartKey>("hair");
  const person = value.person;
  const key = personKey(person);
  const fromPreset = value.preset ? presetById(value.preset) : undefined;
  const isPreset = !!fromPreset && personKey(fromPreset.person) === key;

  const set = (patch: Partial<PersonConfig>) => {
    const next = { ...person, ...patch };
    const { image_url: _old, ...rest } = value;
    onChange({ ...rest, person: next });
  };

  // Bake and upload the still a little after the last change.
  const latest = useRef(value);
  latest.current = value;
  useEffect(() => {
    if (value.image_url || isPreset) return;
    const t = window.setTimeout(async () => {
      try {
        const { personFile } = await import("@/lib/clay/scene");
        const blob = await personFile(person, 512);
        const ext = blob.type === "image/webp" ? "webp" : "png";
        const url = await uploadFile(new File([blob], `person-${key}.${ext}`, { type: blob.type }), "intro", siteId);
        // Only keep it if they haven't changed anything since.
        if (personKey(latest.current.person) === key && !latest.current.image_url) onChange({ ...latest.current, image_url: url });
      } catch {
        /* The browser render still shows; we try again on the next change. */
      }
    }, 2500);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, value.image_url, isPreset, siteId]);

  const options = useMemo(() => {
    if (tab === "skin") return null;
    return PERSON_PARTS.find((p) => p.key === tab)!.options as readonly { id: string; label: string }[];
  }, [tab]);

  return (
    <div>
      <div className="flex items-center justify-between gap-2">
        <button type="button" onClick={onBack} className="inline-flex items-center gap-1 text-xs font-medium text-muted hover:text-ink">
          <ChevronLeft className="size-3.5" aria-hidden="true" /> {CAST_COPY.allCharacters}
        </button>
        <button
          type="button"
          onClick={() => onChange({ type: "person", person: randomPerson(), accessory: value.accessory ?? true, ...(value.name_tag ? { name_tag: value.name_tag } : {}) })}
          className="inline-flex items-center gap-1.5 rounded-full border border-line bg-cream px-3 py-1.5 text-xs font-medium hover:bg-glass/80"
        >
          <Shuffle className="size-3.5" aria-hidden="true" /> {CAST_COPY.surprise}
        </button>
      </div>

      <div className="mt-3 grid place-items-center rounded-3xl border border-line bg-[radial-gradient(circle_at_50%_35%,#fff,#F4EEE3)] py-3">
        <Character setting={value} accessory={accessory} size={150} live follow showName={false} />
      </div>

      <p className="mt-4 font-mono text-[10px] tracking-[0.18em] text-muted uppercase">{CAST_COPY.startFrom}</p>
      <div className="-mx-1 mt-2 flex gap-2 overflow-x-auto px-1 pb-1 [scrollbar-width:none]">
        {PEOPLE.map((p) => {
          const on = value.preset === p.id && isPreset;
          return (
            <button
              key={p.id}
              type="button"
              onClick={() => onChange({ type: "person", person: p.person, preset: p.id, accessory: value.accessory ?? true, ...(value.name_tag ? { name_tag: value.name_tag } : {}) })}
              aria-pressed={on}
              title={p.name}
              className={`grid shrink-0 place-items-center rounded-2xl border p-1 ${on ? "border-accent bg-accent/8" : "border-line bg-cream hover:bg-glass/80"}`}
            >
              <img src={`/clay/people/${p.id}@256.webp`} alt="" loading="lazy" width={52} height={52} className="size-[52px]" />
              <span className="max-w-[60px] truncate text-[10px]">{p.name}</span>
            </button>
          );
        })}
      </div>

      <div role="tablist" aria-label={CAST_COPY.makePerson} className="-mx-1 mt-4 flex gap-1.5 overflow-x-auto px-1 pb-1 [scrollbar-width:none]">
        {TABS.map((t) => (
          <button
            key={t.key}
            role="tab"
            type="button"
            aria-selected={tab === t.key}
            onClick={() => setTab(t.key)}
            className={`shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${tab === t.key ? "border-ink bg-ink text-paper" : "border-line bg-cream hover:bg-glass/80"}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="mt-3">
        {tab === "skin" ? (
          <Swatches label={CAST_COPY.skin} colors={SKIN_TONES.map((hex, i) => ({ id: String(i), hex, label: `${CAST_COPY.skin} ${i + 1}` }))} value={String(person.skin)} onPick={(id) => set({ skin: Number(id) })} />
        ) : (
          <>
            {tab === "hair" ? <Swatches label={CAST_COPY.hairColor} colors={HAIR_COLORS} value={person.hairColor} onPick={(id) => set({ hairColor: id as PersonConfig["hairColor"] })} /> : null}
            {tab === "outfit" ? <Swatches label={CAST_COPY.outfitColor} colors={OUTFIT_COLORS} value={person.outfitColor} onPick={(id) => set({ outfitColor: id as PersonConfig["outfitColor"] })} /> : null}
            <div className="mt-2 grid grid-cols-4 gap-1.5">
              {options!.map((o) => {
                const variant = { ...person, [tab]: o.id } as PersonConfig;
                const on = (person as Record<string, unknown>)[tab] === o.id;
                return (
                  <motion.button
                    key={o.id}
                    type="button"
                    whileTap={{ scale: 0.94 }}
                    onClick={() => set({ [tab]: o.id } as Partial<PersonConfig>)}
                    aria-pressed={on}
                    className={`grid place-items-center overflow-hidden rounded-2xl border px-0.5 pt-1 pb-1.5 transition-colors ${on ? "border-accent bg-accent/8" : "border-line bg-cream hover:bg-glass/80"}`}
                  >
                    <span className="relative block size-14 overflow-hidden">
                      <span className="absolute inset-0 block" style={HEAD_PARTS.has(tab) ? { transform: "scale(1.7)", transformOrigin: "50% 22%" } : undefined}>
                        <Character setting={{ type: "person", person: variant }} size={56} live={false} follow={false} showName={false} />
                      </span>
                    </span>
                    <span className="w-full truncate px-0.5 text-center text-[10.5px] leading-tight">{o.label}</span>
                  </motion.button>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function Swatches({ label, colors, value, onPick }: { label: string; colors: readonly { id: string; hex: string; label: string }[]; value: string; onPick: (id: string) => void }) {
  return (
    <div>
      <p className="text-xs text-muted">{label}</p>
      <div className="mt-1.5 flex flex-wrap gap-1.5">
        {colors.map((c) => (
          <button
            key={c.id}
            type="button"
            aria-label={c.label}
            title={c.label}
            aria-pressed={value === c.id}
            onClick={() => onPick(c.id)}
            className="size-7 rounded-full"
            style={{ background: c.hex, boxShadow: value === c.id ? "0 0 0 2px #FBF8F2, 0 0 0 4px #2B2522" : "inset 0 0 0 1px rgba(0,0,0,.12)" }}
          />
        ))}
      </div>
    </div>
  );
}

export const NEW_PERSON: PersonSetting = { type: "person", person: DEFAULT_PERSON, accessory: true };
