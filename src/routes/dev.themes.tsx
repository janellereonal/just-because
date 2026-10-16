import { useEffect, useMemo, useRef, useState } from "react";
import { createFileRoute, notFound } from "@tanstack/react-router";
import { motion, useTransform } from "motion/react";
import { t } from "@/i18n";
import { EngineStage } from "@/themes/engine/EngineStage";
import { ENGINE_THEMES } from "@/themes/engine/registry";
import { validateTheme } from "@/themes/engine/define";
import { GESTURES, useGesture, type GestureKind } from "@/themes/engine/gestures";
import { MATERIALS, material, type MaterialName } from "@/themes/engine/materials";
import { PARTICLES, particlesFrom, type ParticlePreset } from "@/themes/engine/particles";
import { playSound, type SoundName } from "@/themes/engine/sound";
import { SAMPLE_SLOTS, WORST_SLOTS, type SlotInput } from "@/themes/engine/slots";
import { GiftIntro } from "@/components/GiftIntro";
import { THEME_KINDS, type ThemeKind } from "@/lib/themeKind";
import { FONT_PAIRINGS } from "@/lib/gift";
import { useSound } from "@/lib/play";

/**
 * Dev only: the theme engine playground. Preview any theme (engine themes and
 * the current openings) with any personalisation, worst-case input, on phone
 * and laptop sizes; try every gesture, material, particle preset and sound.
 * A 404 in production. `VITE_DEV_TOOLS=1` turns it on in a local production
 * build, for the performance script.
 * /dev/themes?theme=kraft-parcel&size=phone&worst=1
 */
export const Route = createFileRoute("/dev/themes")({
  beforeLoad: () => {
    if (!import.meta.env.DEV && import.meta.env["VITE_DEV_TOOLS"] !== "1") throw notFound();
  },
  validateSearch: (s: Record<string, unknown>): Search => ({
    theme: typeof s["theme"] === "string" ? s["theme"] : ENGINE_THEMES[0]?.id ?? "birthday",
    tab: (typeof s["tab"] === "string" ? s["tab"] : "themes") as Tab,
    size: (s["size"] === "laptop" ? "laptop" : "phone") as "phone" | "laptop",
    worst: s["worst"] === 1 || s["worst"] === "1" || s["worst"] === true,
    autoplay: s["autoplay"] === 1 || s["autoplay"] === "1" || s["autoplay"] === true,
  }),
  component: Playground,
});

type Tab = "themes" | "gestures" | "materials" | "particles" | "sounds";
type Search = { theme: string; tab: Tab; size: "phone" | "laptop"; worst: boolean; autoplay: boolean };
const TABS: { id: Tab; label: string }[] = [
  { id: "themes", label: t("playground.theme") },
  { id: "gestures", label: t("playground.gestures") },
  { id: "materials", label: t("playground.materials") },
  { id: "particles", label: t("playground.particles") },
  { id: "sounds", label: t("playground.sounds") },
];
const SIZES = { phone: { w: 390, h: 844 }, laptop: { w: 1440, h: 756 } } as const;

function Playground() {
  const search: Search = Route.useSearch();
  const navigate = Route.useNavigate();
  const set = (patch: Partial<Search>) => void navigate({ search: { ...search, ...patch }, replace: true });
  const [sound, setSound] = useSound();
  return (
    <div className="min-h-dvh bg-paper text-ink">
      <header className="sticky top-0 z-20 flex flex-wrap items-center gap-3 border-b border-line bg-paper/95 px-4 py-3 backdrop-blur">
        <h1 className="font-display text-xl font-medium">{t("playground.title")}</h1>
        <nav className="flex flex-wrap gap-1">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => set({ tab: tab.id })}
              className={`rounded-full px-3 py-1.5 text-sm ${search.tab === tab.id ? "bg-ink text-cream" : "bg-cream"}`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
        <label className="ml-auto flex items-center gap-2 text-sm">
          <input type="checkbox" checked={sound} onChange={(e) => setSound(e.target.checked)} /> {t("opening.soundOn")}
        </label>
      </header>
      {search.tab === "themes" ? <ThemesTab search={search} set={set} /> : null}
      {search.tab === "gestures" ? <GesturesTab /> : null}
      {search.tab === "materials" ? <MaterialsTab /> : null}
      {search.tab === "particles" ? <ParticlesTab /> : null}
      {search.tab === "sounds" ? <SoundsTab /> : null}
    </div>
  );
}

/* ---------- themes ---------- */

