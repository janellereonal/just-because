/**
 * What's behind the opening in the gallery: a glimpse of a finished gift in
 * the theme's own palette and type, so the reveal lands somewhere instead of
 * on a blank card. Notes float in once the object opens.
 */
import { motion } from "motion/react";
import type { Palette } from "@/lib/themes";
import type { ThemeKind } from "@/lib/themeKind";
import { themeFontVars } from "@/themes/_shared/design";
import { SPRING } from "@/themes/_shared/stage";
import { readableInk } from "@/lib/palettes";

const NOTES = [
  { who: "Lia", text: "Every year with you is my favourite year." },
  { who: "Jo", text: "Remember the rooftop? Still the best night." },
  { who: "Mika", text: "We made you a thing. Keep scrolling." },
];

export function GiftPeek({ kind, palette, recipient = "Ana", live }: { kind: ThemeKind; palette: Palette; recipient?: string; live: boolean }) {
  const ink = readableInk(palette.background);
  return (
    <div
      aria-hidden="true"
      className="absolute inset-0 overflow-hidden"
      style={{ background: `radial-gradient(120% 80% at 50% 0%, ${palette.accent}22, transparent 60%), ${palette.background}`, color: ink, ...(themeFontVars(kind) as object) }}
    >
      <div className="mx-auto flex h-full w-full max-w-[440px] flex-col items-center px-[7%] pt-[16%] text-center">
        <motion.p
          className="font-mono text-[10px] tracking-[.3em] uppercase opacity-60"
          initial={false}
          animate={{ opacity: live ? 0.6 : 0, y: live ? 0 : 10 }}
          transition={{ ...SPRING.soft, delay: 0.25 }}
        >
          A gift for
        </motion.p>
        <motion.h4
          className="mt-1 text-[64px] leading-none"
          style={{ fontFamily: "var(--jb-display)", color: palette.primary === palette.background ? ink : palette.primary }}
          initial={false}
          animate={{ opacity: live ? 1 : 0, scale: live ? 1 : 0.9 }}
          transition={{ ...SPRING.soft, delay: 0.32 }}
        >
          {recipient}
        </motion.h4>
        <div className="relative mt-8 w-full flex-1">
          {NOTES.map((n, i) => (
            <motion.div
              key={n.who}
              className="absolute left-1/2 w-[78%] rounded-2xl p-4 text-left text-[15px] leading-snug shadow-[0_18px_30px_-20px_rgba(0,0,0,.45)]"
              style={{ top: i * 92, marginLeft: "-39%", background: i === 1 ? palette.accent : "#FFFFFF", color: i === 1 ? readableInk(palette.accent) : "#2B2522", fontFamily: "var(--jb-text)" }}
              initial={false}
              animate={live ? { opacity: 1, y: 0, rotate: (i - 1) * 3 } : { opacity: 0, y: 60, rotate: 0 }}
              transition={{ ...SPRING.wobbly, delay: 0.45 + i * 0.12 }}
            >
              {n.text}
              <span className="mt-2 block text-[13px] font-semibold opacity-70">{n.who}</span>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
