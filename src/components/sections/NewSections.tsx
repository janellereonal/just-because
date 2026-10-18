/**
 * The newer sections, drawn in the theme's own materials: open-when
 * envelopes, a time capsule, award rosettes, a playable quiz, a memory map,
 * a coupon book, video messages and a doodle guestbook. Used by the
 * scrapbook, and (video and quiz only) under the tile formats.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Lock, MapPin, Play } from "lucide-react";
import type { ThemeKind } from "@/lib/themeKind";
import type { ModuleType, ViewContribution } from "@/lib/gift";
import { SECTION_COPY } from "@/copy/strings";
import { capsuleLocked, hash01, tallySuperlatives, type NewSectionType } from "@/lib/sections";
import { describeWait, formatDay, formatMomentWithYear, momentOf, splitWait } from "@/lib/time";
import { designFor } from "@/themes/_shared/design";
import { burstSet } from "@/themes/_shared/Sprinkles";
import type { IconSet } from "@/themes/_shared/iconSets";
import { SPRING } from "@/themes/_shared/stage";
import { useMediaUrl } from "@/lib/giftPieces";
import { buzz, chime } from "@/lib/play";

/* ---------- materials ---------- */

type Material = { paper: string; ink: string; accent: string; accent2: string; dark: boolean };

export function sectionMaterial(kind: ThemeKind): Material {
  const d = designFor(kind).palette;
  switch (kind) {
    case "valentine":
      return {
        paper: "#FFFDF9",
        ink: "#3A1A20",
        accent: d.oxblood!,
        accent2: d.rose!,
        dark: false,
      };
    case "anniversary":
      return {
        paper: "#F7EEDC",
        ink: "#2A1B14",
        accent: d.plum!,
        accent2: d.champagne!,
        dark: false,
      };
    case "birthday":
      return {
        paper: "#FFF8E1",
        ink: "#1F2A6B",
        accent: d.cobalt!,
        accent2: d.bubblegum!,
        dark: false,
      };
    case "wedding":
    case "bridal":
      return { paper: "#FFFEFA", ink: "#3A3A33", accent: "#6F8B62", accent2: d.gold!, dark: false };
    case "baby":
      return {
        paper: "#FFFFFF",
        ink: "#3D4660",
        accent: "#6E8FC9",
        accent2: d.butter!,
        dark: false,
      };
    case "christmas":
      return {
        paper: "#F3E7D3",
        ink: "#2E2418",
        accent: d.cranberry!,
        accent2: d.pine!,
        dark: false,
      };
    case "newyear":
      return { paper: d.navy!, ink: "#F3EEDF", accent: d.gold!, accent2: d.violet!, dark: true };
    case "voyage":
      return { paper: d.cream!, ink: d.ink!, accent: d.orange!, accent2: d.sky!, dark: false };
    case "pets":
      return {
        paper: "#FFF6EA",
        ink: d.ink!,
        accent: d.terracotta!,
        accent2: d.tennis!,
        dark: false,
      };
    case "handwritten":
      return { paper: d.paper!, ink: d.ink!, accent: d.rose!, accent2: d.kraft!, dark: false };
    case "game":
      return { paper: d.cream!, ink: d.navy!, accent: d.cranberry!, accent2: d.mint!, dark: false };
    case "pixel":
      return { paper: d.night!, ink: d.snow!, accent: d.mint!, accent2: d.bubblegum!, dark: true };
    default:
      return {
        paper: "#FFFDF9",
        ink: "#2B2522",
        accent: "#B5623E",
        accent2: "#E9C9B6",
        dark: false,
      };
  }
}

type Common = {
  kind: ThemeKind;
  items: ViewContribution[];
  icons: IconSet;
  hostRef: React.RefObject<HTMLDivElement | null>;
  sample: boolean;
  recipient: string;
};

const display = { fontFamily: "var(--jb-display, 'Fraunces', serif)" };
const tiltOf = (id: string, a = 2.4) => (hash01(id) - 0.5) * a;

function burstAt(e: { clientX: number; clientY: number }, p: Common, m: Material, count = 12) {
  burstSet(p.hostRef.current, e.clientX, e.clientY, p.icons, {
    colors: [m.accent, m.accent2, "#FFFFFF"],
    count,
    spread: 0.8,
    up: true,
    gravity: 0.6,
  });
}

function sampleRow(
  type: ModuleType,
  i: number,
  author: string,
  text: string | null,
  data: Record<string, unknown>,
  media: string | null = null,
): ViewContribution {
  return {
    id: `sample-${type}-${i}`,
    site_id: "sample",
    module_type: type,
    author_name: author,
    text_content: text,
    media_url: media,
    external_link: null,
    status: "approved",
    ornament_key: null,
    visibility: "public",
    data,
    created_at: "",
  };
}

