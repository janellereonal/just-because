/**
 * Who opens the gift: a short list made for this gift (Bo, three people,
 * three animals and three friends that suit the theme), then "See all" with
 * category tabs and search, "Surprise me", and "Make a person". Tiles mount
 * their still only when they scroll into view.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "motion/react";
import { ChevronLeft, Search, Shuffle, UserRoundPlus } from "lucide-react";
import type { ThemeKind } from "@/lib/themeKind";
import { CAST_COPY } from "@/copy/strings";
import { NEW_PERSON, PersonBuilder, randomPerson } from "@/components/PersonBuilder";
import { Character } from "@/themes/_shared/cast/Character";
import { CHARACTERS } from "@/themes/_shared/cast/library";
import { PEOPLE, personFromLegacy } from "@/themes/_shared/cast/person";
import type { AccessoryId, CharacterSetting } from "@/themes/_shared/cast/types";

type View = "quick" | "all" | "build";
type Cat = "suggested" | "people" | "animals" | "friends";

/** One tile in the picker: a library character or a ready-made person. */
type Item = { key: string; name: string; tags: string[]; cat: "mascot" | "people" | "animals" | "friends"; setting: CharacterSetting };

const LIBRARY: Item[] = CHARACTERS.filter((c) => c.id !== "person").map((c) => ({
  key: `lib:${c.id}`,
  name: c.name,
  tags: c.tags ?? [],
  cat: c.category === "Mascot" ? "mascot" : c.category === "Animals" ? "animals" : "friends",
  setting: { type: "library", id: c.id },
}));
const PRESETS: Item[] = PEOPLE.map((p) => ({ key: `person:${p.id}`, name: p.name, tags: [...p.tags], cat: "people", setting: { type: "person", person: p.person, preset: p.id } }));
const EVERYONE = [...LIBRARY, ...PRESETS];

const FALLBACK = { people: ["bookworm", "explorer", "barista"], animals: ["dog", "cat", "bunny"], friends: ["star", "heart", "cake"] };

/** Bo, then three people, three animals and three friends that suit this theme. */
export function suggestedFor(kind: ThemeKind): Item[] {
  const tagged = (cat: Item["cat"]) => EVERYONE.filter((i) => i.cat === cat && i.tags.includes(kind));
  const fill = (cat: "people" | "animals" | "friends") => {
    const list = tagged(cat).slice(0, 3);
    for (const id of FALLBACK[cat]) {
      if (list.length >= 3) break;
      const it = EVERYONE.find((i) => i.cat === cat && (i.key === `lib:${id}` || i.key === `person:${id}`));
      if (it && !list.includes(it)) list.push(it);
    }
    return list;
  };
  return [LIBRARY.find((i) => i.key === "lib:mascot")!, ...fill("people"), ...fill("animals"), ...fill("friends")];
}

function keyOf(c: CharacterSetting): string {
  if (c.type === "library") return `lib:${c.id}`;
  if (c.type === "person") return c.preset ? `person:${c.preset}` : "person:custom";
  return c.type;
}