function ThemesTab({ search, set }: { search: Search; set: (p: Partial<Search>) => void }) {
  const [slots, setSlots] = useState<SlotInput>(SAMPLE_SLOTS);
  const [run, setRun] = useState(0);
  const input = search.worst ? WORST_SLOTS : slots;
  const engine = ENGINE_THEMES.find((x) => x.id === search.theme);
  const current = !engine && (THEME_KINDS as readonly string[]).includes(search.theme) ? (search.theme as ThemeKind) : null;
  const problems = engine ? validateTheme(engine) : [];
  const size = SIZES[search.size];
  const box = useRef<HTMLDivElement | null>(null);
  const [scale, setScale] = useState(1);
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setScale(Math.min(1, el.clientWidth / size.w, (window.innerHeight - 140) / size.h)));
    ro.observe(el);
    return () => ro.disconnect();
  }, [size.w, size.h]);

  return (
    <div className="grid gap-6 p-4 lg:grid-cols-[320px_1fr]">
      <aside className="space-y-4">
        <label className="block text-sm">
          <span className="text-xs text-muted">{t("playground.theme")}</span>
          <select value={search.theme} onChange={(e) => set({ theme: e.target.value })} className="mt-1 w-full rounded-xl border border-line bg-cream px-3 py-2">
            <optgroup label="Engine">
              {ENGINE_THEMES.map((x) => (
                <option key={x.id} value={x.id}>
                  {x.name} ({x.status})
                </option>
              ))}
            </optgroup>
            <optgroup label="Current openings">
              {THEME_KINDS.filter((k) => k !== "default").map((k) => (
                <option key={k} value={k}>
                  {k}
                </option>
              ))}
            </optgroup>
          </select>
        </label>
        <div className="flex flex-wrap gap-2 text-sm">
          {(["phone", "laptop"] as const).map((s) => (
            <button key={s} type="button" onClick={() => set({ size: s })} className={`rounded-full px-3 py-1.5 ${search.size === s ? "bg-ink text-cream" : "bg-cream"}`}>
              {t(s === "phone" ? "playground.phone" : "playground.laptop")}
            </button>
          ))}
          <label className="flex items-center gap-1.5 rounded-full bg-cream px-3 py-1.5">
            <input type="checkbox" checked={search.worst} onChange={(e) => set({ worst: e.target.checked })} /> {t("playground.worst")}
          </label>
          <label className="flex items-center gap-1.5 rounded-full bg-cream px-3 py-1.5">
            <input type="checkbox" checked={search.autoplay} onChange={(e) => set({ autoplay: e.target.checked })} /> Autoplay
          </label>
          <button type="button" onClick={() => setRun((r) => r + 1)} className="rounded-full bg-accent px-3 py-1.5 text-cream">
            {t("playground.replay")}
          </button>
        </div>
        <fieldset className="space-y-2 rounded-2xl border border-line p-3" disabled={search.worst}>
          <legend className="px-1 text-xs text-muted">{t("playground.slots")}</legend>
          <Field label="Recipient" value={String(slots.recipient ?? "")} onChange={(v) => setSlots({ ...slots, recipient: v })} />
          <Field label="Age" value={String(slots.age ?? "")} onChange={(v) => setSlots({ ...slots, age: v })} />
          <Field label="Date (YYYY-MM-DD)" value={slots.date ?? ""} onChange={(v) => setSlots({ ...slots, date: v })} />
          <Field label="Place city" value={slots.place?.city ?? ""} onChange={(v) => setSlots({ ...slots, place: { ...slots.place, city: v } })} />
          <Field label="Place country (PH, US...)" value={slots.place?.country ?? ""} onChange={(v) => setSlots({ ...slots, place: { ...slots.place, country: v } })} />
          <Field label="Sender city" value={slots.senderPlace?.city ?? ""} onChange={(v) => setSlots({ ...slots, senderPlace: { ...slots.senderPlace, city: v } })} />
          <Field label="Sender country" value={slots.senderPlace?.country ?? ""} onChange={(v) => setSlots({ ...slots, senderPlace: { ...slots.senderPlace, country: v } })} />
          <Field label="Photo URL" value={slots.photo ?? ""} onChange={(v) => setSlots({ ...slots, photo: v })} />
          <Field label="Monogram" value={slots.monogram ?? ""} onChange={(v) => setSlots({ ...slots, monogram: v })} />
          <Field label="Accent (#rrggbb)" value={slots.accent ?? ""} onChange={(v) => setSlots({ ...slots, accent: v })} />
          <Field label="Accent 2 (#rrggbb)" value={slots.accent2 ?? ""} onChange={(v) => setSlots({ ...slots, accent2: v })} />
        </fieldset>
        {engine ? (
          <div className="rounded-2xl border border-line p-3 text-xs">
            <p className="font-medium">
              {engine.object} · {engine.gesture} · {engine.materials.join(", ")} · {engine.price.kind}
            </p>
            {problems.length ? (
              <ul className="mt-2 list-disc pl-4 text-[#B42318]">
                {problems.map((x) => (
                  <li key={x}>{x}</li>
                ))}
              </ul>
            ) : (
              <p className="mt-2 text-muted">Config checks pass.</p>
            )}
          </div>
        ) : null}
      </aside>
      <div ref={box} className="min-w-0">
        <div className="mx-auto overflow-hidden rounded-[20px] shadow-xl ring-1 ring-ink/10" style={{ width: size.w * scale, height: size.h * scale }}>
          <div className="relative overflow-hidden [container:gift/inline-size]" style={{ width: size.w, height: size.h, transform: `scale(${scale})`, transformOrigin: "0 0" }} data-testid="stage">
            {engine ? (
              <EngineStage
                key={`${engine.id}-${run}-${search.worst}-${search.autoplay}`}
                theme={engine}
                slots={input}
                greeting={`For ${input.recipient || "you"}, from all of us`}
                contained
                autoplay={search.autoplay}
                contributors={["Jo", "Mika", "Sam"]}
                onOpen={() => window.setTimeout(() => setRun((r) => r + 1), 1500)}
                onSkip={() => setRun((r) => r + 1)}
              />
            ) : current ? (
              <GiftIntro
                key={`${current}-${run}-${search.worst}`}
                style={"classic" as never}
                kind={current}
                palette={{ background: "#FBF8F2", primary: "#2B2522", accent: "#B5623E" }}
                fonts={FONT_PAIRINGS.romantic!}
                backgroundStyle="paper"
                recipientName={String(input.recipient ?? "")}
                introText={`For ${input.recipient || "you"}, from all of us`}
                settings={{}}
                character={null}
                iconSet={null}
                contributors={["Jo", "Mika", "Sam"]}
                contained
                {...(search.autoplay ? { autoOpenAfter: 900 } : {})}
                onOpen={() => window.setTimeout(() => setRun((r) => r + 1), 1500)}
                onSkip={() => setRun((r) => r + 1)}
              />
            ) : (
              <p className="p-6">No theme called {search.theme}</p>
            )}
          </div>
        </div>
        <p className="mt-2 text-center font-mono text-[11px] text-muted">
          {size.w}x{size.h} at {Math.round(scale * 100)}%
        </p>
      </div>
    </div>
  );
}

