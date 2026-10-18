import { useEffect, useRef, useState } from "react";
import { engineThemeForName } from "@/themes/engine/registry";
import type { EngineNote, ThemeOptions } from "@/themes/engine/define";
import type { SlotInput } from "@/themes/engine/slots";
import { Gift, Volume2, VolumeX } from "lucide-react";
import { SkinDecor, SkinParticles } from "@/components/SkinDecor";
import { Theme3D, type Theme3DHandle } from "@/components/Theme3D";
import type { ThemeKind } from "@/lib/themeKind";
import { backgroundCss, type BackgroundStyle } from "@/lib/gift";
import { readableInk, readableOn } from "@/lib/palettes";
import type { Palette } from "@/lib/themes";
import { TactileOpening, hasTactileOpening } from "@/themes/TactileOpening";
import type { CharacterSetting } from "@/themes/_shared/cast/types";
import type { IconSetSetting } from "@/themes/_shared/iconSets";
import { INTRO_COPY, type IntroSettings, type IntroSticker, type IntroStyle } from "@/lib/intro";
import {
  KIND_BURST,
  burst,
  buzz,
  chime,
  reducedMotion,
  useSound,
  type BurstShape,
} from "@/lib/play";

export { INTRO_COPY, introStyleForTheme, type IntroStyle } from "@/lib/intro";

const STYLE_KIND: Record<IntroStyle, ThemeKind> = {
  envelope: "valentine",
  giftbox: "birthday",
  boardingpass: "voyage",
  present: "christmas",
  paw: "pets",
  sparkler: "newyear",
  letter: "anniversary",
  invitation: "wedding",
};

/** What the main object is called in the tap hint. */
export const HERO_WORD: Record<ThemeKind, string> = {
  valentine: "heart",
  birthday: "cake",
  voyage: "globe",
  christmas: "tree",
  pets: "pup",
  newyear: "fireworks",
  anniversary: "rings",
  wedding: "cake",
  bridal: "teacup",
  baby: "mobile",
  handwritten: "note",
  game: "dice",
  pixel: "console",
  default: "gift",
};

/** Best-effort audio unlock so songs and voice notes can play after the reveal. */
function unlockAudio() {
  try {
    const Ctor =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return;
    const ctx = new Ctor();
    const source = ctx.createBufferSource();
    source.buffer = ctx.createBuffer(1, 1, 22050);
    source.connect(ctx.destination);
    source.start(0);
    void ctx.resume();
  } catch {
    /* audio unlock is a nicety, never a blocker */
  }
}

const introCss = `
@keyframes jb-write{from{clip-path:inset(0 100% 0 0)}to{clip-path:inset(0 0 0 0)}}
@keyframes jb-pencil{from{left:0%}to{left:100%}}
@keyframes jb-pop{0%{opacity:0;transform:scale(.8)}60%{opacity:1;transform:scale(1.05)}100%{transform:scale(1)}}
@keyframes jb-float{0%,100%{transform:translateY(0)}50%{transform:translateY(-10px) rotate(3deg)}}
@keyframes jb-jelly{0%{transform:scale(1,1)}20%{transform:scale(1.25,.78)}40%{transform:scale(.85,1.18)}60%{transform:scale(1.08,.94)}80%{transform:scale(.97,1.03)}100%{transform:scale(1,1)}}
@keyframes jb-hint{0%,100%{transform:translateY(0)}50%{transform:translateY(-3px)}}
@keyframes jb-ring{from{opacity:.7;transform:translate(-50%,-50%) scale(.2)}to{opacity:0;transform:translate(-50%,-50%) scale(2.6)}}
.jb-intro[data-paused] *{animation-play-state:paused!important}
@media (prefers-reduced-motion: reduce){.jb-intro *{animation:none!important}}
`;