function samplesFor(type: NewSectionType, name: string): ViewContribution[] {
  const soon = new Date(Date.now() + 200 * 86400000).toISOString();
  switch (type) {
    case "openwhen":
      return [
        sampleRow(type, 0, "Sam", `Breathe. You've done harder things than this, ${name}.`, {
          when: "you're having a bad day",
        }),
        sampleRow(
          type,
          1,
          "Alex",
          "Remember the night we got lost and found the best noodles in town?",
          { when: "you need a laugh" },
        ),
      ];
    case "capsule":
      return [
        sampleRow(type, 0, "Bea", null, { unlock_at: soon, locked: true }),
        sampleRow(type, 1, "Jo", "If you're reading this, it worked. Proud of you.", {
          unlock_at: new Date(Date.now() - 86400000).toISOString(),
        }),
      ];
    case "superlatives":
      return [
        sampleRow(type, 0, "Mika", "Every single time.", {
          award: "Most likely to make everyone cry at a toast",
        }),
        sampleRow(type, 1, "Lia", null, { award: "Most likely to make everyone cry at a toast" }),
        sampleRow(type, 2, "Theo", null, { award: "Best playlist" }),
      ];
    case "quiz":
      return [
        sampleRow(type, 0, "Noor", null, {
          question: "Where did we first meet?",
          answer: "In the library",
          wrong: ["At a concert", "On a train"],
        }),
        sampleRow(type, 1, "Sam", null, {
          question: "What's my go-to karaoke song?",
          answer: "Dancing Queen",
          wrong: ["Wonderwall", "Bohemian Rhapsody"],
        }),
      ];
    case "map":
      return [
        sampleRow(type, 0, "Alex", "Rain all week and we didn't care.", { place: "Lisbon" }),
        sampleRow(type, 1, "Jo", "The sunrise hike.", { place: "Mount Batur" }),
        sampleRow(type, 2, "Bea", "Where it all started.", { place: "Our old flat" }),
      ];
    case "coupons":
      return [
        sampleRow(type, 0, "Mika", null, {
          title: "One home-cooked dinner",
          fine_print: "Any weeknight. Dessert included.",
        }),
        sampleRow(type, 1, "Lia", null, {
          title: "A movie night, you pick",
          fine_print: "Snacks on me.",
        }),
      ];
    case "video":
      return [sampleRow(type, 0, "Theo", "Happy birthday from all of us at the office", {})];
    case "doodle":
      return [
        sampleRow(type, 0, "Noor", "a portrait (sorry)", {}),
        sampleRow(type, 1, "Sam", "us at the beach", {}),
      ];
  }
}

function SectionTitle({
  children,
  accent,
  font,
  extra,
}: {
  children: React.ReactNode;
  accent: string;
  font: string;
  extra?: Record<string, unknown> | undefined;
}) {
  const { className: extraClass, ...rest } = (extra ?? {}) as { className?: string };
  return (
    <h2
      {...rest}
      className={`sb-title text-[1.75rem] leading-tight font-semibold ${extraClass ?? ""}`}
      style={{ fontFamily: font, color: accent }}
    >
      {children}
    </h2>
  );
}

/* ---------- open when ---------- */

function OpenWhen(p: Common) {
  const m = sectionMaterial(p.kind);
  const [open, setOpen] = useState<string | null>(null);
  const reduce = useReducedMotion();
  return (
    <div className="mt-6 grid gap-5 @xl:grid-cols-2">
      {p.items.map((item) => {
        const when = String((item.data as { when?: string } | null)?.when ?? "");
        const isOpen = open === item.id;
        return (
          <motion.button
            key={item.id}
            type="button"
            layout
            onClick={(e) => {
              if (!isOpen) {
                burstAt(e, p, m, 10);
                chime("pop");
                buzz(10);
              }
              setOpen(isOpen ? null : item.id);
            }}
            aria-expanded={isOpen}
            className="relative w-full text-left [perspective:900px]"
            style={{ rotate: `${tiltOf(item.id)}deg` }}
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.4 }}
            transition={SPRING.soft}
          >
            <div
              className="relative overflow-hidden rounded-[6px] p-5 pt-14"
              style={{
                background: m.paper,
                color: m.ink,
                boxShadow: "0 18px 30px -22px rgba(0,0,0,.45), inset 0 0 0 1px rgba(0,0,0,.05)",
              }}
            >
              {/* The flap */}
              <motion.span
                aria-hidden="true"
                className="absolute inset-x-0 top-0 h-14 origin-top"
                style={{
                  background: `linear-gradient(180deg, ${m.dark ? "#ffffff14" : "#00000008"}, ${m.dark ? "#ffffff08" : "#00000012"})`,
                  clipPath: "polygon(0 0, 100% 0, 50% 100%)",
                }}
                animate={{ rotateX: isOpen && !reduce ? 180 : 0, opacity: isOpen ? 0.4 : 1 }}
                transition={SPRING.heavy}
              />
              <span
                aria-hidden="true"
                className="absolute top-9 left-1/2 grid size-8 -translate-x-1/2 place-items-center rounded-full"
                style={{
                  background: m.accent,
                  boxShadow: "0 3px 6px -2px rgba(0,0,0,.4)",
                  opacity: isOpen ? 0 : 1,
                  transition: "opacity .25s",
                }}
              />
              <p className="text-[11px] tracking-[0.2em] uppercase opacity-60">
                {SECTION_COPY.openwhen.whenLabel}
              </p>
              <p className="mt-1 text-[1.35rem] leading-tight" style={display}>
                {when}
              </p>
              <AnimatePresence initial={false}>
                {isOpen ? (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={SPRING.soft}
                    className="overflow-hidden"
                  >
                    <p className="mt-4 leading-relaxed whitespace-pre-line">{item.text_content}</p>
                    <p className="sb-hand mt-3 text-lg" style={{ color: m.accent }}>
                      {item.author_name}
                    </p>
                  </motion.div>
                ) : (
                  <p className="mt-3 text-xs opacity-60">
                    From {item.author_name} · {SECTION_COPY.openwhen.sealed}
                  </p>
                )}
              </AnimatePresence>
            </div>
          </motion.button>
        );
      })}
    </div>
  );
}

