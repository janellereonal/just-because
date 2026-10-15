/**
 * "Cast your gift": pick who appears in the opening, dress them, upload your
 * own (a pet, a face, a drawing) and choose the sprinkles that fall
 * everywhere. Changes show in the phone preview right away.
 */
import { useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Shuffle, Upload, X } from "lucide-react";
import { toast } from "sonner";
import type { ThemeKind } from "@/lib/themeKind";
import { uploadFile } from "@/lib/upload";
import { Character } from "@/themes/_shared/cast/Character";
import { ACCESSORIES, CHARACTERS, characterById } from "@/themes/_shared/cast/library";
import type { CharacterSetting } from "@/themes/_shared/cast/types";
import { castFor, designFor } from "@/themes/_shared/design";
import { ICON_SETS, MAX_CUSTOM_ICONS, resolveIconSet, type IconSetSetting, type Physics } from "@/themes/_shared/iconSets";
import { IconGlyph } from "@/themes/_shared/Sprinkles";
import { SPRING } from "@/themes/_shared/stage";

type Tab = "characters" | "customize" | "upload" | "sprinkles";
const TABS: { key: Tab; label: string }[] = [
  { key: "characters", label: "Characters" },
  { key: "customize", label: "Customize" },
  { key: "upload", label: "Upload" },
  { key: "sprinkles", label: "Sprinkles" },
];

const SWATCHES = ["#FBF3EA", "#F07C9B", "#E8577E", "#F2652E", "#FFD166", "#7ED7C1", "#8EC0E8", "#7A5CFF", "#3A2A22", "#C9A57A", "#FFFFFF", "#2B2522"];
const PHYSICS: { key: Physics; label: string }[] = [
  { key: "float", label: "Float" },
  { key: "fall", label: "Fall" },
  { key: "drift", label: "Drift" },
  { key: "burst", label: "Burst" },
];

export type Cast = { character: CharacterSetting | null; icon_set: IconSetSetting | null };