export function CharacterPicker({
  siteId,
  kind,
  char,
  accessory,
  onSet,
  start = "quick",
}: {
  siteId: string;
  kind: ThemeKind;
  /** The character showing now (the theme's own when none was picked). */
  char: CharacterSetting;
  accessory: AccessoryId | null;
  onSet: (c: CharacterSetting) => void;
  start?: Exclude<View, "build">;
}) {
  const [view, setView] = useState<View>(start);
  const [cat, setCat] = useState<Cat>("suggested");
  const [q, setQ] = useState("");
  const wearing = char.accessory !== false;
  const keep = (c: CharacterSetting): CharacterSetting => ({ ...c, accessory: wearing, ...(char.name_tag ? { name_tag: char.name_tag } : {}) }) as CharacterSetting;
  const pick = (c: CharacterSetting) => onSet(keep(c));
  const current = keyOf(char);
  const suggested = useMemo(() => suggestedFor(kind), [kind]);

  function surprise() {
    if (Math.random() < 0.25) return pick({ type: "person", person: randomPerson() });
    const pool = EVERYONE.filter((i) => i.key !== current);
    pick(pool[Math.floor(Math.random() * pool.length)]!.setting);
  }

  function openBuilder() {
    if (char.type !== "person") {
      const legacy = char.type === "library" && char.id === "person";
      onSet(keep({ ...NEW_PERSON, person: legacy ? personFromLegacy(char.colors) : NEW_PERSON.person }));
    }
    setView("build");
  }

  if (view === "build" && char.type === "person") {
    return <PersonBuilder siteId={siteId} value={char} accessory={accessory} onChange={(c) => onSet(c)} onBack={() => setView(start === "quick" ? "quick" : "all")} />;
  }

  const actions = (
    <div className="mt-2 flex flex-wrap gap-1.5">
      <ActionChip onClick={surprise} icon={<Shuffle className="size-3.5" aria-hidden="true" />} label={CAST_COPY.surprise} />
      <ActionChip onClick={openBuilder} icon={<UserRoundPlus className="size-3.5" aria-hidden="true" />} label={char.type === "person" ? CAST_COPY.editPerson : CAST_COPY.makePerson} />
    </div>
  );

  if (view === "quick") {
    // The picked one stays visible even when it isn't one of the suggestions.
    const list = [...suggested];
    if (char.type !== "none" && !list.some((i) => i.key === current)) {
      list[list.length - 1] = { key: current, name: char.type === "person" ? CAST_COPY.yours : "", tags: [], cat: "people", setting: char };
    }
    return (
      <div>
        <div className="grid grid-cols-4 gap-1.5 sm:grid-cols-4">
          {list.map((it) => (
            <Tile key={it.key} item={it} on={it.key === current} accessory={accessory} wearing={wearing} size={50} onPick={() => pick(it.setting)} />
          ))}
          <NoOne on={char.type === "none"} onPick={() => onSet({ type: "none" })} />
          <button
            type="button"
            onClick={() => setView("all")}
            className="grid place-items-center rounded-2xl border border-dashed border-ink/25 px-0.5 pt-1 pb-1.5 text-ink/70 hover:bg-glass/80"
          >
            <span className="grid size-[50px] place-items-center font-mono text-[11px]">+{EVERYONE.length - list.length}</span>
            <span className="text-[11px] text-ink">{CAST_COPY.seeAll}</span>
          </button>
        </div>
        {actions}
      </div>
    );
  }

  const needle = q.trim().toLowerCase();
  const shown = needle
    ? EVERYONE.filter((i) => i.name.toLowerCase().includes(needle) || i.tags.some((t) => t.includes(needle)))
    : cat === "suggested"
      ? suggested
      : EVERYONE.filter((i) => i.cat === cat || (cat === "friends" && i.cat === "mascot"));

  return (
    <div>
      {start === "quick" ? (
        <button type="button" onClick={() => setView("quick")} className="mb-2 inline-flex items-center gap-1 text-xs font-medium text-muted hover:text-ink">
          <ChevronLeft className="size-3.5" aria-hidden="true" /> {CAST_COPY.back}
        </button>
      ) : null}
      <label className="flex items-center gap-2 rounded-full border border-line bg-cream px-3 py-2 focus-within:border-accent">
        <Search className="size-4 shrink-0 text-muted" aria-hidden="true" />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={CAST_COPY.searchPlaceholder} aria-label={CAST_COPY.searchLabel} className="w-full bg-transparent text-sm outline-none" />
      </label>
      {!needle ? (
        <div role="tablist" aria-label={CAST_COPY.allCharacters} className="-mx-1 mt-2.5 flex gap-1.5 overflow-x-auto px-1 pb-1 [scrollbar-width:none]">
          {(
            [
              ["suggested", CAST_COPY.forThisGift],
              ["people", CAST_COPY.people],
              ["animals", CAST_COPY.animals],
              ["friends", CAST_COPY.friends],
            ] as const
          ).map(([k, label]) => (
            <button
              key={k}
              role="tab"
              type="button"
              aria-selected={cat === k}
              onClick={() => setCat(k)}
              className={`shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${cat === k ? "border-ink bg-ink text-paper" : "border-line bg-cream hover:bg-glass/80"}`}
            >
              {label}
            </button>
          ))}
        </div>
      ) : null}
      {actions}
      <div className="mt-3 grid grid-cols-4 gap-2">
        {cat === "people" && !needle ? (
          <button
            type="button"
            onClick={openBuilder}
            className="grid place-items-center rounded-2xl border border-dashed border-ink/25 p-1 text-ink/70 hover:bg-glass/80"
          >
            <span className="grid size-[58px] place-items-center">
              <UserRoundPlus className="size-6" aria-hidden="true" />
            </span>
            <span className="w-full truncate text-center text-[11px] text-ink">{CAST_COPY.makeShort}</span>
          </button>
        ) : null}
        {shown.map((it) => (
          <Tile key={it.key} item={it} on={it.key === current} accessory={accessory} wearing={wearing} size={58} lazy onPick={() => pick(it.setting)} />
        ))}
        {(cat === "suggested" || needle) && !shown.length ? <p className="col-span-4 py-6 text-center text-sm text-muted">{CAST_COPY.noMatch}</p> : null}
        {cat === "suggested" && !needle ? <NoOne on={char.type === "none"} onPick={() => onSet({ type: "none" })} size={58} /> : null}
      </div>
    </div>
  );
}