let introStylesInjected = false;
function useIntroStyles() {
  useEffect(() => {
    if (introStylesInjected || typeof document === "undefined") return;
    const el = document.createElement("style");
    el.setAttribute("data-jb-intro", "");
    el.textContent = introCss;
    document.head.appendChild(el);
    introStylesInjected = true;
  }, []);
}

/** A sticker that floats, wobbles when tapped and can be dragged around. */
function Sticker({
  sticker,
  host,
  interactive,
  editable,
  onMove,
  colors,
}: {
  sticker: IntroSticker;
  host: React.RefObject<HTMLDivElement | null>;
  interactive: boolean;
  editable: boolean;
  onMove?: ((s: IntroSticker) => void) | undefined;
  colors: string[];
}) {
  const [pos, setPos] = useState({ x: sticker.x, y: sticker.y });
  const [jelly, setJelly] = useState(0);
  const drag = useRef<{ id: number; moved: boolean; sx: number; sy: number } | null>(null);
  useEffect(() => setPos({ x: sticker.x, y: sticker.y }), [sticker.x, sticker.y]);

  function toFrac(clientX: number, clientY: number) {
    const el = host.current;
    if (!el) return pos;
    const r = el.getBoundingClientRect();
    return {
      x: Math.min(0.95, Math.max(0.05, (clientX - r.left) / r.width)),
      y: Math.min(0.95, Math.max(0.05, (clientY - r.top) / r.height)),
    };
  }

  const live = interactive || editable;
  const box = `clamp(40px, ${(sticker.s * 15).toFixed(1)}cqi, 110px)`;
  return (
    <span
      className={`absolute z-[3] select-none ${live ? "pointer-events-auto cursor-grab touch-none active:cursor-grabbing" : "pointer-events-none"}`}
      style={{
        left: `${pos.x * 100}%`,
        top: `${pos.y * 100}%`,
        width: box,
        height: box,
        transform: "translate(-50%,-50%)",
      }}
      role={editable ? "button" : undefined}
      aria-label={editable ? "Drag to move this sticker" : undefined}
      aria-hidden={editable ? undefined : "true"}
      onPointerDown={(e) => {
        if (!live) return;
        e.stopPropagation();
        drag.current = { id: e.pointerId, moved: false, sx: e.clientX, sy: e.clientY };
        try {
          (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
        } catch {
          /* ok */
        }
      }}
      onPointerMove={(e) => {
        const d = drag.current;
        if (!d || d.id !== e.pointerId) return;
        if (!d.moved && Math.hypot(e.clientX - d.sx, e.clientY - d.sy) < 5) return;
        d.moved = true;
        setPos(toFrac(e.clientX, e.clientY));
      }}
      onPointerUp={(e) => {
        const d = drag.current;
        drag.current = null;
        if (!d) return;
        e.stopPropagation();
        if (d.moved) {
          const p = toFrac(e.clientX, e.clientY);
          setPos(p);
          onMove?.({ ...sticker, ...p });
          chime("boop");
        } else {
          setJelly((j) => j + 1);
          burst(host.current, e.clientX, e.clientY, {
            shape: "sparkles",
            colors,
            count: 10,
            spread: 0.6,
          });
          chime("pop");
          buzz(8);
        }
      }}
      onPointerCancel={() => {
        drag.current = null;
      }}
      onClick={(e) => e.stopPropagation()}
    >
      <span
        className="block size-full"
        style={{
          animation: `jb-float ${5 + ((sticker.x * 10) % 3)}s ease-in-out ${-sticker.y * 4}s infinite`,
        }}
      >
        <span
          key={jelly}
          className="grid size-full place-items-center"
          style={{ animation: jelly ? "jb-jelly .6s ease" : undefined }}
        >
          <span
            className="grid size-full place-items-center"
            style={{ transform: `rotate(${sticker.r}deg)` }}
          >
            {sticker.url ? (
              <img
                src={sticker.url}
                alt=""
                draggable={false}
                className="size-full object-contain"
                style={{
                  filter:
                    "drop-shadow(2px 0 0 #fff) drop-shadow(-2px 0 0 #fff) drop-shadow(0 2px 0 #fff) drop-shadow(0 -2px 0 #fff) drop-shadow(0 6px 8px rgba(0,0,0,.18))",
                }}
              />
            ) : (
              <span
                className="leading-none"
                style={{
                  fontSize: `clamp(30px, ${(sticker.s * 11).toFixed(1)}cqi, 84px)`,
                  filter: "drop-shadow(0 5px 6px rgba(0,0,0,.18))",
                }}
              >
                {sticker.emoji}
              </span>
            )}
          </span>
        </span>
      </span>
    </span>
  );
}

/** An emoji or uploaded picture as the opening's main object: squishy, stretchy, boingy. */
function FlatHero({
  emoji,
  url,
  interactive,
  onPoke,
}: {
  emoji?: string | undefined;
  url?: string | undefined;
  interactive: boolean;
  onPoke: (x: number, y: number) => void;
}) {
  const [jelly, setJelly] = useState(0);
  const [pull, setPull] = useState({ x: 0, y: 0, active: false });
  const drag = useRef<{ id: number; sx: number; sy: number; moved: boolean } | null>(null);
  return (
    <div
      className={`relative mx-auto grid h-[clamp(190px,44cqi,340px)] w-full place-items-center ${interactive ? "cursor-grab touch-pan-y select-none" : "pointer-events-none"}`}
      role={interactive ? "button" : undefined}
      tabIndex={interactive ? 0 : undefined}
      aria-label={interactive ? "Tap to play, or pull and let go" : undefined}
      aria-hidden={interactive ? undefined : "true"}
      onPointerDown={(e) => {
        if (!interactive) return;
        e.stopPropagation();
        drag.current = { id: e.pointerId, sx: e.clientX, sy: e.clientY, moved: false };
      }}
      onPointerMove={(e) => {
        const d = drag.current;
        if (!d || d.id !== e.pointerId) return;
        const dx = e.clientX - d.sx;
        const dy = e.clientY - d.sy;
        if (!d.moved && Math.hypot(dx, dy) < 7) return;
        if (!d.moved) {
          d.moved = true;
          try {
            (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
          } catch {
            /* ok */
          }
        }
        // Rubber band: the further you pull, the less it follows.
        const k = (v: number) => Math.sign(v) * Math.min(90, Math.abs(v) * 0.55);
        setPull({ x: k(dx), y: k(dy), active: true });
      }}
      onPointerUp={(e) => {
        const d = drag.current;
        drag.current = null;
        if (!d) return;
        e.stopPropagation();
        setPull({ x: 0, y: 0, active: false });
        setJelly((j) => j + 1);
        if (!d.moved) onPoke(e.clientX, e.clientY);
        else chime("boop");
      }}
      onPointerCancel={() => {
        drag.current = null;
        setPull({ x: 0, y: 0, active: false });
      }}
      onClick={(e) => e.stopPropagation()}
      onKeyDown={(e) => {
        if (e.key !== "Enter" && e.key !== " ") return;
        e.preventDefault();
        e.stopPropagation();
        setJelly((j) => j + 1);
        const r = e.currentTarget.getBoundingClientRect();
        onPoke(r.left + r.width / 2, r.top + r.height / 2);
      }}
    >
      <span
        className="block"
        style={{
          transform: `translate(${pull.x}px, ${pull.y}px) rotate(${pull.x * 0.12}deg)`,
          transition: pull.active ? "none" : "transform .55s cubic-bezier(.3,1.8,.5,1)",
        }}
      >
        <span className="block" style={{ animation: "jb-float 4.5s ease-in-out infinite" }}>
          <span
            key={jelly}
            className="block"
            style={{ animation: jelly ? "jb-jelly .65s ease" : undefined }}
          >
            {url ? (
              <img
                src={url}
                alt=""
                draggable={false}
                className="mx-auto h-[clamp(150px,40cqi,280px)] w-auto max-w-[80cqi] object-contain"
                style={{
                  filter:
                    "drop-shadow(4px 0 0 #fff) drop-shadow(-4px 0 0 #fff) drop-shadow(0 4px 0 #fff) drop-shadow(0 -4px 0 #fff) drop-shadow(0 18px 18px rgba(0,0,0,.2))",
                }}
              />
            ) : (
              <span
                className="block leading-none"
                style={{
                  fontSize: "clamp(110px, 34cqi, 220px)",
                  filter: "drop-shadow(0 18px 16px rgba(0,0,0,.18))",
                }}
              >
                {emoji}
              </span>
            )}
          </span>
        </span>
      </span>
    </div>
  );
}

function ClassicIntro({
  style,
  palette,
  fonts,
  backgroundStyle,
  recipientName,
  introText,
  onOpen,
  onSkip,
  contained = false,
  kind: kindProp,
  settings,
  autoOpenAfter,
  quick = false,
  paused = false,
  interactive = true,
  onStickerMove,
  occasionBadge,
}: {
  style: IntroStyle;
  palette: Palette;
  fonts: { heading: string; body: string };
  backgroundStyle: BackgroundStyle;
  recipientName?: string | undefined;
  introText?: string | undefined;
  onOpen: () => void;
  onSkip?: () => void;
  contained?: boolean;
  /** The occasion, for the 3D object and backdrop. Defaults from the intro style. */
  kind?: ThemeKind | undefined;
  /** The creator's own touches: object, stickers, colors, background, words. */
  settings?: IntroSettings | undefined;
  /** Previews: open by itself this many ms after it appears. */
  autoOpenAfter?: number | undefined;
  /** Previews: skip the slow build-up. */
  quick?: boolean;
  /** Freeze on the ready frame (a card that isn't playing). */
  paused?: boolean;
  /** Taps, drags and sound. Off for small previews. */
  interactive?: boolean;
  /** Editor: stickers can be dragged into place and saved. */
  onStickerMove?: ((s: IntroSticker) => void) | undefined;
  /** The small label on top for a gift with an occasion ("Anniversary"). The creator's own words still win. */
  occasionBadge?: string | undefined;
}) {
  useIntroStyles();
  const rootRef = useRef<HTMLDivElement | null>(null);
  const heroRef = useRef<Theme3DHandle | null>(null);
  const [reduced, setReduced] = useState(false);
  useEffect(() => setReduced(reducedMotion()), []);
  const still = reduced || paused;
  // 0 the object pops in · 2 writing the greeting · 3 ready
  const [stage, setStage] = useState(paused ? 3 : 0);
  const [opening, setOpening] = useState(false);
  const [taps, setTaps] = useState(0);
  const [sound, setSound] = useSound();
  const s = settings ?? {};
  const copy = INTRO_COPY[style];
  const kind = kindProp ?? STYLE_KIND[style];
  const hero = s.hero ?? { type: "theme" as const };
  const heroKind: ThemeKind = hero.type === "object" ? hero.kind : kind;
  const bg = s.background ?? { type: "theme" as const };

  const bgColor =
    bg.type === "solid"
      ? bg.color
      : bg.type === "gradient"
        ? bg.from
        : bg.type === "image"
          ? "#2B2522"
          : palette.background;
  const ink = s.ink ?? (bg.type === "image" ? "#FFFFFF" : readableInk(bgColor));
  const muted = `${ink}B3`;
  const buttonBg = s.button ?? palette.primary;
  const buttonInk =
    s.button_ink ??
    (readableOn(buttonBg, palette.background, 4.5) === palette.background
      ? palette.background
      : readableInk(buttonBg));
  const greeting = introText?.trim() || `For ${recipientName || "you"}`;
  const colors = [palette.primary, palette.accent, buttonBg, "#FFD166", "#FFFFFF"];
  const shape: BurstShape = s.burst ?? KIND_BURST[kind];
  const playful = interactive && !paused;

  useEffect(() => {
    if (still) {
      setStage(3);
      return;
    }
    setStage(0);
    const timers = [
      window.setTimeout(() => setStage(2), quick ? 250 : 1100),
      window.setTimeout(() => setStage(3), quick ? 900 : 2400),
    ];
    return () => timers.forEach(window.clearTimeout);
  }, [still, quick]);

  useEffect(() => {
    if (autoOpenAfter === undefined || paused) return;
    const t = window.setTimeout(() => open(true), autoOpenAfter);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoOpenAfter, paused]);

  function open(auto = false) {
    if (opening || paused) return;
    if (!auto) unlockAudio();
    setOpening(true);
    heroRef.current?.celebrate();
    const r = rootRef.current?.getBoundingClientRect();
    if (r && !reduced) {
      const cx = r.left + r.width / 2;
      const cy = r.top + r.height * 0.5;
      burst(rootRef.current, cx, cy, { shape, colors, count: 34, spread: 1.8 });
      window.setTimeout(
        () =>
          burst(rootRef.current, cx, cy - 40, {
            shape: "confetti",
            colors,
            count: 24,
            spread: 2.2,
          }),
        140,
      );
    }
    if (!auto) {
      chime("tada");
      buzz([12, 40, 18]);
    }
    window.setTimeout(onOpen, reduced ? 350 : 1100);
  }

  function poke(x: number, y: number) {
    const n = taps + 1;
    setTaps(n);
    burst(rootRef.current, x, y, { shape, colors, count: 14 });
    chime(n % 5 === 0 ? "sparkle" : "pop");
    buzz(10);
    if (n % 5 === 0) heroRef.current?.celebrate();
  }

  const hint =
    taps >= 5
      ? "Okay, okay. Open me."
      : taps > 0
        ? (["Again?", "Hehe.", "One more.", "You found the secret."][Math.min(taps - 1, 3)] ?? "")
        : hero.type === "theme" || hero.type === "object"
          ? `Tap the ${HERO_WORD[heroKind]}, or drag to spin it`
          : "Tap me, or pull and let go";

  const background: React.CSSProperties =
    bg.type === "theme"
      ? backgroundCss(backgroundStyle, palette)
      : bg.type === "solid"
        ? { backgroundColor: bg.color }
        : bg.type === "gradient"
          ? {
              backgroundImage: `linear-gradient(160deg, ${bg.from}, ${bg.to})`,
              backgroundColor: bg.from,
            }
          : { backgroundColor: "#2B2522" };

  return (
    <div
      ref={rootRef}
      className={`jb-intro skin-${kind} isolate ${contained ? "absolute" : "fixed"} inset-0 z-[60] grid place-items-center overflow-hidden px-5 [container:gift/inline-size] ${paused ? "" : "cursor-pointer"}`}
      data-paused={paused ? "" : undefined}
      style={{
        ...background,
        ...({
          "--sk-a": readableOn(bgColor, palette.accent, 3),
          "--sk-p": palette.primary,
          "--sk-bg": bgColor,
          "--sk-ink": ink,
          "--gift-surface": palette.background,
        } as React.CSSProperties),
        color: ink,
        fontFamily: fonts.body,
        transition: "opacity 600ms ease, transform 600ms ease",
        opacity: opening ? 0 : 1,
        transform: opening && !reduced ? "translateY(-24px) scale(1.02)" : undefined,
        transitionDelay: opening ? "350ms" : "0ms",
      }}
      onClick={() => open()}
      role={paused ? undefined : "button"}
      tabIndex={paused ? -1 : 0}
      aria-label={paused ? undefined : s.button_text || copy.action}
      onKeyDown={(e) => {
        if (e.target !== e.currentTarget) return;
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          open();
        }
      }}
    >
      {bg.type === "image" ? (
        <>
          <img
            src={bg.url}
            alt=""
            draggable={false}
            className="absolute inset-0 -z-10 size-full object-cover"
          />
          <span
            aria-hidden="true"
            className="absolute inset-0 -z-10 bg-gradient-to-b from-black/35 via-black/10 to-black/45"
          />
        </>
      ) : null}
      {bg.type === "theme" ? <SkinDecor kind={kind} /> : <SkinParticles kind={kind} />}

      {(s.stickers ?? []).map((st) => (
        <Sticker
          key={st.id}
          sticker={st}
          host={rootRef}
          interactive={playful}
          editable={!!onStickerMove}
          onMove={onStickerMove}
          colors={colors}
        />
      ))}

      {playful ? (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setSound(!sound);
          }}
          aria-pressed={sound}
          aria-label={sound ? "Sound is on" : "Sound is off"}
          title={sound ? "Sound is on" : "Turn on sound"}
          className="absolute top-3 right-3 z-[5] grid size-10 place-items-center rounded-full backdrop-blur"
          style={{ background: `${bgColor}AA`, color: ink, boxShadow: `0 0 0 1px ${ink}22` }}
        >
          {sound ? <Volume2 className="size-[18px]" /> : <VolumeX className="size-[18px]" />}
        </button>
      ) : null}

      <div className="relative z-[2] flex w-full max-w-full min-w-0 flex-col items-center text-center">
        <p
          className="max-w-full font-mono text-[11px] tracking-[0.28em] uppercase [overflow-wrap:anywhere]"
          style={{ color: muted, opacity: stage >= 2 ? 1 : 0, transition: "opacity 600ms ease" }}
        >
          {s.badge_text || occasionBadge || copy.badge}
        </p>

        <div className="relative mt-3 min-h-[4.2rem] max-w-full">
          {stage >= 2 ? (
            <div className="relative inline-block max-w-full">
              <h1
                className="text-[clamp(1.9rem,11cqi,3.5rem)] leading-tight font-bold [overflow-wrap:anywhere]"
                style={{
                  fontFamily: "var(--jb-display, 'Fraunces', serif)",
                  color: ink,
                  animation: still ? undefined : "jb-write 1.1s ease-out both",
                }}
              >
                {greeting}
              </h1>
              {!still ? (
                <span
                  className="absolute top-1/2 size-1.5 rounded-full"
                  style={{ backgroundColor: buttonBg, animation: "jb-pencil 1.1s ease-out both" }}
                />
              ) : null}
            </div>
          ) : null}
        </div>

        <div
          className="sk-hero mt-1 w-[min(560px,88cqi)]"
          style={{
            animation: still ? undefined : "jb-pop .9s cubic-bezier(.3,1.4,.5,1) .1s both",
            transition: "transform 900ms cubic-bezier(.3,1.3,.5,1), opacity 700ms ease",
            transform: opening && !reduced ? "scale(1.3) translateY(-16px)" : undefined,
            opacity: opening ? 0 : 1,
          }}
        >
          {hero.type === "emoji" || hero.type === "image" ? (
            <FlatHero
              emoji={hero.type === "emoji" ? hero.emoji : undefined}
              url={hero.type === "image" ? hero.url : undefined}
              interactive={playful}
              onPoke={poke}
            />
          ) : (
            <Theme3D
              kind={heroKind}
              palette={palette}
              className="sk-stage"
              interactive={playful}
              handleRef={heroRef}
              label={`Tap the ${HERO_WORD[heroKind]} to play`}
              onPoke={(x, y) => poke(x, y)}
            />
          )}
        </div>

        <p
          aria-live="polite"
          className="mt-1 min-h-5 text-xs font-medium"
          style={{
            color: muted,
            opacity: playful && stage >= 3 && !opening ? 1 : 0,
            transition: "opacity 400ms ease",
            animation: taps === 0 && playful ? "jb-hint 1.6s ease-in-out infinite" : undefined,
          }}
        >
          {playful ? hint : ""}
        </p>

        <div className="mt-3 h-[52px]">
          {stage >= 3 ? (
            <button
              type="button"
              tabIndex={paused ? -1 : 0}
              onClick={(e) => {
                e.stopPropagation();
                open();
              }}
              className="relative inline-flex h-[52px] max-w-[86cqi] items-center gap-2 rounded-full px-7 text-sm font-semibold shadow-[0_14px_30px_-14px_rgba(0,0,0,.45)] transition-transform hover:scale-[1.03] active:scale-95"
              style={{
                backgroundColor: buttonBg,
                color: buttonInk,
                animation: still ? undefined : "jb-pop .5s cubic-bezier(.3,1.5,.5,1) both",
              }}
            >
              <Gift className="size-4 shrink-0" />
              <span className="truncate">{s.button_text || copy.action}</span>
              {!still ? (
                <span
                  aria-hidden="true"
                  className="pointer-events-none absolute top-1/2 left-1/2 size-16 rounded-full"
                  style={{
                    border: `2px solid ${buttonBg}`,
                    opacity: 0,
                    animation: "jb-ring 1.8s ease-out 1s infinite backwards",
                  }}
                />
              ) : null}
            </button>
          ) : null}
        </div>

        {paused || !interactive ? (
          <span className="mt-3 h-8" />
        ) : (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              unlockAudio();
              (onSkip ?? onOpen)();
            }}
            className="mt-3 min-h-8 px-2 text-xs underline"
            style={{ color: muted }}
          >
            Skip intro
          </button>
        )}
      </div>
    </div>
  );
}

