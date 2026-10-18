/**
 * The themes gallery card: the theme's opening playing by itself (silent, a
 * few seconds, looping), the name in the theme's own display face, and one
 * button. Hover (or scroll to it on a phone) to play; click anywhere on the
 * card for the full-screen version you can open with your own hands.
 */
import { previewEngineProps } from "@/lib/engineGift";
import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useMotionValue, useSpring, useTransform } from "motion/react";
import { X } from "lucide-react";
import type { Palette, Theme } from "@/lib/themes";
import { themeKindOf } from "@/lib/themeKind";
import { TactileOpening, openingBackground } from "@/themes/TactileOpening";
import type { CharacterSetting } from "@/themes/_shared/cast/types";
import { designFor, loadFont, loadThemeFonts, themeFontVars } from "@/themes/_shared/design";
import { engineThemeForName } from "@/themes/engine/registry";
import { t, type MessageKey } from "@/i18n";
import { SPRING } from "@/themes/_shared/stage";
import { claimPreview, releasePreview, useIsPlaying } from "@/components/ThemeLivePreview";
import { GiftPeek } from "@/components/GiftPeek";
import { SampleGift } from "@/components/SampleGift";
import { themePalettes, usePalettes } from "@/hooks/usePalettes";
import { SHOWCASE_COPY } from "@/copy/strings";
import type { GiftFormat } from "@/lib/formats";

const FALLBACK: Palette = { background: "#FBF8F2", primary: "#2B2522", accent: "#B5623E" } as Palette;

/** The theme's first curated palette (themes keep them in a separate table now). */
function useThemePalette(theme: Theme | null): Palette {
  const { data: all = [] } = usePalettes();
  if (!theme) return FALLBACK;
  const p = themePalettes(theme, all)[0];
  return p ? { background: p.background, primary: p.primary, accent: p.accent } : (theme.palettes[0] ?? FALLBACK);
}
const STAGE_W = 390;
const STAGE_H = 600;
const SAMPLE_FRIENDS = ["Lia", "Jo", "Mika", "Sam", "Noor", "Theo"];

