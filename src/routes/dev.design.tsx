import { useEffect, useMemo, useState } from "react";
import { createFileRoute, notFound } from "@tanstack/react-router";
import {
  Bell,
  Camera,
  Check,
  ChevronRight,
  Gift,
  Heart,
  Image as ImageIcon,
  Link2,
  Mail,
  MessageCircle,
  Mic,
  Music2,
  PenLine,
  Search,
  Send,
  Settings2,
  Share2,
  Sparkles,
  Trash2,
  Users,
  Video,
  X,
} from "lucide-react";
// Loaded as links only on this page, so the draft never adds CSS or fonts to the live site.
import frauncesCss from "@fontsource-variable/fraunces/full.css?url";
import frauncesItalicCss from "@fontsource-variable/fraunces/full-italic.css?url";
import dmSansCss from "@fontsource-variable/dm-sans/index.css?url";
import keepsakeCss from "@/design/keepsake.css?url";
import { AppIcon, Lockup, TagMark } from "@/components/brand/Logo";
import { FoldAndTie } from "@/components/brand/FoldAndTie";
import Bo from "@/components/Bo";
import { EngineStage } from "@/themes/engine/EngineStage";
import { ENGINE_THEMES } from "@/themes/engine/registry";
import { SAMPLE_SLOTS } from "@/themes/engine/slots";

/**
 * DRAFT style guide for "Keepsake Modern" (Launch PR 6, step 1: approval first).
 * Dev only: a 404 in production, so it is never indexed. Nothing here is applied site-wide.
 *   /dev/design             the whole guide
 *   /dev/design?view=hero   just the redesigned homepage hero, full screen (for screenshots)
 */
export const Route = createFileRoute("/dev/design")({
  beforeLoad: () => {
    if (!import.meta.env.DEV) throw notFound();
  },
  validateSearch: (s: Record<string, unknown>) => ({ view: s["view"] === "hero" ? ("hero" as const) : undefined }),
  head: () => ({
    meta: [{ title: "Design draft | Just Because" }, { name: "robots", content: "noindex, nofollow" }],
    links: [frauncesCss, frauncesItalicCss, dmSansCss, keepsakeCss].map((href) => ({ rel: "stylesheet", href })),
  }),
  component: DesignPage,
});

/* ---------- colour maths for the contrast table ---------- */

function lum(hex: string) {
  const n = hex.replace("#", "");
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(n.slice(i, i + 2), 16) / 255).map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r! + 0.7152 * g! + 0.0722 * b!;
}
export function contrast(a: string, b: string) {
  const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p);
  return (x! + 0.05) / (y! + 0.05);
}

const TOKENS = [
  ["paper", "#FAF6F0", "Page background"],
  ["surface", "#FFFFFF", "Cards, panels"],
  ["ink", "#2B2522", "Headlines, main text"],
  ["ink-muted", "#6B625C", "Body, secondary text"],
  ["line", "#EAE3DA", "Borders, dividers"],
  ["raspberry", "#C2366B", "Main action, key moments only"],
  ["raspberry-deep", "#9E2455", "Hover, pressed"],
  ["blush", "#FBE3EA", "Selected, rare highlight"],
] as const;
const ACCENTS = [
  ["butter", "#F6D77A"],
  ["sage", "#A9C5A0"],
  ["sky", "#A8C8EC"],
  ["lilac", "#C9B8E8"],
] as const;

/** Text-on-background pairs we actually use. AA: 4.5 for text, 3 for large text and UI. */
const PAIRS: [string, string, string, string, number][] = [
  ["ink on paper", "#2B2522", "#FAF6F0", "Body text", 4.5],
  ["ink-muted on paper", "#6B625C", "#FAF6F0", "Secondary text", 4.5],
  ["ink-muted on surface", "#6B625C", "#FFFFFF", "Secondary text", 4.5],
  ["white on raspberry", "#FFFFFF", "#C2366B", "Primary button", 4.5],
  ["white on raspberry-deep", "#FFFFFF", "#9E2455", "Button hover", 4.5],
  ["raspberry on paper", "#C2366B", "#FAF6F0", "Links, key words", 4.5],
  ["ink on blush", "#2B2522", "#FBE3EA", "Selected chips", 4.5],
  ["ink on butter", "#2B2522", "#F6D77A", "Tags", 4.5],
  ["ink on sage", "#2B2522", "#A9C5A0", "Tags", 4.5],
  ["ink on sky", "#2B2522", "#A8C8EC", "Tags", 4.5],
  ["ink on lilac", "#2B2522", "#C9B8E8", "Tags", 4.5],
  ["placeholder on surface", "#8A817A", "#FFFFFF", "Field placeholder (large-ish UI)", 3],
];