type GiftIntroProps = React.ComponentProps<typeof ClassicIntro> & {
  /** Calm occasions (Sympathy, Get well): no drifting particles in the opening. */
  calm?: boolean | undefined;
  /** The gift's cast (character and sprinkles). Null = theme defaults. */
  character?: CharacterSetting | null | undefined;
  iconSet?: IconSetSetting | null | undefined;
  /** Friends' names, for stamps and sparks. */
  contributors?: string[] | undefined;
  /** The theme row's name (themes built on the theme engine are found by it), and what they need. */
  themeName?: string | null | undefined;
  notes?: EngineNote[] | undefined;
  slots?: SlotInput | undefined;
  themeOptions?: ThemeOptions | undefined;
  /** Birthday: the age they're turning (shown as candles). */
  age?: number | null | undefined;
};

/**
 * The gift's opening. By default the theme's signature object (a wax seal, a
 * record, a cake…); "classic" in the intro settings keeps the earlier 3D one.
 */
export function GiftIntro(props: GiftIntroProps) {
  const { character, iconSet, contributors, themeName, notes, slots, themeOptions, age, calm, ...rest } = props;
  const kind = props.kind ?? STYLE_KIND[props.style];
  const s = props.settings ?? {};
  const engine = !!engineThemeForName(themeName);
  if (s.opening === "classic" || (!engine && !hasTactileOpening(kind))) return <ClassicIntro {...rest} />;
  return (
    <TactileOpening
      kind={kind}
      palette={props.palette}
      recipientName={props.recipientName}
      introText={props.introText}
      badgeText={s.badge_text || props.occasionBadge}
      calm={calm}
      buttonText={s.button_text}
      character={character}
      iconSet={iconSet}
      contributors={contributors ?? []}
      contained={props.contained ?? false}
      interactive={props.interactive ?? true}
      paused={props.paused ?? false}
      autoplay={props.autoOpenAfter !== undefined}
      onOpen={props.onOpen}
      onSkip={props.onSkip}
      themeName={themeName}
      notes={notes}
      slots={slots}
      options={themeOptions}
      age={age}
    />
  );
}