/* ---------- time capsule ---------- */

function useNow(every = 1000) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = window.setInterval(() => setNow(Date.now()), every);
    return () => window.clearInterval(t);
  }, [every]);
  return now;
}

function Capsule(p: Common) {
  const m = sectionMaterial(p.kind);
  const now = useNow(1000);
  return (
    <div className="mt-6 grid gap-4 @xl:grid-cols-2">
      {p.items.map((item) => {
        const at = String((item.data as { unlock_at?: string } | null)?.unlock_at ?? "");
        const locked =
          !!(item.data as { locked?: boolean } | null)?.locked || capsuleLocked(item.data, now);
        return locked ? (
          <SealedCapsule key={item.id} item={item} at={at} now={now} m={m} />
        ) : (
          <OpenCapsule key={item.id} item={item} at={at} m={m} />
        );
      })}
    </div>
  );
}

function SealedCapsule({
  item,
  at,
  now,
  m,
}: {
  item: ViewContribution;
  at: string;
  now: number;
  m: Material;
}) {
  const target = momentOf(at);
  const wait = describeWait(target, now);
  const { days, hours: hrs, minutes: mins } = splitWait(target, now);
  return (
    <motion.article
      initial={{ opacity: 0, scale: 0.96 }}
      whileInView={{ opacity: 1, scale: 1 }}
      viewport={{ once: true }}
      transition={SPRING.soft}
      className="relative overflow-hidden rounded-[22px] p-5"
      style={{
        background: `repeating-linear-gradient(135deg, ${m.paper} 0 14px, ${m.dark ? "#ffffff08" : "#0000000a"} 14px 16px)`,
        color: m.ink,
        boxShadow: `inset 0 0 0 2px ${m.accent}33, 0 16px 28px -22px rgba(0,0,0,.45)`,
      }}
    >
      <div className="flex items-center gap-3">
        <motion.span
          className="grid size-11 place-items-center rounded-full"
          style={{ background: m.accent, color: m.dark ? m.paper : "#fff" }}
          animate={{ rotate: [0, -8, 8, 0] }}
          transition={{ duration: 0.9, repeat: Infinity, repeatDelay: 3.5, ease: [0.4, 0, 0.2, 1] }}
        >
          <Lock className="size-5" aria-hidden="true" />
        </motion.span>
        <div className="min-w-0">
          <p className="text-[11px] tracking-[0.2em] uppercase opacity-60">
            {SECTION_COPY.capsule.countdownLabel}
          </p>
          <p className="truncate text-sm">From {item.author_name}</p>
        </div>
      </div>
      <p
        className="mt-4 text-[1.4rem] leading-tight tabular-nums"
        style={display}
        suppressHydrationWarning
      >
        {wait ? (
          <span className="block first-letter:uppercase">{wait}</span>
        ) : (
          <>
            {days > 0 ? `${days}d ` : ""}
            {String(hrs).padStart(2, "0")}h {String(mins).padStart(2, "0")}m
          </>
        )}
      </p>
      <p className="mt-1 text-xs opacity-70" suppressHydrationWarning>
        {SECTION_COPY.capsule.lockedLine} {formatMomentWithYear(at, now)}
      </p>
    </motion.article>
  );
}

