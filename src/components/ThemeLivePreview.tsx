import { useEffect, useMemo, useRef, useState } from "react";
import { Live3DContext } from "@/components/Theme3D";
import { GiftSiteView } from "@/components/GiftSiteView";
import { introStyleForTheme } from "@/lib/intro";
import { GiftIntro } from "@/components/GiftIntro";
import { themeKindOf } from "@/lib/themeKind";
import { PRESETS } from "@/lib/presets";
import { themeFont } from "@/components/ThemeMiniPreview";
import { themeFontVars } from "@/themes/_shared/design";
import {
  FONT_PAIRINGS,
  type BackgroundStyle,
  type GiftSite,
  type ModuleType,
  type SiteModule,
} from "@/lib/gift";
import type { Palette, Theme } from "@/lib/themes";
import { usePalettes, suggestedPalettes } from "@/hooks/usePalettes";

const PHONE_WIDTH = 390;
const SCROLL_MS = 7000;
const HOLD_MS = 1300;
/** The card's opening opens by itself this long after it starts playing. */
const INTRO_OPEN_MS = 2600;

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
export function useIsPlaying(id: string) {
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
export function sampleFor(theme: Theme) {
  const key = `${theme.category} ${theme.name}`.toLowerCase();
  if (key.includes("birthday")) return { heading: "Happy 30th, Ana", name: "Ana" };
  if (key.includes("christmas")) return { heading: "Merry Christmas, Grandpa", name: "Grandpa" };
  if (key.includes("despidida") || key.includes("farewell") || key.includes("voyage"))
    return { heading: "Bon voyage, Sam", name: "Sam" };
  if (key.includes("valentine")) return { heading: "Happy Valentine's, Leo", name: "Leo" };
  if (key.includes("pet")) return { heading: "Best boy, Milo", name: "Milo" };
  if (key.includes("new year")) return { heading: "Happy New Year, everyone", name: "the crew" };
  if (key.includes("anniversar")) return { heading: "Ten years, Liz", name: "Liz" };
  if (key.includes("baby")) return { heading: "Welcome, little June", name: "June" };
  if (key.includes("bridal") || key.includes("shower"))
    return { heading: "Showered with love, Bea", name: "Bea" };
  if (key.includes("wedding")) return { heading: "Congratulations, Nora & James", name: "Nora & James" };
  if (key.includes("handwritten")) return { heading: "A few words for you, Noor", name: "Noor" };
  if (key.includes("game")) return { heading: "Game on, Kai", name: "Kai" };
  if (key.includes("pixel")) return { heading: "Level up, Theo", name: "Theo" };
  return { heading: "Just because, Ana", name: "Ana" };
}

export function backgroundFor(theme: Theme): BackgroundStyle {
  const key = `${theme.category} ${theme.name}`.toLowerCase();
  if (key.includes("wedding") || key.includes("anniversar")) return "formal";
  if (key.includes("new year")) return "gradient";
  if (key.includes("birthday") || key.includes("pet") || key.includes("shower")) return "clean";
  return "paper";
}

/** A sample gift for previews: a friendly recipient, the theme's font and background, and the given palette. */
export function buildPreviewSite(theme: Theme, palette: Palette | undefined): GiftSite {
  const sample = sampleFor(theme);
  return {
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
    countdown_at: null,
    calendar_locked: false,
    intro_text: null,
    intro_settings: {},
    solo: false,
    character: null,
    icon_set: null,
    background_style: backgroundFor(theme),
    tree_reveal_date: null,
    tier: null,
    published_at: null,
    expires_at: null,
    created_at: new Date().toISOString(),
    password_set: false,
    password_protected: false,
    unlocked: true,
  };
}

/** The sections a theme turns on by default, as preview modules. */
/**
 * The sections a preview shows: the occasion's own picks (the same ones a new
 * gift starts with), so every theme shows off the sections that suit it.
 */
export function previewModules(theme: Theme, siteId: string): SiteModule[] {
  const preset = PRESETS[themeKindOf(theme)];
  const types = (
    preset?.length ? preset : theme.default_modules.length > 0 ? theme.default_modules : ["letters", "photobooth", "songs"]
  ) as ModuleType[];
  return types.map((type, i) => ({
    id: `${theme.id}-${i}`,
    site_id: siteId,
    module_type: type,
    price: 0,
    enabled: true,
  }));
}

/**
 * A live, non-interactive mini gift that plays like the real thing: the opening,
 * it opens by itself, a slow scroll through the gift, then back to the opening.
 * Cards that aren't playing rest on the opening's ready frame. Stills only (no
 * WebGL per card).
 */
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
  const [phase, setPhase] = useState<"intro" | "gift">("intro");
  const [introKey, setIntroKey] = useState(0);

  const { data: allPalettes = [] } = usePalettes();
  const palette = suggestedPalettes(theme, allPalettes)[0] ?? theme.palettes[0];
  const fonts = FONT_PAIRINGS[themeFont(theme)];
  const background = backgroundFor(theme);
  const sample = sampleFor(theme);

  const site: GiftSite = useMemo(
    () => buildPreviewSite(theme, palette),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [theme.id, theme.name, palette?.background, palette?.primary, palette?.accent],
  );
  const modules = useMemo(() => previewModules(theme, site.id), [theme, site.id]);

  // Scale the phone-width gift down to the card, and mount only when on screen.
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
    // Re-run once the palette arrives: before that the box isn't rendered.
  }, [id, !!palette]);

  const active = playing && !reduced && visible;

  // Stopped: back to the opening's resting frame.
  useEffect(() => {
    if (active) return;
    setPhase("intro");
    setOffset(0);
  }, [active]);

  // Playing the gift part: slow scroll, hold, then loop to the opening.
  useEffect(() => {
    if (!active || phase !== "gift") return;
    let raf = 0;
    let hold = 0;
    let start = 0;
    const viewport = (boxRef.current?.clientHeight ?? 0) / (scale || 1);
    const tick = (now: number) => {
      if (!start) start = now;
      const max = Math.max(0, (innerRef.current?.scrollHeight ?? 0) - viewport);
      const t = Math.min(1, (now - start) / SCROLL_MS);
      const eased = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
      setOffset(max * eased);
      if (t < 1) raf = requestAnimationFrame(tick);
      else
        hold = window.setTimeout(() => {
          setPhase("intro");
          setIntroKey((k) => k + 1);
        }, HOLD_MS);
    };
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      window.clearTimeout(hold);
    };
  }, [active, phase, scale]);

  useEffect(() => {
    if (phase === "intro") setOffset(0);
  }, [phase]);

  if (!palette) return null;
  const innerH = boxH / (scale || 1);

  return (
    <div
      ref={boxRef}
      className="relative size-full overflow-hidden select-none"
      style={{ backgroundColor: palette.background }}
      onMouseEnter={() => claimPreview(id)}
      onMouseLeave={() => releasePreview(id)}
      aria-hidden="true"
    >
      <Live3DContext.Provider value={false}>
        <div
          className="pointer-events-none absolute top-0 left-0 origin-top-left"
          style={{ ...themeFontVars(themeKindOf(theme)), width: PHONE_WIDTH, transform: `scale(${scale}) translateY(${-offset}px)` }}
        >
          <div ref={innerRef}>
            {mounted && visible && phase === "gift" ? (
              <GiftSiteView site={site} theme={theme} modules={modules} contributions={[]} sample />
            ) : null}
          </div>
        </div>

        {mounted && phase === "intro" && innerH > 0 ? (
          <div
            className="pointer-events-none absolute top-0 left-0 origin-top-left"
            style={{ width: PHONE_WIDTH, height: innerH, transform: `scale(${scale})` }}
          >
            <div key={introKey} className="absolute inset-0 animate-[jb-fade-in_.4s_ease_both]">
              <GiftIntro
                contained
                quick
                interactive={false}
                paused={!active}
                style={introStyleForTheme(theme.name)}
                kind={themeKindOf(theme)}
                palette={palette}
                fonts={fonts}
                backgroundStyle={background}
                recipientName={sample.name}
                autoOpenAfter={active ? INTRO_OPEN_MS : undefined}
                onOpen={() => setPhase("gift")}
              />
            </div>
          </div>
        ) : null}
      </Live3DContext.Provider>

      <span className="absolute right-2 bottom-2 z-[70] flex items-center gap-1 rounded-full bg-black/45 px-2 py-1 font-mono text-[9px] tracking-[0.12em] text-white uppercase">
        <svg viewBox="0 0 10 10" className="size-2 fill-current" aria-hidden="true">
          <path d="M2 1l7 4-7 4z" />
        </svg>
        Preview
      </span>
    </div>
  );
}