function DesignPage() {
  const { view } = Route.useSearch();
  if (view === "hero") return <HeroMock full />;
  return (
    <div className="kd kd-grain min-h-dvh">
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <Lockup />
          <span className="kd-tag" style={{ background: "var(--kd-butter)" }}>
            Draft for approval · not live
          </span>
        </div>
        <h1 className="kd-d48 mt-10 max-w-[18ch]">
          Keepsake Modern, <em className="kd-warm">a first look</em>
        </h1>
        <p className="kd-t18 mt-4 max-w-[60ch]" style={{ color: "var(--kd-ink-muted)" }}>
          Warm, editorial and paper-like. The interface stays quiet so the gift can be the loud one. Nothing on this page is applied to the live site
          yet. Approve it and the next step rolls it out screen by screen.
        </p>

        <Section title="The homepage hero" note="Fits above the fold at 1440x756 and 390x844. The phone plays a real opening with no controls around it.">
          <div className="overflow-hidden rounded-[28px]" style={{ boxShadow: "inset 0 0 0 1px var(--kd-line)" }}>
            <HeroMock />
          </div>
        </Section>

        <Section title="Principles">
          <ol className="grid gap-3 sm:grid-cols-5">
            {[
              ["The gift is the hero", "The UI is calm and neutral so themes can be loud."],
              ["Paper, not plastic", "Warm off-white, ink text, real texture, soft shadows."],
              ["One brand colour", "Raspberry marks the main action and key moments only."],
              ["Emotion over features", "Show people and reactions, not toggles."],
              ["One job per screen", "One main action and one focal point per section."],
            ].map(([t, d], i) => (
              <li key={t} className="kd-card p-4">
                <span className="kd-t12" style={{ color: "var(--kd-ink-muted)" }}>
                  {i + 1}
                </span>
                <p className="kd-d22 mt-1">{t}</p>
                <p className="kd-t14 mt-2" style={{ color: "var(--kd-ink-muted)" }}>
                  {d}
                </p>
              </li>
            ))}
          </ol>
        </Section>

        <Section title="Colour" note="App and marketing UI only. Gifts keep their theme palettes. No pink page or panel backgrounds.">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {TOKENS.map(([name, hex, use]) => (
              <div key={name} className="kd-card overflow-hidden">
                <div className="h-20" style={{ background: hex, boxShadow: "inset 0 -1px 0 var(--kd-line)" }} />
                <div className="p-3">
                  <p className="kd-t14 font-medium">{name}</p>
                  <p className="kd-t12" style={{ color: "var(--kd-ink-muted)" }}>
                    {hex} · {use}
                  </p>
                </div>
              </div>
            ))}
          </div>
          <p className="kd-t14 mt-5 font-medium">Occasion accents (tags and filters only)</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {ACCENTS.map(([name, hex]) => (
              <span key={name} className="kd-tag" style={{ background: hex }}>
                {name} {hex}
              </span>
            ))}
          </div>
          <ContrastTable />
        </Section>

        <Section title="Type" note="Fraunces (soft optical style) for display, DM Sans for everything else. Both self-hosted, Latin and Latin Extended only. No monospace in the UI.">
          <div className="space-y-3">
            {[
              ["kd-d64", "64", "One gift from everyone"],
              ["kd-d48", "48", "Friends add notes, you send it"],
              ["kd-d36", "36", "Pick a theme they'll love"],
              ["kd-d28", "28", "How it works"],
              ["kd-d22", "22", "Letters for Ana"],
              ["kd-t18", "18", "Body large. Friends add letters, photos and voice notes through one link."],
              ["kd-t16", "16", "Body. No account needed. The organiser reads every note first."],
              ["kd-t14", "14", "Small UI text, labels and hints."],
              ["kd-t12", "12", "The smallest text anywhere: captions and fine print."],
            ].map(([cls, px, sample]) => (
              <div key={px} className="flex items-baseline gap-4 border-b pb-3" style={{ borderColor: "var(--kd-line)" }}>
                <span className="kd-t12 w-8 shrink-0" style={{ color: "var(--kd-ink-muted)" }}>
                  {px}
                </span>
                <span className={cls}>{sample}</span>
              </div>
            ))}
            <p className="kd-d36">
              Sentence case, tight leading, and the <em className="kd-warm">occasional</em> italic word.
            </p>
          </div>
        </Section>

        <Section title="Shape, depth and texture" note="Radius 8, 16 and 28. Pills only for buttons and tags. Two shadows. 8pt grid. Paper grain at 2.5%.">
          <div className="flex flex-wrap gap-4">
            {[8, 16, 28].map((r) => (
              <div key={r} className="kd-card grid size-28 place-items-center" style={{ borderRadius: r }}>
                <span className="kd-t14">{r}px</span>
              </div>
            ))}
            <div className="kd-card grid h-28 w-44 place-items-center">
              <span className="kd-t14">Shadow: rest</span>
            </div>
            <div className="kd-card kd-lift grid h-28 w-44 place-items-center">
              <span className="kd-t14">Shadow: lift</span>
            </div>
            <div className="grid h-28 w-44 place-items-center rounded-[16px]" style={{ background: "var(--kd-paper)", boxShadow: "inset 0 0 0 1px var(--kd-line)" }}>
              <span className="kd-t14">Paper with grain</span>
            </div>
          </div>
        </Section>

        <Section title="Motion" note="150 to 250ms, ease-out, no bouncing UI. One signature moment: fold and tie, for sending and wrapping. Reduced motion gets a simple fade.">
          <MotionDemo />
        </Section>

        <Section title="Icons" note="Lucide at a 1.5px stroke, everywhere in the UI. No system emoji.">
          <div className="flex flex-wrap gap-3">
            {[Gift, Heart, Mail, PenLine, ImageIcon, Camera, Mic, Video, Music2, Users, Link2, Share2, Send, Bell, Search, Settings2, Sparkles, MessageCircle, Trash2, Check].map((Icon, i) => (
              <span key={i} className="kd-card grid size-12 place-items-center">
                <Icon className="size-5" strokeWidth={1.5} />
              </span>
            ))}
          </div>
        </Section>

        <Section title="Logo" note="Draft mark: a gift tag with a small heart cutout, plus the wordmark in Fraunces. Bo stays the mascot, not the logo. A designer may refine the mark later.">
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="kd-card grid min-h-36 place-items-center p-6">
              <Lockup size={40} />
            </div>
            <div className="kd-card grid min-h-36 place-items-center p-6">
              <Lockup variant="stacked" size={36} />
            </div>
            <div className="grid min-h-36 place-items-center rounded-[16px] p-6" style={{ background: "#2B2522" }}>
              <Lockup size={36} mono="#FAF6F0" />
            </div>
            <div className="kd-card flex min-h-36 items-center justify-center gap-6 p-6">
              <AppIcon size={96} />
              <AppIcon size={96} tone="raspberry" />
            </div>
            <div className="kd-card flex min-h-36 items-center justify-center gap-5 p-6">
              <TagMark size={32} title="Favicon 32" />
              <TagMark size={16} title="Favicon 16" />
              <span className="kd-t12" style={{ color: "var(--kd-ink-muted)" }}>
                Favicon at 32 and 16
              </span>
            </div>
            <div className="kd-card grid min-h-36 place-items-center p-6">
              <Lockup size={28} mono="#2B2522" />
            </div>
          </div>
        </Section>

        <Section title="Components">
          <Components />
        </Section>

        <Section title="Bo" note="Janelle's rules.">
          <div className="kd-card flex flex-wrap items-center gap-6 p-6">
            <Bo pose="idle" size={110} title="Bo" />
            <ul className="kd-t16 max-w-[60ch] list-disc space-y-1.5 pl-5">
              <li>Bo keeps roaming on our own pages, and always avoids text, buttons, fields and previews.</li>
              <li>He pauses while someone is typing, tapping or dragging, and never floats over editor controls.</li>
              <li>One Bo on screen at a time.</li>
              <li>No Bo on /g/ gift pages: the gift is theirs.</li>
            </ul>
          </div>
        </Section>
      </div>
    </div>
  );
}

