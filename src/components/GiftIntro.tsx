import { useEffect, useMemo, useState } from "react";
import { SkinDecor } from "@/components/SkinDecor";
import { Theme3D } from "@/components/Theme3D";
import type { ThemeKind } from "@/lib/themeKind";
import { backgroundCss, type BackgroundStyle } from "@/lib/gift";
import { readableInk, readableOn } from "@/lib/palettes";
import type { Palette } from "@/lib/themes";
import { INTRO_COPY, type IntroStyle } from "@/lib/intro";

export { INTRO_COPY, introStyleForTheme, type IntroStyle } from "@/lib/intro";
import { Gift } from "lucide-react";

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

/** The little shape that mixes into the confetti and drifts in the background. */
const THEME_SHAPE: Record<IntroStyle, string> = {
  envelope: "♥",
  giftbox: "▮",
  boardingpass: "✈",
  present: "❄",
  paw: "🐾",
  sparkler: "★",
  letter: "♥",
  invitation: "❀",
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

function prefersReducedMotion() {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

const introCss = `
@keyframes jb-walk-in{from{transform:translateX(-58vw)}to{transform:translateX(0)}}
@keyframes jb-write{from{clip-path:inset(0 100% 0 0)}to{clip-path:inset(0 0 0 0)}}
@keyframes jb-pencil{from{left:0%}to{left:100%}}
@keyframes jb-pop{0%{opacity:0;transform:scale(.8)}60%{opacity:1;transform:scale(1.05)}100%{transform:scale(1)}}
@keyframes jb-fade-up{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}
@keyframes jb-drift{0%,100%{transform:translateY(0) rotate(0)}50%{transform:translateY(-12px) rotate(8deg)}}
@keyframes jb-confetti{0%{opacity:1;transform:translate(0,0) rotate(0)}100%{opacity:0;transform:translate(var(--dx),var(--dy)) rotate(var(--spin))}}
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

function Confetti({ palette, shape }: { palette: Palette; shape: string }) {
  const pieces = useMemo(
    () =>
      [...Array(40)].map((_, i) => {
        const angle = (i / 40) * Math.PI * 2;
        const spread = 120 + ((i * 37) % 160);
        return {
          i,
          left: `${46 + ((i * 13) % 12)}%`,
          color: [palette.primary, palette.accent, "#FFFFFF"][i % 3]!,
          dx: `${Math.cos(angle) * spread}px`,
          dy: `${180 + ((i * 29) % 160)}px`,
          spin: `${(i % 2 ? 1 : -1) * (180 + (i % 5) * 60)}deg`,
          delay: `${(i % 8) * 30}ms`,
          themed: i % 4 === 0,
        };
      }),
    [palette.primary, palette.accent],
  );

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {pieces.map((p) => (
        <span
          key={p.i}
          className="absolute top-[58%] text-xs"
          style={
            {
              left: p.left,
              color: p.color,
              backgroundColor: p.themed ? "transparent" : p.color,
              width: p.themed ? undefined : 7,
              height: p.themed ? undefined : 11,
              borderRadius: 2,
              animation: `jb-confetti 1.5s cubic-bezier(.2,.6,.4,1) ${p.delay} both`,
              ["--dx" as string]: p.dx,
              ["--dy" as string]: p.dy,
              ["--spin" as string]: p.spin,
            } as React.CSSProperties
          }
        >
          {p.themed ? shape : ""}
        </span>
      ))}
    </div>
  );
}

export function GiftIntro({
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
}) {
  useIntroStyles();
  const reduced = prefersReducedMotion();
  // 0 walking · 1 waving · 2 writing the greeting · 3 ready
  const [stage, setStage] = useState(reduced ? 3 : 0);
  const [opening, setOpening] = useState(false);
  const copy = INTRO_COPY[style];
  const ink = readableInk(palette.background);
  const muted = `${ink}99`;
  const buttonText =
    readableOn(palette.primary, palette.background, 4.5) === palette.background
      ? palette.background
      : readableInk(palette.primary);
  const greeting = introText?.trim() || `For ${recipientName || "you"}`;
  const kind = kindProp ?? STYLE_KIND[style];

  useEffect(() => {
    if (reduced) return;
    const timers = [
      window.setTimeout(() => setStage(1), 1800),
      window.setTimeout(() => setStage(2), 2000),
      window.setTimeout(() => setStage(3), 3200),
    ];
    return () => timers.forEach(window.clearTimeout);
  }, [reduced]);

  function open() {
    if (opening) return;
    unlockAudio();
    setOpening(true);
    window.setTimeout(onOpen, reduced ? 350 : 1200);
  }

  return (
    <div
      className={`jb-intro skin-${kind} isolate ${contained ? "absolute" : "fixed"} inset-0 z-[60] grid cursor-pointer place-items-center overflow-hidden px-6`}
      style={{
        ...backgroundCss(backgroundStyle, palette),
        ...({
          "--sk-a": readableOn(palette.background, palette.accent, 3),
          "--sk-p": palette.primary,
          "--sk-bg": palette.background,
          "--sk-ink": ink,
          "--gift-surface": palette.background,
        } as React.CSSProperties),
        color: ink,
        fontFamily: fonts.body,
        transition: "opacity 600ms ease, transform 600ms ease",
        opacity: opening && !reduced ? 0 : opening ? 0 : 1,
        transform: opening && !reduced ? "translateY(-24px)" : "translateY(0)",
      }}
      onClick={open}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") open();
      }}
    >
      <SkinDecor kind={kind} />

      <div className="relative flex flex-col items-center text-center">
        <p
          className="font-mono text-[11px] tracking-[0.28em] uppercase"
          style={{
            color: muted,
            opacity: stage >= 2 ? 1 : 0,
            transition: "opacity 600ms ease",
          }}
        >
          {copy.badge}
        </p>

        <div className="relative mt-3 h-[4.2rem]">
          {stage >= 2 ? (
            <div className="relative inline-block">
              <h1
                className="text-[clamp(2rem,8vw,3.5rem)] leading-tight font-bold"
                style={{
                  fontFamily: '"Caveat", cursive',
                  color: ink,
                  animation: reduced ? undefined : "jb-write 1.2s ease-out both",
                }}
              >
                {greeting}
              </h1>
              {!reduced ? (
                <span
                  className="absolute top-1/2 size-1.5 rounded-full"
                  style={{
                    backgroundColor: palette.primary,
                    animation: "jb-pencil 1.2s ease-out both",
                  }}
                />
              ) : null}
            </div>
          ) : null}
        </div>

        <div
          className="sk-hero mt-2 w-[min(560px,88vw)]"
          style={{
            animation: reduced ? undefined : "jb-pop .9s cubic-bezier(.3,1.4,.5,1) .15s both",
            transition: "transform 900ms cubic-bezier(.3,1.3,.5,1), opacity 700ms ease",
            transform: opening && !reduced ? "scale(1.35) translateY(-20px)" : undefined,
            opacity: opening ? 0 : 1,
          }}
        >
          <Theme3D kind={kind} palette={palette} className="sk-stage" />
        </div>

        {stage >= 3 ? (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              open();
            }}
            className="mt-6 inline-flex h-[52px] items-center gap-2 rounded-full px-7 text-sm font-medium"
            style={{
              backgroundColor: palette.primary,
              color: buttonText,
              animation: reduced ? undefined : "jb-pop .5s cubic-bezier(.3,1.5,.5,1) both",
            }}
          >
            <Gift className="size-4" />
            {copy.action}
          </button>
        ) : null}

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            unlockAudio();
            (onSkip ?? onOpen)();
          }}
          className="mt-4 text-xs underline"
          style={{ color: muted }}
        >
          Skip intro
        </button>
      </div>

      {opening && !reduced ? <Confetti palette={palette} shape={THEME_SHAPE[style]} /> : null}
    </div>
  );
}