function Field({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <label className="block">
      <span className="text-[11px] text-muted">{label}</span>
      <input value={value} onChange={(e) => onChange(e.target.value)} className="mt-0.5 w-full rounded-lg border border-line bg-cream px-2.5 py-1.5 text-sm" />
    </label>
  );
}

/* ---------- gestures ---------- */

const PAD_MATERIAL: Record<GestureKind, MaterialName> = {
  tear: "paper",
  peel: "foil",
  pull: "fabric",
  untie: "fabric",
  blow: "wax",
  shake: "glass",
  scratch: "foil",
  hold: "wax",
  slide: "paper",
  spin: "wood",
  unfold: "paper",
  pop: "glass",
  wipe: "frost",
};

function GesturesTab() {
  return (
    <div className="grid gap-4 p-4 sm:grid-cols-2 lg:grid-cols-4">
      {GESTURES.map((g) => (
        <GesturePad key={g} kind={g} />
      ))}
    </div>
  );
}

function GesturePad({ kind }: { kind: GestureKind }) {
  const [count, setCount] = useState(0);
  const g = useGesture(kind, { onDone: () => setCount((c) => c + 1), distance: 140, sound: { tick: "paper-rustle", done: "sparkle" } });
  const width = useTransform(g.progress, (v) => `${Math.round(v * 100)}%`);
  const canvas = useRef<HTMLCanvasElement | null>(null);
  // Scratch and wipe paint their strokes into a mask.
  useEffect(() => {
    if (kind !== "scratch" && kind !== "wipe") return;
    const c = canvas.current;
    if (!c) return;
    const ctx = c.getContext("2d");
    if (!ctx) return;
    const paint = () => {
      ctx.globalCompositeOperation = "source-over";
      ctx.fillStyle = kind === "wipe" ? "rgba(235,242,248,.92)" : "#C9B98F";
      ctx.fillRect(0, 0, c.width, c.height);
    };
    paint();
    return g.onStroke((s) => {
      ctx.globalCompositeOperation = "destination-out";
      ctx.lineCap = "round";
      ctx.lineWidth = s.radius * 2 * c.width;
      ctx.beginPath();
      ctx.moveTo(s.u0 * c.width, s.v0 * c.height);
      ctx.lineTo(s.u1 * c.width, s.v1 * c.height);
      ctx.stroke();
    });
  }, [g, kind, count]);
  return (
    <div className="rounded-2xl border border-line bg-cream p-3">
      <div className="flex items-center justify-between">
        <p className="font-medium">{kind}</p>
        <p className="text-xs text-muted">{g.done ? t("playground.done") : g.hint}</p>
      </div>
      <div
        {...g.bind}
        className="relative mt-2 grid h-36 place-items-center overflow-hidden text-sm outline-none select-none focus-visible:ring-4 focus-visible:ring-accent/50"
        style={{ ...(g.bind.style as object), ...(material(PAD_MATERIAL[kind], { lift: 0.3 }) as object) }}
        data-gesture={kind}
      >
        {kind === "scratch" || kind === "wipe" ? (
          <>
            <span className="font-display text-lg">Hello</span>
            <canvas ref={canvas} width={280} height={144} className="pointer-events-none absolute inset-0 size-full" />
          </>
        ) : (
          <span className="pointer-events-none font-mono text-xs opacity-60">{kind === "pop" ? `${g.stage} / 5` : g.label}</span>
        )}
      </div>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-ink/10">
        <motion.div className="h-full bg-accent" style={{ width }} />
      </div>
      <div className="mt-2 flex flex-wrap gap-2 text-xs">
        <button type="button" onClick={g.complete} className="rounded-full border border-line px-2.5 py-1">
          {t("opening.open")}
        </button>
        <button type="button" onClick={() => { g.reset(); setCount((c) => c + 1); }} className="rounded-full border border-line px-2.5 py-1">
          Reset
        </button>
        {g.mic ? (
          <button type="button" onClick={() => void g.mic!.start()} className="rounded-full border border-line px-2.5 py-1">
            {g.mic.state === "denied" || g.mic.state === "unsupported" ? t("gesture.blow.micDenied") : `${t("gesture.blow.mic")} (${g.mic.state})`}
          </button>
        ) : null}
        {g.motion ? (
          <button type="button" onClick={() => void g.motion!.start()} className="rounded-full border border-line px-2.5 py-1">
            {t("gesture.shake.motion")} ({g.motion.state})
          </button>
        ) : null}
        <span className="ml-auto text-muted">done {count}x</span>
      </div>
    </div>
  );
}

