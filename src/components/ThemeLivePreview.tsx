import { useEffect, useMemo, useRef, useState } from "react";
import { GiftSiteView } from "@/components/GiftSiteView";
import { INTRO_COPY, introStyleForTheme } from "@/lib/intro";
import { themeFont } from "@/components/ThemeMiniPreview";
import {
  FONT_PAIRINGS,
  backgroundCss,
  type BackgroundStyle,
  type GiftSite,
  type ModuleType,
  type SiteModule,
} from "@/lib/gift";
import type { Palette, Theme } from "@/lib/themes";
import { usePalettes, suggestedPalettes } from "@/hooks/usePalettes";

const PHONE_WIDTH = 390;
const SCROLL_MS = 8000;
const HOLD_MS = 1500;
const RETURN_MS = 1000;
const INTRO_MS = 1400;

/* Only one mini preview plays at a time. */
let currentId: string | null = null;
const listeners = new Set<() => void>();
function notify() {
  for (const l of listeners) l();
}
export function claimPreview(id: string) {
  if (currentId === id) return;
  currentId = id;
  notify();
}
export function releasePreview(id: string) {
  if (currentId !== id) return;
  currentId = null;
  notify();
}
function useIsPlaying(id: string) {
  const [, bump] = useState(0);
  useEffect(() => {
    const l = () => bump((n) => n + 1);
    listeners.add(l);
    return () => {
      listeners.delete(l);
    };
  }, []);
  return currentId === id;
}

function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);
    const l = () => setReduced(mq.matches);
    mq.addEventListener("change", l);
    return () => mq.removeEventListener("change", l);
  }, []);
  return reduced;
}

/** A fixed, friendly recipient per occasion so every card reads like a real gift. */
function sampleFor(theme: Theme) {
  const key = `${theme.category} ${theme.name}`.toLowerCase();
  if (key.includes("birthday")) return { heading: "For Maya", name: "Maya" };
  if (key.includes("christmas")) return { heading: "Merry Christmas, Lolo", name: "Lolo" };
  if (key.includes("despidida") || key.includes("farewell") || key.includes("voyage"))
    return { heading: "Bon voyage, Sam", name: "Sam" };
  if (key.includes("valentine")) return { heading: "Happy Valentine's, Ana", name: "Ana" };
  if (key.includes("pet")) return { heading: "For Milo", name: "Milo" };
  if (key.includes("new year")) return { heading: "Happy New Year, everyone", name: "the crew" };
  if (key.includes("anniversar")) return { heading: "Ten years, Liz", name: "Liz" };
  if (key.includes("wedding")) return { heading: "Congratulations, Aya & Jun", name: "Aya & Jun" };
  return { heading: "For someone lovely", name: "Maya" };
}

function backgroundFor(theme: Theme): BackgroundStyle {
  const key = `${theme.category} ${theme.name}`.toLowerCase();
  if (key.includes("wedding") || key.includes("anniversar")) return "formal";
  if (key.includes("new year")) return "gradient";
  if (key.includes("birthday") || key.includes("pet")) return "clean";
  return "paper";
}

function MiniIntro({
  theme,
  palette,
  fonts,
  background,
  opacity,
  height,
}: {
  theme: Theme;
  palette: Palette;
  fonts: { heading: string; body: string };
  background: BackgroundStyle;
  opacity: number;
  height: number;
}) {
  const style = introStyleForTheme(theme.name);
  const copy = INTRO_COPY[style];
  const sample = sampleFor(theme);
  return (
    <div
      className="grid place-items-center px-8 text-center"
      style={{
        width: PHONE_WIDTH,
        height,
        ...backgroundCss(background, palette),
        color: palette.primary,
        fontFamily: fonts.body,
        opacity,
      }}
    >
      <div>
        <p className="text-xs tracking-[0.22em] uppercase" style={{ color: palette.accent }}>
          {copy.badge}
        </p>
        <div
          className="mx-auto mt-6 grid size-24 place-items-center rounded-3xl text-4xl shadow-sm ring-1 ring-black/5"
          style={{ backgroundColor: "rgba(255,255,255,0.7)" }}
        >
          {copy.glyph}
        </div>
        <p
          className="mt-6 text-3xl leading-tight font-semibold text-balance"
          style={{ fontFamily: fonts.heading }}
        >
          {sample.heading}
        </p>
        <p
          className="mt-5 inline-block rounded-full px-5 py-2 text-sm"
          style={{ backgroundColor: palette.accent, color: palette.background }}
        >
          {copy.action}
        </p>
      </div>
    </div>
  );
}