function OpenCapsule({ item, at, m }: { item: ViewContribution; at: string; m: Material }) {
  const media = useMediaUrl(item.media_url);
  return (
    <motion.article
      initial={{ opacity: 0, y: 30, rotate: -2 }}
      whileInView={{ opacity: 1, y: 0, rotate: 0 }}
      viewport={{ once: true }}
      transition={SPRING.wobbly}
      className="relative rounded-[22px] p-5"
      style={{ background: m.paper, color: m.ink, boxShadow: "0 16px 28px -22px rgba(0,0,0,.45)" }}
    >
      <span
        className="absolute -top-3 right-4 rounded-full px-2.5 py-1 text-[10px] font-semibold tracking-[0.16em] uppercase"
        style={{ background: m.accent2, color: m.dark ? m.paper : m.ink }}
        suppressHydrationWarning
      >
        {SECTION_COPY.capsule.openedLine} {at ? formatDay(at) : ""}
      </span>
      {media ? (
        <img src={media} alt="" className="mb-3 aspect-[4/3] w-full rounded-xl object-cover" />
      ) : null}
      <p className="leading-relaxed whitespace-pre-line">{item.text_content}</p>
      <p className="sb-hand mt-3 text-lg" style={{ color: m.accent }}>
        {item.author_name}
      </p>
    </motion.article>
  );
}

/* ---------- superlatives ---------- */

function Superlatives(p: Common) {
  const m = sectionMaterial(p.kind);
  const awards = useMemo(() => tallySuperlatives(p.items), [p.items]);
  return (
    <ol className="mt-6 grid gap-4 @xl:grid-cols-2">
      {awards.map((a, i) => (
        <motion.li
          key={a.award}
          initial={{ opacity: 0, y: 30, scale: 0.9 }}
          whileInView={{ opacity: 1, y: 0, scale: 1 }}
          viewport={{ once: true }}
          transition={{ ...SPRING.wobbly, delay: (i % 4) * 0.06 }}
          className="relative flex gap-4 rounded-[22px] p-5"
          style={{
            background: m.paper,
            color: m.ink,
            boxShadow: "0 16px 28px -22px rgba(0,0,0,.45)",
          }}
        >
          <Rosette rank={i + 1} m={m} />
          <div className="min-w-0">
            <p className="text-[1.25rem] leading-tight" style={display}>
              {a.award}
            </p>
            <p className="mt-1 text-xs opacity-70">
              {SECTION_COPY.superlatives.votes(a.voters.length)} · {a.voters.slice(0, 4).join(", ")}
              {a.voters.length > 4 ? "…" : ""}
            </p>
            {a.reasons.slice(0, 2).map((r) => (
              <p key={r.who} className="mt-2 text-sm leading-snug opacity-90">
                “{r.text}” <span className="opacity-60">· {r.who}</span>
              </p>
            ))}
          </div>
        </motion.li>
      ))}
    </ol>
  );
}

function Rosette({ rank, m }: { rank: number; m: Material }) {
  return (
    <span
      className="relative mt-1 grid size-14 shrink-0 place-items-center"
      aria-label={`Number ${rank}`}
    >
      <svg viewBox="0 0 56 72" className="absolute -top-1 left-0 h-[72px] w-14" aria-hidden="true">
        <path d="M18 40 L12 70 L22 62 L28 70 L28 40Z" fill={m.accent2} />
        <path d="M38 40 L44 70 L34 62 L28 70 L28 40Z" fill={m.accent} />
        {Array.from({ length: 12 }, (_, i) => (
          <circle
            key={i}
            cx={28 + Math.cos((i / 12) * Math.PI * 2) * 22}
            cy={28 + Math.sin((i / 12) * Math.PI * 2) * 22}
            r="7"
            fill={rank === 1 ? m.accent : m.accent2}
          />
        ))}
        <circle cx="28" cy="28" r="20" fill={rank === 1 ? m.accent : m.accent2} />
        <circle cx="28" cy="28" r="15" fill={m.paper} />
      </svg>
      <span className="relative -mt-2 text-lg font-bold" style={{ ...display, color: m.ink }}>
        {rank}
      </span>
    </span>
  );
}

/* ---------- quiz ---------- */