/* ---------- materials, particles, sounds ---------- */

function MaterialsTab() {
  return (
    <div className="grid gap-5 p-6 sm:grid-cols-3 lg:grid-cols-5" style={{ background: "#EFE6D8" }}>
      {MATERIALS.map((m) => (
        <div key={m} className="text-center">
          <div className="mx-auto h-32 w-full" style={material(m, { lift: 0.6 })} />
          <p className="mt-3 font-mono text-xs">{m}</p>
        </div>
      ))}
    </div>
  );
}

function ParticlesTab() {
  const host = useRef<HTMLDivElement | null>(null);
  const refs = useRef<Record<string, HTMLButtonElement | null>>({});
  return (
    <div ref={host} className="relative flex min-h-[70vh] flex-wrap items-center justify-center gap-3 overflow-hidden p-6">
      {PARTICLES.map((p: ParticlePreset) => (
        <button
          key={p}
          ref={(el) => {
            refs.current[p] = el;
          }}
          type="button"
          onClick={() => particlesFrom(p, host.current, refs.current[p] ?? null)}
          className="rounded-full bg-ink px-5 py-3 text-sm text-cream"
        >
          {p}
        </button>
      ))}
    </div>
  );
}

const SOUNDS: SoundName[] = ["paper-tear", "paper-rustle", "tape-pull", "wax-crack", "ribbon-pull", "bell", "glass-wipe", "cardboard-thud", "pop", "sparkle", "chime", "whoosh"];

function SoundsTab() {
  const list = useMemo(() => SOUNDS, []);
  return (
    <div className="flex flex-wrap gap-2 p-6">
      <p className="w-full text-sm text-muted">Turn sound on at the top first.</p>
      {list.map((s) => (
        <button key={s} type="button" onClick={() => playSound(s)} className="rounded-full border border-line bg-cream px-4 py-2 text-sm">
          {s}
        </button>
      ))}
    </div>
  );
}