/** A live, non-interactive mini gift site that slowly plays through the theme. */
export function ThemeLivePreview({ theme }: { theme: Theme }) {
  const id = theme.id;
  const playing = useIsPlaying(id);
  const reduced = usePrefersReducedMotion();
  const boxRef = useRef<HTMLDivElement | null>(null);
  const innerRef = useRef<HTMLDivElement | null>(null);
  const [scale, setScale] = useState(0.3);
  const [boxH, setBoxH] = useState(0);
  const [mounted, setMounted] = useState(false);
  const [visible, setVisible] = useState(false);
  const [offset, setOffset] = useState(0);
  const [introOpacity, setIntroOpacity] = useState(1);

  const { data: allPalettes = [] } = usePalettes();
  const palette = suggestedPalettes(theme, allPalettes)[0] ?? theme.palettes[0];
  const fonts = FONT_PAIRINGS[themeFont(theme)];
  const background = backgroundFor(theme);
  const sample = sampleFor(theme);

  const site: GiftSite = useMemo(
    () => ({
      id: `preview-${theme.id}`,
      creator_id: "preview",
      title: theme.name,
      theme_id: theme.id,
      slug: "preview",
      status: "published",
      format: "scrapbook",
      format_settings: {},
      custom_text: {
        heading: sample.heading,
        recipient_name: sample.name,
        intro_message: "Everyone who loves you put something in here. Take your time.",
        footer_note: "With love, from all of us",
      },
      custom_colors: palette ?? {},
      palette_id: null,
      share_notes: false,
      font_choice: themeFont(theme),
      countdown_date: new Date(Date.now() + 12 * 86400000).toISOString().slice(0, 10),
      calendar_locked: false,
      intro_text: null,
      background_style: background,
      tree_reveal_date: null,
      created_at: new Date().toISOString(),
    }),
    [theme.id, theme.name, sample.heading, sample.name, background],
  );

  const modules: SiteModule[] = useMemo(() => {
    const types = (
      theme.default_modules.length > 0
        ? theme.default_modules
        : ["letters", "photobooth", "songs"]
    ) as ModuleType[];
    return types.map((type, i) => ({
      id: `${theme.id}-${i}`,
      site_id: site.id,
      module_type: type,
      price: 0,
      enabled: true,
    }));
  }, [theme.default_modules, theme.id, site.id]);

  // Scale the phone-width site down to the card, and mount only when on screen.
  useEffect(() => {
    const el = boxRef.current;
    if (!el) return;
    const measure = () => {
      setScale(el.clientWidth / PHONE_WIDTH);
      setBoxH(el.clientHeight);
    };
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    measure();
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) setMounted(true);
          // Off-screen cards fall back to the static first frame and stop animating.
          setVisible(e.isIntersecting);
          if (!e.isIntersecting) releasePreview(id);
          // Touch devices play the card that is in view.
          if (window.matchMedia("(hover: none)").matches) {
            if (e.isIntersecting && e.intersectionRatio > 0.6) claimPreview(id);
            else releasePreview(id);
          }
        }
      },
      { threshold: [0, 0.25, 0.6, 0.9] },
    );
    io.observe(el);
    return () => {
      ro.disconnect();
      io.disconnect();
      releasePreview(id);
    };
  }, [id]);

  // The slow top-to-bottom play, looping while the card stays active.
  useEffect(() => {
    if (!playing || reduced || !visible) {
      setOffset(0);
      setIntroOpacity(1);
      return;
    }
    let raf = 0;
    let cancelled = false;
    const start = performance.now();
    const viewport = (boxRef.current?.clientHeight ?? 0) / (scale || 1);

    const tick = (now: number) => {
      if (cancelled) return;
      const max = Math.max(0, (innerRef.current?.scrollHeight ?? 0) - viewport);
      const cycle = INTRO_MS + SCROLL_MS + HOLD_MS + RETURN_MS;
      const t = (now - start) % cycle;
      if (t < INTRO_MS) {
        setIntroOpacity(t < INTRO_MS - 700 ? 1 : 1 - (t - (INTRO_MS - 700)) / 700);
        setOffset(0);
      } else if (t < INTRO_MS + SCROLL_MS) {
        setIntroOpacity(0);
        setOffset(max * ((t - INTRO_MS) / SCROLL_MS));
      } else if (t < INTRO_MS + SCROLL_MS + HOLD_MS) {
        setIntroOpacity(0);
        setOffset(max);
      } else {
        const p = (t - INTRO_MS - SCROLL_MS - HOLD_MS) / RETURN_MS;
        const eased = 1 - Math.pow(1 - p, 3);
        setIntroOpacity(p);
        setOffset(max * (1 - eased));
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
    };
  }, [playing, reduced, visible, scale]);

  if (!palette) return null;

  return (
    <div
      ref={boxRef}
      className="relative size-full overflow-hidden select-none"
      style={{ backgroundColor: palette.background }}
      onMouseEnter={() => claimPreview(id)}
      onMouseLeave={() => releasePreview(id)}
      aria-hidden="true"
    >
      <div
        className="pointer-events-none absolute top-0 left-0 origin-top-left"
        style={{
          width: PHONE_WIDTH,
          transform: `scale(${scale}) translateY(${-offset}px)`,
        }}
      >
        <div ref={innerRef}>
          {mounted && visible ? (
            <GiftSiteView site={site} theme={theme} modules={modules} contributions={[]} sample />
          ) : null}
        </div>
      </div>

      <div
        className="pointer-events-none absolute top-0 left-0 origin-top-left"
        style={{ transform: `scale(${scale})` }}
      >
        <MiniIntro
          theme={theme}
          palette={palette}
          fonts={fonts}
          background={background}
          opacity={reduced ? 1 : introOpacity}
          height={boxH / (scale || 1)}
        />
      </div>

      <span
        className="absolute right-2 bottom-2 flex items-center gap-1 rounded-full bg-black/45 px-2 py-1 font-mono text-[9px] tracking-[0.12em] text-white uppercase"
      >
        <svg viewBox="0 0 10 10" className="size-2 fill-current" aria-hidden="true">
          <path d="M2 1l7 4-7 4z" />
        </svg>
        Preview
      </span>
    </div>
  );
}
