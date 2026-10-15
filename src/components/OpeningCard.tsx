/**
 * The themes gallery card: the theme's opening playing by itself (silent, a
 * few seconds, looping), the name in the theme's own display face, and one
 * button. Hover (or scroll to it on a phone) to play; click anywhere on the
 * card for the full-screen version you can open with your own hands.
 */
import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useMotionValue, useSpring, useTransform } from "motion/react";
import { X } from "lucide-react";
import type { Palette, Theme } from "@/lib/themes";
import { themeKindOf } from "@/lib/themeKind";
import { TactileOpening, openingBackground } from "@/themes/TactileOpening";
import type { CharacterSetting } from "@/themes/_shared/cast/types";
import { designFor, loadThemeFonts, themeFontVars } from "@/themes/_shared/design";
import { SPRING } from "@/themes/_shared/stage";
import { claimPreview, releasePreview, useIsPlaying } from "@/components/ThemeLivePreview";
import { GiftPeek } from "@/components/GiftPeek";

const FALLBACK: Palette = { background: "#FBF8F2", primary: "#2B2522", accent: "#B5623E" } as Palette;
const STAGE_W = 390;
const STAGE_H = 600;
const SAMPLE_FRIENDS = ["Lia", "Jo", "Mika", "Sam", "Noor", "Theo"];

export function OpeningCard({
  theme,
  index,
  character,
  onOpen,
  onUse,
}: {
  theme: Theme;
  index: number;
  character: CharacterSetting | null;
  onOpen: () => void;
  onUse: () => void;
}) {
  const kind = themeKindOf(theme);
  const design = designFor(kind);
  const playing = useIsPlaying(theme.id);
  const [loop, setLoop] = useState(0);
  const [peek, setPeek] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);
  const frame = useRef<HTMLDivElement | null>(null);
  const [scale, setScale] = useState(0.8);
  useEffect(() => loadThemeFonts(kind), [kind]);
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
      aria-label={`Open the ${theme.name} theme full screen`}
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
          <GiftPeek kind={kind} palette={theme.palettes[0] ?? FALLBACK} live={peek} />
          {/* Remounting restarts the opening; the peek stays a beat so the loop feels deliberate. */}
          <TactileOpening
            key={`${loop}-${playing ? "on" : "off"}`}
            kind={kind}
            palette={theme.palettes[0] ?? FALLBACK}
            recipientName="Ana"
            character={character}
            contributors={SAMPLE_FRIENDS}
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
          {design.gesture}
        </span>
      </div>
      <div className="flex flex-1 flex-col px-2 pt-3 pb-1" style={themeFontVars(kind)}>
        <h3 className="text-[1.6rem] leading-tight" style={{ fontFamily: "var(--jb-display)" }}>
          {theme.name}
        </h3>
        <p className="mt-0.5 text-sm text-muted">{design.object}</p>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onUse();
          }}
          className="squish mt-4 min-h-11 rounded-full bg-accent px-4 text-sm font-medium text-cream hover:bg-accent/90"
        >
          Use this theme
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
}: {
  theme: Theme | null;
  character: CharacterSetting | null;
  onClose: () => void;
  onUse: (t: Theme) => void;
  onSample: (t: Theme) => void;
}) {
  const [opened, setOpened] = useState(false);
  const [round, setRound] = useState(0);
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
            <GiftPeek kind={themeKindOf(theme)} palette={theme.palettes[0] ?? FALLBACK} live={opened} />
            <TactileOpening
              key={round}
              kind={themeKindOf(theme)}
              palette={theme.palettes[0] ?? FALLBACK}
              recipientName="Ana"
              character={character}
              contributors={SAMPLE_FRIENDS}
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
                className="absolute inset-x-0 bottom-0 z-[90] flex flex-col items-center gap-3 bg-gradient-to-t from-black/50 to-transparent px-4 pt-16 pb-8"
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 30 }}
                transition={SPRING.soft}
              >
                <button type="button" onClick={() => onUse(theme)} className="squish min-h-12 w-full max-w-xs rounded-full bg-accent px-6 text-base font-medium text-cream">
                  Use this theme
                </button>
                <div className="flex gap-5 text-sm text-white">
                  <button type="button" onClick={() => { setOpened(false); setRound((n) => n + 1); }} className="underline underline-offset-4">
                    Open it again
                  </button>
                  <button type="button" onClick={() => onSample(theme)} className="underline underline-offset-4">
                    See a whole gift
                  </button>
                </div>
              </motion.div>
            ) : null}
          </AnimatePresence>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