export function CastPanel({
  siteId,
  kind,
  recipient,
  value,
  onChange,
}: {
  siteId: string;
  kind: ThemeKind;
  recipient: string;
  value: Cast;
  onChange: (next: Cast) => void;
}) {
  const [tab, setTab] = useState<Tab>("characters");
  const design = designFor(kind);
  const cast = castFor(kind, value.character, value.icon_set);
  const char = cast.character;
  const accessory = design.accessory;
  const wearing = char.accessory !== false;
  const setChar = (character: CharacterSetting | null) => {
    remember(character);
    onChange({ ...value, character });
  };
  const setIcons = (icon_set: IconSetSetting | null) => onChange({ ...value, icon_set });

  function remember(c: CharacterSetting | null) {
    // The themes gallery shows the character you're working on.
    try {
      if (c) localStorage.setItem("jb-cast-draft", JSON.stringify(c));
      else localStorage.removeItem("jb-cast-draft");
    } catch {
      /* private mode */
    }
  }

  function surprise() {
    const pool = CHARACTERS.filter((c) => c.id !== (char.type === "library" ? char.id : ""));
    const next = pool[Math.floor(Math.random() * pool.length)]!;
    const set = ICON_SETS.filter((s) => s.id !== "emoji")[Math.floor(Math.random() * (ICON_SETS.length - 1))]!;
    const pickColor = () => SWATCHES[Math.floor(Math.random() * SWATCHES.length)]!;
    const character: CharacterSetting = { type: "library", id: next.id, accessory: true, colors: { primary: next.colors.primary, secondary: pickColor() } };
    remember(character);
    onChange({ character, icon_set: { id: set.id } });
  }

  return (
    <div>
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs text-muted">Who opens the gift with them, and what falls from the sky.</p>
        <button
          type="button"
          onClick={surprise}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-line bg-cream px-3 py-1.5 text-xs font-medium hover:bg-glass/80"
        >
          <Shuffle className="size-3.5" aria-hidden="true" /> Surprise me
        </button>
      </div>

      <div role="tablist" aria-label="Cast" className="relative mt-3 grid grid-cols-4 rounded-full bg-cream p-1 text-[12px] font-medium">
        {TABS.map((t) => (
          <button
            key={t.key}
            role="tab"
            type="button"
            aria-selected={tab === t.key}
            onClick={() => setTab(t.key)}
            className="relative z-[1] rounded-full px-1 py-1.5 transition-colors"
            style={{ color: tab === t.key ? "#FBF8F2" : undefined }}
          >
            {tab === t.key ? <motion.span layoutId="cast-tab" className="absolute inset-0 -z-[1] rounded-full bg-ink" transition={SPRING.snappy} /> : null}
            {t.label}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait" initial={false}>
        <motion.div key={tab} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={SPRING.soft} className="mt-4">
          {tab === "characters" ? (
            <div>
              <button
                type="button"
                onClick={() => setChar({ type: "none" })}
                aria-pressed={char.type === "none"}
                className={`mb-4 flex w-full items-center gap-3 rounded-2xl border px-3 py-2.5 text-left text-sm transition-colors ${char.type === "none" ? "border-accent bg-accent/8" : "border-line bg-cream hover:bg-glass/80"}`}
              >
                <span className="grid size-9 place-items-center rounded-full border border-dashed border-ink/25 text-ink/50">∅</span>
                <span>
                  <span className="block font-medium">No one</span>
                  <span className="block text-xs text-muted">Let the {design.object.toLowerCase().replace(/^an? /, "")} do the talking</span>
                </span>
              </button>
              {(["Mascot", "Animals", "Little people", "Objects"] as const).map((cat) => {
                const list = CHARACTERS.filter((c) => c.category === cat);
                if (!list.length) return null;
                return (
                  <div key={cat} className="mb-4">
                    <p className="font-mono text-[10px] tracking-[0.18em] text-muted uppercase">{cat}</p>
                    <div className="mt-2 grid grid-cols-4 gap-2">
                      {list.map((c) => {
                        const on = char.type === "library" && char.id === c.id;
                        return (
                          <motion.button
                            key={c.id}
                            type="button"
                            whileTap={{ scale: 0.92 }}
                            onClick={() => setChar({ type: "library", id: c.id, accessory: wearing, ...(char.name_tag ? { name_tag: char.name_tag } : {}) })}
                            aria-pressed={on}
                            className={`grid place-items-center rounded-2xl border p-1 transition-colors ${on ? "border-accent bg-accent/8" : "border-line bg-cream hover:bg-glass/80"}`}
                            title={c.name}
                          >
                            <Character setting={{ type: "library", id: c.id, accessory: wearing }} accessory={accessory} size={58} live={false} follow={false} showName={false} />
                            <span className="text-[11px]">{c.name}</span>
                          </motion.button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
              {accessory ? (
                <label className="flex items-center justify-between rounded-2xl border border-line bg-cream px-3 py-2.5 text-sm">
                  <span>Wear the {ACCESSORIES[accessory].name.toLowerCase()}</span>
                  <input type="checkbox" checked={wearing} onChange={(e) => setChar({ ...char, accessory: e.target.checked })} className="size-4 accent-[var(--color-accent,#B5623E)]" />
                </label>
              ) : null}
            </div>
          ) : null}

          {tab === "customize" ? (
            <div className="space-y-4">
              {char.type === "library" ? (
                (["primary", "secondary", "skin"] as const).map((slot) => {
                  const base = characterById(char.id).colors[slot];
                  const now = char.colors?.[slot] ?? base;
                  return (
                    <div key={slot}>
                      <p className="text-xs text-muted">{slot === "primary" ? "Main color" : slot === "secondary" ? "Second color" : "Face"}</p>
                      <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                        {[base, ...SWATCHES.filter((s) => s !== base)].slice(0, 10).map((sw) => (
                          <button
                            key={sw}
                            type="button"
                            aria-label={`Use ${sw}`}
                            onClick={() => setChar({ ...char, colors: { ...char.colors, [slot]: sw } })}
                            className="size-7 rounded-full"
                            style={{ background: sw, boxShadow: now.toLowerCase() === sw.toLowerCase() ? "0 0 0 2px #FBF8F2, 0 0 0 4px #2B2522" : "inset 0 0 0 1px rgba(0,0,0,.12)" }}
                          />
                        ))}
                        <label className="relative grid size-7 cursor-pointer place-items-center rounded-full border border-dashed border-line text-[10px]" title="Any color">
                          +
                          <input type="color" value={now} onChange={(e) => setChar({ ...char, colors: { ...char.colors, [slot]: e.target.value } })} className="absolute inset-0 cursor-pointer opacity-0" />
                        </label>
                      </div>
                    </div>
                  );
                })
              ) : (
                <p className="text-sm text-muted">Your own picture keeps its colors. You can still give it a name tag.</p>
              )}
              <label className="block">
                <span className="text-xs text-muted">Name tag (optional)</span>
                <input
                  value={char.name_tag ?? ""}
                  maxLength={24}
                  placeholder={char.type === "library" ? characterById(char.id).name : "Their name"}
                  onChange={(e) => {
                    const v = e.target.value;
                    const { name_tag: _drop, ...rest } = char;
                    setChar(v ? { ...rest, name_tag: v } : (rest as CharacterSetting));
                  }}
                  className="mt-1 w-full rounded-xl border border-line bg-cream px-3 py-2.5 text-sm outline-none focus:border-accent"
                />
              </label>
              {value.character ? (
                <button type="button" onClick={() => setChar(null)} className="text-xs text-muted underline underline-offset-4">
                  Back to the theme's own
                </button>
              ) : null}
            </div>
          ) : null}

          {tab === "upload" ? <UploadTab siteId={siteId} char={char} accessory={accessory} onSet={setChar} /> : null}

          {tab === "sprinkles" ? <SprinklesTab siteId={siteId} kind={kind} recipient={recipient} value={value.icon_set} onSet={setIcons} /> : null}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

function UploadTab({
  siteId,
  char,
  accessory,
  onSet,
}: {
  siteId: string;
  char: CharacterSetting;
  accessory: ReturnType<typeof designFor>["accessory"];
  onSet: (c: CharacterSetting | null) => void;
}) {
  const [busy, setBusy] = useState(false);
  const input = useRef<HTMLInputElement | null>(null);
  async function onFile(f: File | undefined) {
    if (!f) return;
    if (!f.type.startsWith("image/")) {
      toast.error("That isn't a picture. Try a PNG or JPG.");
      return;
    }
    if (f.size > 8 * 1024 * 1024) {
      toast.error("That picture is over 8 MB. Try a smaller one.");
      return;
    }
    setBusy(true);
    try {
      const url = await uploadFile(f, "intro", siteId);
      onSet({ type: "upload", upload_url: url, accessory: true, ...(char.name_tag ? { name_tag: char.name_tag } : {}) });
    } catch {
      toast.error("Couldn't upload that. Try again in a moment.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <div>
      <p className="text-sm">Put your pet, your face or a drawing in the opening. It becomes a sticker with a white outline.</p>
      <p className="mt-1 text-xs text-muted">Works best with a cut-out PNG, or a photo on a plain background.</p>
      <div className="mt-4 flex items-center gap-4">
        <div className="grid size-28 place-items-center rounded-2xl border border-line bg-cream">
          {char.type === "upload" ? (
            <Character setting={char} accessory={accessory} size={92} live={false} follow={false} showName={false} />
          ) : (
            <Upload className="size-6 text-muted" aria-hidden="true" />
          )}
        </div>
        <div className="flex flex-col gap-2">
          <button
            type="button"
            disabled={busy}
            onClick={() => input.current?.click()}
            className="rounded-full bg-ink px-4 py-2 text-sm font-medium text-paper disabled:opacity-60"
          >
            {busy ? "Uploading…" : char.type === "upload" ? "Choose another" : "Choose a picture"}
          </button>
          {char.type === "upload" ? (
            <button type="button" onClick={() => onSet(null)} className="inline-flex items-center gap-1 text-xs text-muted underline underline-offset-4">
              <X className="size-3" aria-hidden="true" /> Remove it
            </button>
          ) : null}
        </div>
      </div>
      <input ref={input} type="file" accept="image/*" className="hidden" onChange={(e) => void onFile(e.target.files?.[0])} />
    </div>
  );
}

function SprinklesTab({
  siteId,
  kind,
  recipient,
  value,
  onSet,
}: {
  siteId: string;
  kind: ThemeKind;
  recipient: string;
  value: IconSetSetting | null;
  onSet: (v: IconSetSetting | null) => void;
}) {
  const current = castFor(kind, null, value).iconSet;
  const custom = current && "custom" in current ? current : null;
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement | null>(null);
  const items = custom?.custom ?? [];

  function addCustom(x: string) {
    const next = [...items, x].slice(0, MAX_CUSTOM_ICONS);
    onSet({ custom: next, ...(custom?.physics ? { physics: custom.physics } : {}) });
  }

  async function onFile(f: File | undefined) {
    if (!f || !f.type.startsWith("image/")) return;
    setBusy(true);
    try {
      addCustom(await uploadFile(f, "intro", siteId));
    } catch {
      toast.error("Couldn't upload that. Try again in a moment.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <div className="grid grid-cols-2 gap-2">
        {ICON_SETS.map((s) => {
          const on = !custom && "id" in current && current.id === s.id;
          const set = resolveIconSet({ id: s.id }, { recipient });
          return (
            <motion.button
              key={s.id}
              type="button"
              whileTap={{ scale: 0.95 }}
              onClick={() => onSet({ id: s.id })}
              aria-pressed={on}
              className={`flex items-center justify-between rounded-2xl border px-3 py-2.5 text-left text-sm transition-colors ${on ? "border-accent bg-accent/8" : "border-line bg-cream hover:bg-glass/80"}`}
            >
              <span>{s.name}</span>
              <span className="flex gap-1">
                {set.items.slice(0, 3).map((it, i) => (
                  <IconGlyph key={i} item={it} color={set.colors[i % Math.max(1, set.colors.length)] ?? "#B5623E"} size={14} />
                ))}
              </span>
            </motion.button>
          );
        })}
      </div>

      <div className="mt-5 rounded-2xl border border-line bg-cream p-3">
        <p className="text-sm font-medium">Your own</p>
        <p className="mt-0.5 text-xs text-muted">Up to {MAX_CUSTOM_ICONS} emoji or small pictures.</p>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          {items.map((x, i) => (
            <span key={i} className="relative grid size-10 place-items-center rounded-xl border border-line bg-paper text-xl">
              {x.startsWith("http") || x.startsWith("/") ? <img src={x} alt="" className="size-7 object-contain" /> : x}
              <button
                type="button"
                aria-label="Remove"
                onClick={() => {
                  const next = items.filter((_, j) => j !== i);
                  onSet(next.length ? { custom: next, ...(custom?.physics ? { physics: custom.physics } : {}) } : null);
                }}
                className="absolute -top-1.5 -right-1.5 grid size-4 place-items-center rounded-full bg-ink text-paper"
              >
                <X className="size-2.5" aria-hidden="true" />
              </button>
            </span>
          ))}
          {items.length < MAX_CUSTOM_ICONS ? (
            <>
              <input
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && draft.trim()) {
                    e.preventDefault();
                    addCustom(draft.trim());
                    setDraft("");
                  }
                }}
                placeholder="🌻"
                aria-label="Add an emoji"
                className="h-10 w-16 rounded-xl border border-line bg-paper px-2 text-center text-xl outline-none focus:border-accent"
              />
              <button type="button" disabled={!draft.trim()} onClick={() => { addCustom(draft.trim()); setDraft(""); }} className="h-10 rounded-xl border border-line px-3 text-xs font-medium disabled:opacity-50">
                Add
              </button>
              <button type="button" disabled={busy} onClick={() => fileRef.current?.click()} className="h-10 rounded-xl border border-line px-3 text-xs font-medium disabled:opacity-50">
                {busy ? "Uploading…" : "Picture"}
              </button>
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => void onFile(e.target.files?.[0])} />
            </>
          ) : null}
        </div>
        {custom ? (
          <div className="mt-3 flex gap-1.5">
            {PHYSICS.map((ph) => (
              <button
                key={ph.key}
                type="button"
                onClick={() => onSet({ custom: items, physics: ph.key })}
                className={`rounded-full border px-3 py-1 text-xs ${(custom.physics ?? "float") === ph.key ? "border-accent bg-accent/8" : "border-line"}`}
              >
                {ph.label}
              </button>
            ))}
          </div>
        ) : null}
      </div>
      {value ? (
        <button type="button" onClick={() => onSet(null)} className="mt-3 text-xs text-muted underline underline-offset-4">
          Back to the theme's own
        </button>
      ) : null}
    </div>
  );
}