function Section({ title, note, children }: { title: string; note?: string; children: React.ReactNode }) {
  return (
    <section className="mt-16">
      <h2 className="kd-d28">{title}</h2>
      {note ? (
        <p className="kd-t14 mt-1 max-w-[70ch]" style={{ color: "var(--kd-ink-muted)" }}>
          {note}
        </p>
      ) : null}
      <div className="mt-5">{children}</div>
    </section>
  );
}

function ContrastTable() {
  return (
    <div className="kd-card mt-6 overflow-x-auto">
      <table className="kd-t14 w-full min-w-[560px] text-left">
        <thead style={{ color: "var(--kd-ink-muted)" }}>
          <tr>
            <th className="px-4 py-2 font-medium">Pair</th>
            <th className="px-3 py-2 font-medium">Used for</th>
            <th className="px-3 py-2 font-medium">Sample</th>
            <th className="px-3 py-2 font-medium">Ratio</th>
            <th className="px-3 py-2 font-medium">AA</th>
          </tr>
        </thead>
        <tbody>
          {PAIRS.map(([name, fg, bg, use, need]) => {
            const r = contrast(fg, bg);
            return (
              <tr key={name} className="border-t" style={{ borderColor: "var(--kd-line)" }}>
                <td className="px-4 py-2">{name}</td>
                <td className="px-3 py-2">{use}</td>
                <td className="px-3 py-2">
                  <span className="rounded-[8px] px-2 py-1" style={{ color: fg, background: bg, boxShadow: "inset 0 0 0 1px var(--kd-line)" }}>
                    Aa Just because
                  </span>
                </td>
                <td className="px-3 py-2 tabular-nums">{r.toFixed(2)}</td>
                <td className="px-3 py-2">{r >= need ? "Pass" : "Fails"}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function MotionDemo() {
  const [run, setRun] = useState(0);
  const [sent, setSent] = useState(false);
  return (
    <div className="kd-card flex flex-wrap items-center gap-8 p-6">
      <div className="grid h-40 w-52 place-items-end justify-center pb-2">
        <FoldAndTie key={run} size={170} onDone={() => setSent(true)} />
      </div>
      <div>
        <p className="kd-d22">{sent ? "It's in the gift." : "Folding…"}</p>
        <p className="kd-t14 mt-1" style={{ color: "var(--kd-ink-muted)" }}>
          Used when a friend sends a note, and when the organiser wraps the gift.
        </p>
        <button
          type="button"
          className="kd-btn kd-btn-secondary mt-4"
          onClick={() => {
            setSent(false);
            setRun((n) => n + 1);
          }}
        >
          Play it again
        </button>
      </div>
    </div>
  );
}

function Components() {
  const [text, setText] = useState("Ana, you taught me how to make adobo and how to keep going.");
  const [on, setOn] = useState(true);
  const [chips, setChips] = useState<Set<string>>(new Set(["Birthday"]));
  const [tab, setTab] = useState("Notes");
  const [modal, setModal] = useState(false);
  const [sheet, setSheet] = useState(false);
  const max = 2000;
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <div className="kd-card space-y-4 p-6">
        <p className="kd-t14 font-medium">Buttons</p>
        <div className="flex flex-wrap gap-2">
          <button type="button" className="kd-btn kd-btn-primary">
            <Gift className="size-4" strokeWidth={1.5} /> Make a gift
          </button>
          <button type="button" className="kd-btn kd-btn-secondary">
            See an example
          </button>
          <button type="button" className="kd-btn kd-btn-ghost">
            Not now
          </button>
          <button type="button" className="kd-btn kd-btn-danger">
            Delete
          </button>
          <button type="button" className="kd-btn kd-btn-primary" disabled>
            Sending…
          </button>
        </div>
        <label className="block">
          <span className="kd-t14 font-medium">Their name</span>
          <input className="kd-field mt-1.5" placeholder="Who's it for?" defaultValue="Ana" />
        </label>
        <label className="block">
          <span className="flex items-baseline justify-between">
            <span className="kd-t14 font-medium">Your note</span>
            <span className="kd-t12 tabular-nums" style={{ color: "var(--kd-ink-muted)" }}>
              {[...text].length} / {max}
            </span>
          </span>
          <textarea className="kd-field mt-1.5 min-h-24" value={text} maxLength={max} onChange={(e) => setText(e.target.value)} />
        </label>
        <label className="block">
          <span className="kd-t14 font-medium">Occasion</span>
          <select className="kd-field mt-1.5" defaultValue="Birthday">
            {["Birthday", "Wedding", "Farewell", "Christmas"].map((o) => (
              <option key={o}>{o}</option>
            ))}
          </select>
        </label>
        <label className="flex items-center justify-between gap-3">
          <span className="kd-t16">Let friends read each other's notes</span>
          <button
            type="button"
            role="switch"
            aria-checked={on}
            onClick={() => setOn((v) => !v)}
            className="relative h-7 w-12 rounded-full transition-colors"
            style={{ background: on ? "var(--kd-raspberry)" : "#D9D1C7" }}
          >
            <span className="absolute top-1 size-5 rounded-full bg-white transition-[left]" style={{ left: on ? 24 : 4, boxShadow: "0 1px 2px rgb(0 0 0 / .2)" }} />
          </button>
        </label>
      </div>

      <div className="kd-card space-y-5 p-6">
        <div>
          <p className="kd-t14 font-medium">Chips (filters)</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {["Birthday", "Wedding", "Baby", "Farewell", "Christmas"].map((c) => (
              <button
                key={c}
                type="button"
                className="kd-chip"
                aria-pressed={chips.has(c)}
                onClick={() =>
                  setChips((prev) => {
                    const next = new Set(prev);
                    if (next.has(c)) next.delete(c);
                    else next.add(c);
                    return next;
                  })
                }
              >
                {c}
              </button>
            ))}
          </div>
        </div>
        <div>
          <p className="kd-t14 font-medium">Tags (status)</p>
          <div className="mt-2 flex flex-wrap gap-2">
            <span className="kd-tag" style={{ background: "var(--kd-butter)" }}>
              Collecting
            </span>
            <span className="kd-tag" style={{ background: "var(--kd-sky)" }}>
              Ready to send
            </span>
            <span className="kd-tag" style={{ background: "var(--kd-sage)" }}>
              Sent
            </span>
            <span className="kd-tag" style={{ background: "var(--kd-lilac)" }}>
              Opened
            </span>
          </div>
        </div>
        <div>
          <p className="kd-t14 font-medium">Tabs</p>
          <div className="mt-2 flex gap-5 border-b" role="tablist" style={{ borderColor: "var(--kd-line)" }}>
            {["Words", "Look", "Notes", "Wrap it up"].map((t) => (
              <button
                key={t}
                type="button"
                role="tab"
                aria-selected={tab === t}
                onClick={() => setTab(t)}
                className="kd-t14 -mb-px border-b-2 pb-2 font-medium"
                style={{ borderColor: tab === t ? "var(--kd-ink)" : "transparent", color: tab === t ? "var(--kd-ink)" : "var(--kd-ink-muted)" }}
              >
                {t}
              </button>
            ))}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button type="button" className="kd-btn kd-btn-secondary" onClick={() => setModal(true)}>
            Open a modal
          </button>
          <button type="button" className="kd-btn kd-btn-secondary" onClick={() => setSheet(true)}>
            Open a sheet
          </button>
          <span className="group relative inline-flex">
            <button type="button" className="kd-btn kd-btn-ghost" aria-describedby="kd-tip">
              Hover for a tooltip
            </button>
            <span
              id="kd-tip"
              role="tooltip"
              className="kd-t12 pointer-events-none absolute bottom-full left-1/2 mb-2 -translate-x-1/2 rounded-[8px] px-2.5 py-1.5 whitespace-nowrap opacity-0 transition-opacity group-focus-within:opacity-100 group-hover:opacity-100"
              style={{ background: "var(--kd-ink)", color: "var(--kd-paper)" }}
            >
              Only you can see this
            </span>
          </span>
        </div>
        <div className="kd-card kd-lift flex items-center gap-3 px-4 py-3" role="status">
          <Check className="size-4" strokeWidth={1.5} style={{ color: "var(--kd-raspberry)" }} />
          <span className="kd-t14">Invite link copied. Send it to Ana's friends.</span>
        </div>
      </div>

      <div className="kd-card p-6">
        <p className="kd-t14 font-medium">Card</p>
        <div className="kd-card mt-3 overflow-hidden" style={{ boxShadow: "inset 0 0 0 1px var(--kd-line)" }}>
          <div className="h-28" style={{ background: "linear-gradient(135deg,#F6D77A,#E8A87C)" }} />
          <div className="p-4">
            <div className="flex items-center justify-between">
              <p className="kd-d22">Happy 30th, Ana</p>
              <span className="kd-tag" style={{ background: "var(--kd-butter)" }}>
                Collecting
              </span>
            </div>
            <p className="kd-t14 mt-1" style={{ color: "var(--kd-ink-muted)" }}>
              8 in the gift · 2 waiting
            </p>
            <button type="button" className="kd-btn kd-btn-ghost mt-2 -ml-3">
              Open the gift <ChevronRight className="size-4" strokeWidth={1.5} />
            </button>
          </div>
        </div>
      </div>

      <div className="kd-card space-y-4 p-6">
        <p className="kd-t14 font-medium">Empty state</p>
        <div className="grid place-items-center rounded-[16px] p-6 text-center" style={{ boxShadow: "inset 0 0 0 1px var(--kd-line)" }}>
          <Bo pose="idle" size={72} title="Bo" />
          <p className="kd-d22 mt-2">No gifts yet</p>
          <p className="kd-t14 mt-1" style={{ color: "var(--kd-ink-muted)" }}>
            Pick a theme and share one link. Friends do the rest.
          </p>
          <button type="button" className="kd-btn kd-btn-primary mt-4">
            Make a gift
          </button>
        </div>
        <p className="kd-t14 font-medium">Skeletons</p>
        <div className="space-y-2">
          <div className="kd-skel h-24" />
          <div className="kd-skel h-4 w-2/3" />
          <div className="kd-skel h-4 w-1/2" />
        </div>
      </div>

      {modal ? (
        <div className="fixed inset-0 z-50 grid place-items-center p-4" style={{ background: "rgb(43 37 34 / .35)" }} onClick={() => setModal(false)}>
          <div role="dialog" aria-modal="true" aria-label="Send it to Ana?" className="kd-card kd-lift w-full max-w-md p-6" style={{ borderRadius: 28 }} onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between gap-3">
              <p className="kd-d28">Send it to Ana?</p>
              <button type="button" className="kd-btn kd-btn-ghost -mt-2 -mr-3 px-3" aria-label="Close" onClick={() => setModal(false)}>
                <X className="size-4" strokeWidth={1.5} />
              </button>
            </div>
            <p className="kd-t16 mt-2" style={{ color: "var(--kd-ink-muted)" }}>
              8 friends wrote something. Once it's sent, Ana gets one link to open it all.
            </p>
            <div className="mt-6 flex justify-end gap-2">
              <button type="button" className="kd-btn kd-btn-ghost" onClick={() => setModal(false)}>
                Not yet
              </button>
              <button type="button" className="kd-btn kd-btn-primary" onClick={() => setModal(false)}>
                Send it
              </button>
            </div>
          </div>
        </div>
      ) : null}
      {sheet ? (
        <div className="fixed inset-0 z-50 flex items-end" style={{ background: "rgb(43 37 34 / .25)" }} onClick={() => setSheet(false)}>
          <div role="dialog" aria-modal="true" aria-label="Look" className="kd-lift w-full rounded-t-[28px] p-5" style={{ background: "var(--kd-surface)", height: "45dvh" }} onClick={(e) => e.stopPropagation()}>
            <div className="mx-auto h-1.5 w-12 rounded-full" style={{ background: "#D9D1C7" }} />
            <p className="kd-d22 mt-4">Look</p>
            <p className="kd-t14 mt-1" style={{ color: "var(--kd-ink-muted)" }}>
              Sheets open at 45% so the preview stays in view. Drag the handle for more.
            </p>
          </div>
        </div>
      ) : null}
    </div>
  );
}

/* ---------- the hero mock ---------- */

function HeroMock({ full = false }: { full?: boolean }) {
  const theme = useMemo(() => ENGINE_THEMES.find((t) => t.id === "care-package") ?? ENGINE_THEMES[0]!, []);
  const [loop, setLoop] = useState(0);
  const [peek, setPeek] = useState(false);
  useEffect(() => {
    if (!peek) return;
    const t = window.setTimeout(() => {
      setPeek(false);
      setLoop((n) => n + 1);
    }, 2600);
    return () => window.clearTimeout(t);
  }, [peek]);
  return (
    <div className={`kd kd-grain ${full ? "min-h-dvh" : ""}`}>
      <div className={`mx-auto flex max-w-6xl flex-col px-4 sm:px-8 ${full ? "min-h-dvh" : ""}`}>
        <header className="flex items-center justify-between py-4">
          <Lockup size={28} />
          <nav className="kd-t14 flex items-center gap-1 sm:gap-2">
            <span className="hidden sm:contents">
              <a className="kd-btn kd-btn-ghost min-h-9 px-3">Themes</a>
              <a className="kd-btn kd-btn-ghost min-h-9 px-3">Plans</a>
            </span>
            <a className="kd-btn kd-btn-ghost min-h-9 px-3 whitespace-nowrap">Sign in</a>
          </nav>
        </header>
        <div className="grid flex-1 items-center gap-6 pb-6 lg:grid-cols-[1.05fr_.95fr] lg:gap-10 lg:pb-10">
          <div className="pt-2 lg:pt-0">
            <h1 className="kd-d64 max-w-[14ch]">
              One gift from <em className="kd-warm">everyone</em> who loves them.
            </h1>
            <p className="kd-t18 mt-4 max-w-[40ch]" style={{ color: "var(--kd-ink-muted)" }}>
              Friends add letters, photos and voice notes through one link. They open one finished gift.
            </p>
            <div className="mt-6 flex flex-wrap items-center gap-4">
              <a className="kd-btn kd-btn-primary">
                <Gift className="size-4" strokeWidth={1.5} /> Make a gift
              </a>
              <a className="kd-t16 font-medium underline decoration-1 underline-offset-4" style={{ color: "var(--kd-ink)" }}>
                See an example
              </a>
            </div>
          </div>
          <div className="flex justify-center lg:justify-end">
           <div className="relative">
            <div
              className={`relative overflow-hidden rounded-[34px] border-[6px] border-[#1f1a18] ${full ? "h-[clamp(320px,calc(100svh-410px),520px)] lg:h-[clamp(420px,calc(100svh-120px),640px)]" : "h-[min(560px,60svh)]"}`}
              style={{ aspectRatio: "9 / 18.5", boxShadow: "var(--kd-shadow-lift)", background: theme.palette.background }}
              aria-label="A gift opening"
            >
              {/* The gift peek waits underneath, so the opening reveals it through the object. */}
              <div className="absolute inset-0 grid place-items-center p-6 text-center" style={{ background: theme.palette.background, color: theme.palette.ink }}>
                <div>
                  <p className="kd-t12" style={{ opacity: 0.7 }}>
                    From all of us
                  </p>
                  <p className="kd-d28 mt-1">For Ana</p>
                  <p className="kd-t14 mt-3">“Thinking of you, always.”</p>
                </div>
              </div>
              {peek ? null : (
                <div className="absolute inset-0">
                  <EngineStage
                    key={loop}
                    theme={theme}
                    slots={SAMPLE_SLOTS}
                    greeting="For Ana, from all of us"
                    contained
                    interactive={false}
                    autoplay
                    contributors={["Jo", "Mika", "Sam"]}
                    onOpen={() => setPeek(true)}
                  />
                </div>
              )}
            </div>
            {/* Bo waits beside the phone, never on it. */}
            <div className="pointer-events-none absolute bottom-0 -left-20 hidden sm:block">
              <Bo pose="idle" size={64} title="Bo" />
            </div>
           </div>
          </div>
        </div>
      </div>
    </div>
  );
}