export function OpeningCard({
  theme,
  index,
  character,
  onOpen,
  onUse,
  title,
  line,
  useLabel,
  tag,
}: {
  theme: Theme;
  index: number;
  character: CharacterSetting | null;
  onOpen: () => void;
  onUse: () => void;
  /** Styles gallery: the style's name and line instead of the theme's. */
  title?: string | undefined;
  line?: string | undefined;
  useLabel?: string | undefined;
  /** A small tag beside the name ("Top pick"). */
  tag?: string | undefined;
}) {
  const kind = themeKindOf(theme);
  const design = designFor(kind);
  // Themes built on the theme engine describe themselves.
  const engine = engineThemeForName(theme.name);
  const gestureLine = engine ? t(engine.hint ?? (`gesture.${engine.gesture}.label` as MessageKey)) : design.gesture;
  const objectLine = engine ? engine.object : design.object;
  const palette = useThemePalette(theme);
  const playing = useIsPlaying(theme.id);
  const [loop, setLoop] = useState(0);
  const [peek, setPeek] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);
  const frame = useRef<HTMLDivElement | null>(null);
  const [scale, setScale] = useState(0.8);
  useEffect(() => {
    if (!engine) return loadThemeFonts(kind);
    loadFont(engine.fonts.display, "low");
  }, [kind, engine]);
  useEffect(() => {
    const el = frame.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setScale(el.clientWidth / STAGE_W));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Phones: play the card that's most on screen.
  useEffect(() => {
    const el = ref.current;
    if (!el || !window.matchMedia("(hover: none)").matches) return;
    const io = new IntersectionObserver(([e]) => (e && e.intersectionRatio > 0.7 ? claimPreview(theme.id) : releasePreview(theme.id)), { threshold: [0, 0.7, 1] });
    io.observe(el);
    return () => io.disconnect();
  }, [theme.id]);

  // Magnetic hover: the card leans a little towards the pointer.
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const x = useSpring(mx, { stiffness: 180, damping: 18 });
  const y = useSpring(my, { stiffness: 180, damping: 18 });
  const rotY = useTransform(x, (v) => v * 0.5);
  const rotX = useTransform(y, (v) => -v * 0.5);

  return (
    <motion.article
      ref={ref}
      layout
      initial={{ opacity: 0, y: 28, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.94, transition: { duration: 0.18 } }}
      transition={{ ...SPRING.soft, delay: Math.min(index, 8) * 0.06 }}
      style={{ x, y, rotateX: rotX, rotateY: rotY, transformPerspective: 900 }}
      onPointerMove={(e) => {
        if (e.pointerType !== "mouse") return;
        const r = e.currentTarget.getBoundingClientRect();
        mx.set(((e.clientX - r.left) / r.width - 0.5) * 12);
        my.set(((e.clientY - r.top) / r.height - 0.5) * 12);
      }}
      onPointerEnter={(e) => e.pointerType === "mouse" && claimPreview(theme.id)}
      onPointerLeave={() => {
        mx.set(0);
        my.set(0);
        releasePreview(theme.id);
      }}
      className="group card-paper flex cursor-pointer flex-col overflow-hidden p-2.5"
      onClick={onOpen}
      role="button"
      tabIndex={0}
      aria-label={title ? `Open ${title} full screen` : `Open the ${theme.name} theme full screen`}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onOpen();
        }
      }}
      onFocus={() => claimPreview(theme.id)}
    >
      <div ref={frame} className="relative overflow-hidden rounded-[22px]" style={{ aspectRatio: `${STAGE_W} / ${STAGE_H}`, contain: "layout paint" }}>
        {/* Drawn at phone size, then scaled to the card, so every theme is framed the same. */}
        <div
          className="pointer-events-none absolute top-0 left-0 origin-top-left [container:gift/inline-size]"
          style={{ width: STAGE_W, height: STAGE_H, transform: `scale(${scale})` }}
        >
          <GiftPeek kind={kind} palette={palette} live={peek} />
          {/* Remounting restarts the opening; the peek stays a beat so the loop feels deliberate. */}
          <TactileOpening
            key={`${loop}-${playing ? "on" : "off"}`}
            kind={kind}
            palette={palette}
            recipientName="Ana"
            character={character}
            contributors={SAMPLE_FRIENDS}
            {...previewEngineProps(theme.name, "Ana")}
            contained
            interactive={false}
            paused={!playing}
            autoplay={playing}
            onOpen={() => {
              setPeek(true);
              window.setTimeout(() => {
                setPeek(false);
                setLoop((n) => n + 1);
              }, 2600);
            }}
          />
        </div>
        <span className="absolute bottom-3 left-3 z-10 rounded-full bg-white/80 px-2.5 py-1 font-mono text-[10px] tracking-[0.14em] text-ink uppercase backdrop-blur-sm transition-opacity group-hover:opacity-0">
          {gestureLine}
        </span>
      </div>
      <div className="flex flex-1 flex-col px-2 pt-3 pb-1" style={engine ? ({ ["--jb-display" as string]: engine.fonts.display.family } as React.CSSProperties) : themeFontVars(kind)}>
        <h3 className="flex flex-wrap items-center gap-x-2 text-[1.6rem] leading-tight" style={{ fontFamily: "var(--jb-display)" }}>
          {title ?? theme.name}
          {tag ? <span className="fmt-rec font-sans" style={{ fontFamily: "var(--font-sans, inherit)" }}>{tag}</span> : null}
        </h3>
        <p className="mt-0.5 text-sm text-muted">{line ?? objectLine}</p>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onUse();
          }}
          className="squish mt-4 min-h-11 rounded-full bg-accent px-4 text-sm font-medium text-cream hover:bg-accent/90"
        >
          {useLabel ?? "Use this theme"}
        </button>
      </div>
    </motion.article>
  );
}