function Quiz(p: Common) {
  const m = sectionMaterial(p.kind);
  const qs = useMemo(
    () =>
      p.items
        .map((it) => {
          const d = (it.data ?? {}) as { question?: string; answer?: string; wrong?: string[] };
          if (!d.question || !d.answer) return null;
          const options = [d.answer, ...(d.wrong ?? [])].sort(
            (a, b) => hash01(it.id + a) - hash01(it.id + b),
          );
          return { id: it.id, question: d.question, answer: d.answer, options, by: it.author_name };
        })
        .filter((q): q is NonNullable<typeof q> => !!q),
    [p.items],
  );
  const [i, setI] = useState(0);
  const [score, setScore] = useState(0);
  const [picked, setPicked] = useState<string | null>(null);
  const [shake, setShake] = useState(0);
  const done = i >= qs.length;
  const q = qs[i];
  if (!qs.length) return null;

  function choose(opt: string, e: React.MouseEvent) {
    if (picked || !q) return;
    setPicked(opt);
    if (opt === q.answer) {
      setScore((s) => s + 1);
      burstAt(e, p, m, 14);
      chime("sparkle");
      buzz([8, 30, 8]);
    } else {
      setShake((n) => n + 1);
      buzz(30);
    }
    window.setTimeout(() => {
      setPicked(null);
      setI((n) => n + 1);
    }, 1300);
  }

  return (
    <div
      className="mt-6 overflow-hidden rounded-[26px] p-5 sm:p-7"
      style={{ background: m.paper, color: m.ink, boxShadow: "0 18px 32px -24px rgba(0,0,0,.5)" }}
    >
      <div className="flex items-center justify-between text-xs opacity-70">
        <span>{done ? SECTION_COPY.quiz.finished : `${i + 1} / ${qs.length}`}</span>
        <span className="tabular-nums">{SECTION_COPY.quiz.score(score, qs.length)}</span>
      </div>
      <AnimatePresence mode="wait">
        {done ? (
          <motion.div
            key="done"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={SPRING.wobbly}
            className="py-6 text-center"
          >
            <p className="text-[2.4rem] leading-none" style={{ ...display, color: m.accent }}>
              {score}/{qs.length}
            </p>
            <button
              type="button"
              onClick={() => {
                setI(0);
                setScore(0);
              }}
              className="mt-5 rounded-full px-5 py-2.5 text-sm font-medium"
              style={{ background: m.accent, color: m.dark ? m.paper : "#fff" }}
            >
              {SECTION_COPY.quiz.again}
            </button>
          </motion.div>
        ) : q ? (
          <motion.div
            key={q.id}
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -40 }}
            transition={SPRING.soft}
          >
            <p className="mt-3 text-[1.45rem] leading-tight" style={display}>
              {q.question}
            </p>
            <p className="mt-1 text-xs opacity-60">{SECTION_COPY.quiz.askedBy(q.by)}</p>
            <motion.div
              key={shake}
              animate={shake ? { x: [0, -8, 8, -5, 5, 0] } : {}}
              transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
              className="mt-4 grid gap-2"
            >
              {q.options.map((opt) => {
                const right = picked && opt === q.answer;
                const wrong = picked === opt && opt !== q.answer;
                return (
                  <motion.button
                    key={opt}
                    type="button"
                    whileTap={{ scale: 0.97 }}
                    onClick={(e) => choose(opt, e)}
                    disabled={!!picked}
                    className="rounded-2xl px-4 py-3 text-left text-[15px] font-medium transition-colors"
                    style={{
                      background: right
                        ? m.accent
                        : wrong
                          ? `${m.ink}22`
                          : m.dark
                            ? "#ffffff10"
                            : "#00000008",
                      color: right ? (m.dark ? m.paper : "#fff") : m.ink,
                      boxShadow: `inset 0 0 0 1px ${m.ink}22`,
                    }}
                  >
                    {opt}
                  </motion.button>
                );
              })}
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

/* ---------- memory map ---------- */

function MemoryMap(p: Common) {
  const m = sectionMaterial(p.kind);
  const [active, setActive] = useState<string | null>(p.items[0]?.id ?? null);
  const current = p.items.find((x) => x.id === active) ?? null;
  const pins = p.items.map((it) => {
    const place = String((it.data as { place?: string } | null)?.place ?? "");
    // Spread along the map left to right, with a little wander up and down.
    const n = p.items.length;
    const k = p.items.indexOf(it);
    const x = n > 1 ? 16 + (k * 68) / (n - 1) + (hash01(place, 1) - 0.5) * 6 : 50;
    const y = 34 + hash01(place, 2) * 44;
    return { it, place, x, y };
  });
  return (
    <div className="mt-6">
      <div
        className="relative aspect-[4/3] overflow-hidden rounded-[22px]"
        style={{ background: m.paper, boxShadow: "0 18px 32px -24px rgba(0,0,0,.5)" }}
      >
        <svg viewBox="0 0 400 300" className="absolute inset-0 size-full" aria-hidden="true" preserveAspectRatio="none">
          <rect width="400" height="300" fill={m.dark ? "#ffffff08" : `${m.accent2}22`} />
          {Array.from({ length: 9 }, (_, k) => (
            <path key={k} d={`M0 ${20 + k * 34} q 50 -6 100 0 t 100 0 t 100 0 t 100 0`} fill="none" stroke={m.ink} strokeOpacity=".05" strokeWidth="1" />
          ))}
          {/* Land: soft, hand-cut shapes */}
          <path d="M-10 70C30 40 90 46 120 70s40 70 10 96-80 20-110 50-30 40-30 40V70z" fill={m.paper} stroke={m.ink} strokeOpacity=".12" />
          <path d="M150 30c40-20 110-14 140 10s20 60 60 70 70 40 50 80-80 30-110 60-90 50-120 20-10-60-40-90-30-120 20-150z" fill={m.paper} stroke={m.ink} strokeOpacity=".12" />
          <path d="M40 230c20-14 60-10 70 10s-10 40-40 44-50-30-30-54z" fill={m.paper} stroke={m.ink} strokeOpacity=".12" />
          {Array.from({ length: 26 }, (_, k) => (
            <circle key={k} cx={20 + hash01("t" + k, 3) * 360} cy={20 + hash01("t" + k, 4) * 260} r="1.6" fill={m.ink} opacity=".1" />
          ))}
          {/* The route through every pin, drawn as you arrive */}
          {pins.length > 1 ? (
            <motion.path
              d={pins.map(({ x, y }, k) => `${k ? "L" : "M"}${x * 4} ${y * 3}`).join(" ")}
              fill="none"
              stroke={m.accent}
              strokeWidth="2.2"
              strokeDasharray="1 7"
              strokeLinecap="round"
              initial={{ pathLength: 0 }}
              whileInView={{ pathLength: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 1.6, ease: [0.4, 0, 0.2, 1] }}
            />
          ) : null}
          {/* Compass */}
          <g transform="translate(360 262)" opacity=".55">
            <circle r="16" fill="none" stroke={m.ink} strokeOpacity=".4" />
            <path d="M0-14l4 14-4 14-4-14z" fill={m.accent} />
            <text y="-19" textAnchor="middle" fontSize="8" fill={m.ink} fontFamily="var(--jb-text, sans-serif)">N</text>
          </g>
        </svg>
        {pins.map(({ it, place, x, y }, k) => (
          <motion.button
            key={it.id}
            type="button"
            aria-label={`${place}, from ${it.author_name}`}
            onClick={(e) => {
              setActive(it.id);
              burstAt(e, p, m, 6);
              buzz(8);
            }}
            className="absolute flex -translate-x-1/2 -translate-y-full flex-col items-center"
            style={{ left: `${x}%`, top: `${y}%`, zIndex: active === it.id ? 3 : 2 }}
            initial={{ y: -40, opacity: 0 }}
            whileInView={{ y: 0, opacity: 1 }}
            viewport={{ once: true }}
            transition={{ ...SPRING.wobbly, delay: 0.3 + k * 0.18 }}
            whileHover={{ scale: 1.1 }}
          >
            <span
              className="mb-0.5 max-w-[120px] truncate rounded-full px-2 py-0.5 text-[10px] font-semibold shadow-sm"
              // Pins near an edge lean their label inwards so it never gets cut off on narrow screens.
              style={{ transform: `translateX(${(50 - x) * 0.8}%)`, background: active === it.id ? m.accent : m.paper, color: active === it.id ? (m.dark ? m.paper : "#fff") : m.ink }}
            >
              {place}
            </span>
            <MapPin className="size-7 drop-shadow" style={{ color: active === it.id ? m.accent : m.ink, fill: active === it.id ? m.accent2 : m.paper }} aria-hidden="true" />
          </motion.button>
        ))}
      </div>
      <AnimatePresence mode="wait">
        {current ? (
          <motion.div
            key={current.id}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={SPRING.soft}
            className="mt-4 rounded-[18px] p-5"
            style={{
              background: m.paper,
              color: m.ink,
              boxShadow: "0 12px 24px -20px rgba(0,0,0,.45)",
            }}
          >
            <p className="text-[1.3rem] leading-tight" style={display}>
              {String((current.data as { place?: string } | null)?.place ?? "")}
            </p>
            <p className="mt-2 leading-relaxed whitespace-pre-line">{current.text_content}</p>
            <p className="sb-hand mt-2 text-lg" style={{ color: m.accent }}>
              {current.author_name}
            </p>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

/* ---------- coupons ---------- */

function Coupons(p: Common & { storeKey: string }) {
  const m = sectionMaterial(p.kind);
  const [used, setUsed] = useState<string[]>([]);
  useEffect(() => {
    try {
      setUsed(JSON.parse(localStorage.getItem(p.storeKey) ?? "[]") as string[]);
    } catch {
      /* fine */
    }
  }, [p.storeKey]);
  function redeem(id: string, e: React.MouseEvent) {
    const next = [...new Set([...used, id])];
    setUsed(next);
    burstAt(e, p, m, 12);
    chime("pop");
    buzz([10, 30, 10]);
    try {
      localStorage.setItem(p.storeKey, JSON.stringify(next));
    } catch {
      /* private mode */
    }
  }
  return (
    <div className="mt-6 grid gap-4 @xl:grid-cols-2">
      {p.items.map((it) => {
        const d = (it.data ?? {}) as { title?: string; fine_print?: string };
        const done = used.includes(it.id);
        return (
          <motion.div
            key={it.id}
            className="relative flex overflow-visible"
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={SPRING.soft}
            style={{ rotate: `${tiltOf(it.id, 2)}deg`, color: m.ink }}
          >
            <div
              className="relative flex-1 rounded-l-[14px] p-4"
              style={{ background: m.paper, boxShadow: "0 14px 24px -20px rgba(0,0,0,.5)" }}
            >
              <p className="text-[10px] tracking-[0.2em] uppercase opacity-60">Good for</p>
              <p className="mt-1 text-[1.2rem] leading-tight" style={display}>
                {d.title}
              </p>
              {d.fine_print ? <p className="mt-1 text-xs opacity-70">{d.fine_print}</p> : null}
              <p className="mt-2 text-xs opacity-60">From {it.author_name}</p>
              {done ? (
                <motion.span
                  initial={{ scale: 1.8, opacity: 0, rotate: -20 }}
                  animate={{ scale: 1, opacity: 0.85, rotate: -12 }}
                  transition={{ type: "spring", stiffness: 600, damping: 18 }}
                  className="absolute top-3 right-3 rounded-md px-2 py-1 text-[11px] font-bold tracking-[0.18em] uppercase"
                  style={{ boxShadow: `inset 0 0 0 2px ${m.accent}`, color: m.accent }}
                >
                  {SECTION_COPY.coupons.redeemed}
                </motion.span>
              ) : null}
            </div>
            <span
              aria-hidden="true"
              className="w-0 border-l-2 border-dashed"
              style={{ borderColor: `${m.ink}33` }}
            />
            <motion.button
              type="button"
              disabled={done}
              onClick={(e) => redeem(it.id, e)}
              className="grid w-20 shrink-0 place-items-center rounded-r-[14px] px-2 text-center text-[11px] leading-tight font-semibold"
              style={{
                background: m.accent,
                color: m.dark ? m.paper : "#fff",
                originX: 0,
                originY: 1,
              }}
              animate={done ? { rotate: 24, y: 30, opacity: 0 } : { rotate: 0, y: 0, opacity: 1 }}
              transition={SPRING.heavy}
            >
              {SECTION_COPY.coupons.redeem}
            </motion.button>
          </motion.div>
        );
      })}
    </div>
  );
}

/* ---------- video ---------- */

function VideoCard({ item, m }: { item: ViewContribution; m: Material }) {
  const url = useMediaUrl(item.media_url);
  const ref = useRef<HTMLVideoElement | null>(null);
  const [playing, setPlaying] = useState(false);
  return (
    <motion.figure
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={SPRING.soft}
      className="overflow-hidden rounded-[22px]"
      style={{ background: m.paper, color: m.ink, boxShadow: "0 16px 28px -22px rgba(0,0,0,.5)" }}
    >
      <div className="relative aspect-video bg-black">
        {url ? (
          <video
            ref={ref}
            src={url}
            controls={playing}
            playsInline
            preload="metadata"
            className="size-full object-contain"
            onPause={() => setPlaying(false)}
            onEnded={() => setPlaying(false)}
          />
        ) : (
          <div className="grid size-full place-items-center text-sm text-white/60">
            Video from {item.author_name}
          </div>
        )}
        {!playing && url ? (
          <button
            type="button"
            aria-label={`Play the video from ${item.author_name}`}
            onClick={() => {
              setPlaying(true);
              void ref.current?.play();
            }}
            className="absolute inset-0 grid place-items-center"
          >
            <motion.span
              whileHover={{ scale: 1.08 }}
              whileTap={{ scale: 0.94 }}
              className="grid size-16 place-items-center rounded-full"
              style={{ background: m.accent, color: "#fff" }}
            >
              <Play className="ml-1 size-7" aria-hidden="true" />
            </motion.span>
          </button>
        ) : null}
      </div>
      <figcaption className="px-4 py-3 text-sm">
        {item.text_content ? <span>{item.text_content} · </span> : null}
        <span className="opacity-70">{item.author_name}</span>
      </figcaption>
    </motion.figure>
  );
}

/* ---------- doodles ---------- */

function DoodleCard({ item, m, k }: { item: ViewContribution; m: Material; k: number }) {
  const url = useMediaUrl(item.media_url);
  return (
    <motion.figure
      initial={{ opacity: 0, rotate: 0, y: 20 }}
      whileInView={{ opacity: 1, rotate: tiltOf(item.id, 6), y: 0 }}
      viewport={{ once: true }}
      transition={{ ...SPRING.wobbly, delay: (k % 3) * 0.05 }}
      className="rounded-[6px] bg-white p-2 pb-3"
      style={{ boxShadow: "0 14px 24px -18px rgba(0,0,0,.45)", color: "#2B2522" }}
    >
      <div
        className="aspect-square overflow-hidden rounded-[3px]"
        style={{
          background: "repeating-linear-gradient(transparent 0 23px, #00000010 23px 24px), #FFFEFA",
        }}
      >
        {url ? (
          <img
            src={url}
            alt={`A drawing by ${item.author_name}`}
            className="size-full object-contain"
          />
        ) : (
          <SampleDoodle seed={item.id} color={m.accent} />
        )}
      </div>
      <figcaption className="mt-2 px-1 text-xs">
        {item.text_content ? <span>{item.text_content} · </span> : null}
        <span className="opacity-60">{item.author_name}</span>
      </figcaption>
    </motion.figure>
  );
}

function SampleDoodle({ seed, color }: { seed: string; color: string }) {
  const r = (n: number) => 20 + hash01(seed, n) * 60;
  return (
    <svg viewBox="0 0 100 100" className="size-full" aria-hidden="true">
      <path
        d={`M${r(1)} ${r(2)} C ${r(3)} ${r(4)}, ${r(5)} ${r(6)}, ${r(7)} ${r(8)} S ${r(9)} ${r(10)}, ${r(11)} ${r(12)}`}
        fill="none"
        stroke={color}
        strokeWidth="3"
        strokeLinecap="round"
      />
      <circle cx={r(13)} cy={r(14)} r="8" fill="none" stroke="#2B2522" strokeWidth="2.5" />
      <path
        d={`M${r(15)} ${r(16)} l8 8 m0 -8 l-8 8`}
        stroke="#2B2522"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

/* ---------- the block ---------- */

const ORDER: NewSectionType[] = [
  "openwhen",
  "superlatives",
  "quiz",
  "map",
  "coupons",
  "video",
  "doodle",
  "capsule",
];

export function NewSections({
  kind,
  enabled,
  contributions,
  icons,
  hostRef,
  sample,
  recipient,
  siteId,
  headingFont,
  accent,
  only,
  titles,
  titleProps,
}: {
  /** The organiser's own section titles, falling back to the defaults. */
  titles?: Partial<Record<NewSectionType, string>>;
  /** Click-to-edit wiring from the editor preview. */
  titleProps?: (type: NewSectionType) => Record<string, unknown>;
  kind: ThemeKind;
  enabled: Set<string>;
  contributions: ViewContribution[];
  icons: IconSet;
  hostRef: React.RefObject<HTMLDivElement | null>;
  sample: boolean;
  recipient: string;
  siteId: string;
  headingFont: string;
  accent: string;
  only?: NewSectionType[];
}) {
  const m = sectionMaterial(kind);
  return (
    <>
      {ORDER.filter((t) => enabled.has(t) && (!only || only.includes(t))).map((type) => {
        const real = contributions.filter((c) => c.module_type === type && !c.sealed);
        const items = real.length ? real : sample ? samplesFor(type, recipient || "you") : [];
        if (!items.length) return null;
        const common: Common = { kind, items, icons, hostRef, sample: !real.length, recipient };
        return (
          <section key={type} data-section={type} className="sb-section mt-16">
            <SectionTitle accent={accent} font={headingFont} extra={titleProps?.(type)}>
              {titles?.[type] || SECTION_COPY[type].title}
            </SectionTitle>
            {type === "openwhen" ? <OpenWhen {...common} /> : null}
            {type === "capsule" ? <Capsule {...common} /> : null}
            {type === "superlatives" ? <Superlatives {...common} /> : null}
            {type === "quiz" ? <Quiz {...common} /> : null}
            {type === "map" ? <MemoryMap {...common} /> : null}
            {type === "coupons" ? <Coupons {...common} storeKey={`jb-coupons-${siteId}`} /> : null}
            {type === "video" ? (
              <div className="mt-6 grid gap-4 @xl:grid-cols-2">
                {items.map((it) => (
                  <VideoCard key={it.id} item={it} m={m} />
                ))}
              </div>
            ) : null}
            {type === "doodle" ? (
              <div className="mt-6 grid grid-cols-2 gap-4 @xl:grid-cols-3">
                {items.map((it, k) => (
                  <DoodleCard key={it.id} item={it} m={m} k={k} />
                ))}
              </div>
            ) : null}
            {!real.length && sample ? (
              <p className="mt-3 text-xs italic opacity-50">
                A sample, so you can see how it looks.
              </p>
            ) : null}
          </section>
        );
      })}
    </>
  );
}