function Tile({ item, on, accessory, wearing, size, lazy = false, onPick }: { item: Item; on: boolean; accessory: AccessoryId | null; wearing: boolean; size: number; lazy?: boolean; onPick: () => void }) {
  const ref = useRef<HTMLButtonElement | null>(null);
  const [seen, setSeen] = useState(!lazy);
  useEffect(() => {
    if (seen || !ref.current) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setSeen(true);
          io.disconnect();
        }
      },
      { rootMargin: "120px" },
    );
    io.observe(ref.current);
    return () => io.disconnect();
  }, [seen]);
  return (
    <motion.button
      ref={ref}
      type="button"
      whileTap={{ scale: 0.92 }}
      onClick={onPick}
      aria-pressed={on}
      title={item.name}
      className={`grid place-items-center rounded-2xl border px-0.5 pt-1 pb-1.5 transition-colors ${on ? "border-accent bg-accent/8" : "border-line bg-cream hover:bg-glass/80"}`}
    >
      <span className="block" style={{ width: size, height: size }}>
        {seen ? <Character setting={{ ...item.setting, accessory: wearing } as CharacterSetting} accessory={accessory} size={size} live={false} follow={false} showName={false} /> : null}
      </span>
      <span className="w-full truncate px-0.5 text-center text-[11px]">{item.name}</span>
    </motion.button>
  );
}

function NoOne({ on, onPick, size = 50 }: { on: boolean; onPick: () => void; size?: number }) {
  return (
    <button
      type="button"
      onClick={onPick}
      aria-pressed={on}
      title={CAST_COPY.noOne}
      className={`grid place-items-center rounded-2xl border px-0.5 pt-1 pb-1.5 text-ink/50 transition-colors ${on ? "border-accent bg-accent/8" : "border-line bg-cream hover:bg-glass/80"}`}
    >
      <span className="grid place-items-center text-lg" style={{ width: size, height: size }}>
        ∅
      </span>
      <span className="text-[11px] text-ink">{CAST_COPY.noOne}</span>
    </button>
  );
}

function ActionChip({ onClick, icon, label }: { onClick: () => void; icon: React.ReactNode; label: string }) {
  return (
    <button type="button" onClick={onClick} className="inline-flex items-center gap-1.5 rounded-full border border-line bg-cream px-3 py-1.5 text-xs font-medium hover:bg-glass/80">
      {icon} {label}
    </button>
  );
}