/** Full screen: the real, hands-on opening. */
export function OpeningPreviewModal({
  theme,
  character,
  onClose,
  onUse,
  onSample,
  useLabel,
  format,
}: {
  theme: Theme | null;
  character: CharacterSetting | null;
  onClose: () => void;
  onUse: (t: Theme) => void;
  /** "Theme details". Left out in the styles gallery. */
  onSample?: ((t: Theme) => void) | undefined;
  useLabel?: string | undefined;
  /** The layout the sample gift reads in (a style's own). */
  format?: GiftFormat | undefined;
}) {
  const [opened, setOpened] = useState(false);
  const [round, setRound] = useState(0);
  const palette = useThemePalette(theme);
  useEffect(() => {
    if (!theme) return;
    setOpened(false);
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [theme, onClose]);

  return (
    <AnimatePresence>
      {theme ? (
        <motion.div
          key={theme.id}
          role="dialog"
          aria-modal="true"
          aria-label={`${theme.name} opening`}
          className="fixed inset-0 z-[80]"
          style={{ ...(openingBackground(themeKindOf(theme)) as object) }}
          initial={{ opacity: 0, scale: 1.02 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 1.02 }}
          transition={SPRING.soft}
        >
          <div className="absolute inset-0 [container:gift/inline-size]">
            <AnimatePresence>
              {opened ? (
                <motion.div
                  key={`gift-${round}`}
                  className="absolute inset-0 z-[85] overflow-x-hidden overflow-y-auto overscroll-contain bg-paper [container:gift/inline-size]"
                  initial={{ opacity: 0, scale: 0.985, filter: "blur(6px)" }}
                  animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
                  exit={{ opacity: 0, transition: { duration: 0.2 } }}
                  transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                >
                  <motion.span
                    className="pointer-events-none sticky top-3 z-[2] mx-auto block w-fit rounded-full bg-ink/80 px-3 py-1 font-mono text-[10px] tracking-[0.16em] text-paper uppercase backdrop-blur"
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.8, duration: 0.4 }}
                  >
                    {SHOWCASE_COPY.chip}
                  </motion.span>
                  <div className="relative -mt-7 pb-28">
                    <SampleGift theme={theme} palette={palette} {...(format ? { format } : {})} />
                  </div>
                </motion.div>
              ) : null}
            </AnimatePresence>
            <TactileOpening
              key={round}
              kind={themeKindOf(theme)}
              palette={palette}
              recipientName="Ana"
              character={character}
              contributors={SAMPLE_FRIENDS}
              {...previewEngineProps(theme.name, "Ana")}
              contained
              onOpen={() => setOpened(true)}
              onSkip={() => setOpened(true)}
            />
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="absolute top-3 left-3 z-[90] grid size-10 place-items-center rounded-full bg-white/85 text-ink shadow"
          >
            <X className="size-4" aria-hidden="true" />
          </button>
          <AnimatePresence>
            {opened ? (
              <motion.div
                className="pointer-events-none absolute inset-x-0 bottom-0 z-[90] flex justify-center px-4 pb-5"
                initial={{ opacity: 0, y: 40 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 40 }}
                transition={{ ...SPRING.soft, delay: 0.35 }}
              >
                <div className="pointer-events-auto flex w-full max-w-md items-center gap-1.5 rounded-full bg-white/90 p-1.5 shadow-[0_18px_40px_-16px_rgba(43,37,34,.45)] ring-1 ring-ink/5 backdrop-blur-md">
                  <button
                    type="button"
                    onClick={() => {
                      setOpened(false);
                      setRound((n) => n + 1);
                    }}
                    className="min-h-11 shrink-0 rounded-full px-2.5 text-[12.5px] font-medium whitespace-nowrap text-ink/75 hover:bg-ink/5 hover:text-ink"
                  >
                    {SHOWCASE_COPY.again}
                  </button>
                  <button type="button" onClick={() => onUse(theme)} className="squish min-h-11 flex-1 rounded-full bg-accent px-4 text-[15px] font-medium whitespace-nowrap text-cream">
                    {useLabel ?? SHOWCASE_COPY.use}
                  </button>
                  {onSample ? (
                    <button type="button" onClick={() => onSample(theme)} className="min-h-11 shrink-0 rounded-full px-2.5 text-[12.5px] font-medium whitespace-nowrap text-ink/75 hover:bg-ink/5 hover:text-ink">
                      {SHOWCASE_COPY.details}
                    </button>
                  ) : null}
                </div>
              </motion.div>
            ) : null}
          </AnimatePresence>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
