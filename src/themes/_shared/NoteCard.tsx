/**
 * A friend's note, made from the theme's own material: a folded love note,
 * liner notes from a record sleeve, a balloon tag, a guestbook page, a card
 * pegged to a clothesline, an ornament tag, a toast card, a postcard or a
 * treat tag. Each one arrives with its own little motion as it scrolls in.
 * The reveal continues the story the opening started.
 */
import { motion, useReducedMotion, type TargetAndTransition } from "motion/react";
import type { ThemeKind } from "@/lib/themeKind";
import { designFor } from "@/themes/_shared/design";
import { SPRING } from "@/themes/_shared/stage";

type Props = {
  kind: ThemeKind;
  text: string;
  author: string;
  /** Readable accent from the gift palette, for the signature. */
  accent: string;
  index: number;
  muted?: boolean;
};

type Material = {
  /** The card itself. */
  shell: (i: number) => { className: string; style: React.CSSProperties };
  /** Things around the text: seals, strings, stamps. */
  decor?: (i: number) => React.ReactNode;
  from: (i: number) => TargetAndTransition;
  transition?: object;
  /** Resting tilt, so a stack of notes looks placed by hand. */
  rest?: (i: number) => number;
  /** Text color when the card is dark. */
  ink?: string;
  pad?: string;
};

const tilt = (i: number, a = 1.2) => ((i % 4) - 1.5) * a;

function materials(kind: ThemeKind): Material {
  const d = designFor(kind).palette;
  switch (kind) {
    case "valentine":
      return {
        rest: (i) => tilt(i),
        shell: (i) => ({
          className: "rounded-[3px]",
          style: {
            background: `linear-gradient(180deg, #FFFDF9 0 49.7%, #F6EDE5 50%, #FFFDF9 50.3%)`,
            boxShadow: "0 18px 30px -22px rgba(110,26,38,.55), 0 1px 0 rgba(0,0,0,.04)",
          },
        }),
        decor: () => <Seal color={d.oxblood!} />,
        from: () => ({ opacity: 0, rotateX: -80, y: -20 }),
        transition: SPRING.heavy,
      };
    case "anniversary":
      return {
        rest: (i) => tilt(i, 0.8),
        shell: (i) => ({
          className: "rounded-[2px]",
          style: {
            background: `linear-gradient(135deg, #F7EEDC, #EFE0C2)`,
            boxShadow: "0 20px 30px -22px rgba(42,27,20,.6)",
          },
        }),
        decor: (i) => (
          <>
            <span className="absolute top-3 right-3 grid size-11 place-items-center rounded-full" style={{ background: `radial-gradient(circle, ${d.champagne} 0 18%, ${d.plum} 19% 62%, #1C1210 63%)` }} aria-hidden="true" />
            <span className="absolute top-4 left-5 text-[10px] tracking-[0.25em] uppercase opacity-60" style={{ fontFamily: "var(--jb-text)" }}>
              Side {i % 2 ? "B" : "A"} · Track {(i % 9) + 1}
            </span>
          </>
        ),
        from: (i) => ({ opacity: 0, x: i % 2 ? 60 : -60, rotate: i % 2 ? 4 : -4 }),
        transition: SPRING.soft,
        pad: "pt-11 pr-16",
      };
    case "birthday":
      return {
        rest: (i) => tilt(i, 1.6),
        shell: (i) => ({
          className: "rounded-[22px] rounded-tl-[4px]",
          style: {
            background: i % 3 === 0 ? `${d.butter}` : i % 3 === 1 ? `${d.mint}` : `#FFE3EE`,
            color: "#2B2522",
            boxShadow: "0 18px 28px -20px rgba(36,48,135,.5)",
          },
        }),
        decor: () => <TagHole string={d.cobalt!} />,
        from: () => ({ opacity: 0, y: 70, rotate: -6 }),
        transition: SPRING.wobbly,
        ink: "#2B2522",
      };
    case "wedding":
    case "bridal":
      return {
        shell: () => ({
          className: "rounded-[2px]",
          style: {
            background: `repeating-linear-gradient(transparent 0 29px, ${d.sage}33 29px 30px), linear-gradient(180deg, #FFFEFA, ${d.paper})`,
            boxShadow: `inset 0 0 0 1px ${d.gold}55, inset 0 0 0 6px #FFFEFA, inset 0 0 0 7px ${d.gold}33, 0 16px 30px -24px rgba(60,55,40,.5)`,
          },
        }),
        from: () => ({ opacity: 0, y: 26, scale: 0.98 }),
        transition: SPRING.soft,
        ink: "#3A3A33",
        pad: "px-7 py-7",
      };
    case "baby":
      return {
        rest: (i) => tilt(i, 1.4),
        shell: (i) => ({
          className: "rounded-[14px]",
          style: {
            background: i % 3 === 0 ? `${d.blue}` : i % 3 === 1 ? `${d.butter}` : `${d.blush}`,
            color: "#3D4660",
            boxShadow: "0 18px 26px -20px rgba(61,70,96,.5)",
            transformOrigin: "50% -14px",
          },
        }),
        decor: () => <Pegs />,
        from: (i) => ({ opacity: 0, rotate: i % 2 ? 14 : -14, y: -10 }),
        transition: SPRING.wobbly,
        ink: "#3D4660",
        pad: "pt-9",
      };
    case "christmas":
    case "default":
      if (kind === "default") break;
      return {
        rest: (i) => tilt(i, 1.2),
        shell: (i) => ({
          className: "rounded-[10px]",
          style: {
            background: `linear-gradient(160deg, #E7D3B4, #D8BF98)`,
            color: "#2E2418",
            boxShadow: "0 18px 28px -20px rgba(0,0,0,.45), inset 0 0 0 1px rgba(0,0,0,.05)",
            clipPath: "polygon(14% 0, 86% 0, 100% 10%, 100% 100%, 0 100%, 0 10%)",
            transformOrigin: "50% 0",
          },
        }),
        decor: () => <TagHole string={d.cranberry!} twine />,
        from: (i) => ({ opacity: 0, rotate: i % 2 ? 18 : -18 }),
        transition: SPRING.wobbly,
        ink: "#2E2418",
        pad: "pt-10",
      };
    case "newyear":
      return {
        rest: (i) => tilt(i, 0.8),
        shell: (i) => ({
          className: "rounded-[16px]",
          style: {
            background: `radial-gradient(120% 80% at 50% 0%, ${d.violet}33, transparent 60%), ${d.navy}`,
            boxShadow: `inset 0 0 0 1px ${d.gold}88, 0 22px 34px -24px rgba(7,10,26,.8)`,
          },
        }),
        decor: () => <Flute gold={d.gold!} />,
        from: (i) => ({ opacity: 0, rotate: i % 2 ? 10 : -10, scale: 0.9 }),
        transition: SPRING.snappy,
        ink: "#F3EEDF",
        pad: "pr-14",
      };
    case "voyage":
      return {
        rest: (i) => tilt(i, 1.4),
        shell: (i) => ({
          className: "rounded-[4px]",
          style: {
            background: `linear-gradient(90deg, transparent calc(68% - 1px), ${d.ink}22 calc(68% - 1px) 68%, transparent 68%), ${d.cream}`,
            boxShadow: "0 18px 28px -20px rgba(34,48,63,.5)",
          },
        }),
        decor: (i) => <PostStamp i={i} orange={d.orange!} sky={d.sky!} ink={d.ink!} />,
        from: (i) => ({ opacity: 0, x: i % 2 ? 80 : -80, rotate: i % 2 ? 8 : -8 }),
        transition: SPRING.soft,
        ink: d.ink!,
        pad: "pr-[36%]",
      };
    case "pets":
      return {
        rest: (i) => tilt(i, 1.4),
        shell: (i) => ({
          className: "rounded-[40px]",
          style: {
            background: i % 2 ? d.peach : "#FFF6EA",
            color: d.ink!,
            boxShadow: `inset 0 0 0 2px ${d.terracotta}33, 0 16px 26px -20px rgba(58,42,34,.5)`,
          },
        }),
        decor: () => <Paw color={d.terracotta!} />,
        from: () => ({ opacity: 0, y: 40, scale: 0.85 }),
        transition: SPRING.wobbly,
        ink: d.ink!,
        pad: "px-8",
      };
    case "handwritten":
      // Lined paper with a margin, a strip of washi tape, placed a little crooked.
      return {
        rest: (i) => tilt(i, 1.6),
        shell: (i) => ({
          className: "rounded-[2px]",
          style: {
            background: `linear-gradient(90deg, transparent 0 34px, ${d.rose}55 34px 35px, transparent 35px), repeating-linear-gradient(180deg, transparent 0 25px, ${d.ink}1c 25px 26px), ${i % 3 === 2 ? "#FFF8EE" : d.paper}`,
            backgroundPosition: "0 0, 0 14px, 0 0",
            color: d.ink!,
            boxShadow: "0 1px 0 rgba(0,0,0,.04), 0 16px 26px -20px rgba(60,50,35,.5)",
            fontFamily: "var(--jb-text)",
          },
        }),
        decor: (i) => <Tape color={i % 2 ? d.rose! : d.kraft!} />,
        from: (i) => ({ opacity: 0, y: 30, rotate: i % 2 ? 6 : -6 }),
        transition: SPRING.soft,
        ink: d.ink!,
        pad: "pl-12 pr-7 pt-9",
      };
    case "game":
      // A game card: thick outline, a hard offset shadow, a suit in the corner.
      return {
        rest: (i) => tilt(i, 1),
        shell: (i) => ({
          className: "rounded-[18px]",
          style: {
            background: d.cream,
            color: d.navy!,
            boxShadow: `inset 0 0 0 3px ${d.navy}, 6px 6px 0 ${[d.cranberry, d.mint, d.butter, d.sky][i % 4]}`,
          },
        }),
        decor: (i) => <Suit color={[d.cranberry, d.mint, d.sky, d.navy][i % 4]!} index={i} />,
        from: (i) => ({ opacity: 0, y: 40, rotate: i % 2 ? 12 : -12, scale: 0.9 }),
        transition: SPRING.wobbly,
        ink: d.navy!,
      };
    case "pixel":
      // A dialog box from an old game: square, a stepped border, a blinking arrow.
      return {
        shell: () => ({
          className: "rounded-none",
          style: {
            background: d.night,
            color: d.snow!,
            boxShadow: `0 -4px 0 0 ${d.snow}, 0 4px 0 0 ${d.snow}, -4px 0 0 0 ${d.snow}, 4px 0 0 0 ${d.snow}, 0 0 0 4px ${d.violet}, 8px 8px 0 4px rgba(0,0,0,.25)`,
            fontFamily: "var(--jb-text)",
          },
        }),
        decor: () => <PixelArrow color={d.mint!} />,
        from: () => ({ opacity: 0, scaleY: 0.1 }),
        transition: { type: "spring", stiffness: 520, damping: 30 },
        ink: d.snow!,
      };
    default:
      break;
  }
  return {
    shell: () => ({ className: "sb-letter bg-[var(--gift-surface)]", style: {} }),
    from: () => ({ opacity: 0, y: 24 }),
    transition: SPRING.soft,
  };
}

export function NoteCard({ kind, text, author, accent, index, muted = false }: Props) {
  const m = materials(kind);
  const reduce = useReducedMotion();
  const shell = m.shell(index);
  const enter = reduce ? { opacity: 0 } : m.from(index);
  return (
    <motion.article
      className={`relative p-6 ${m.pad ?? ""} ${shell.className}`}
      style={{ ...(shell.style as object), ...(m.ink ? { color: m.ink } : {}), opacity: muted ? 0.8 : undefined, transformPerspective: 900 }}
      initial={enter}
      whileInView={{ opacity: muted ? 0.8 : 1, x: 0, y: 0, rotateX: 0, scale: 1, rotate: m.rest?.(index) ?? 0 }}
      viewport={{ once: true, amount: "some", margin: "0px 0px -12% 0px" }}
      transition={{ ...(m.transition ?? SPRING.soft), delay: reduce ? 0 : (index % 2) * 0.08 }}
    >
      {m.decor?.(index)}
      <p className="relative leading-relaxed whitespace-pre-line">{text}</p>
      <p className="sb-hand relative mt-4 text-xl" style={{ color: m.ink ? undefined : accent, opacity: m.ink ? 0.85 : 1 }}>
        {author}
      </p>
    </motion.article>
  );
}

/* ---------- small materials ---------- */

function Seal({ color }: { color: string }) {
  return (
    <span className="absolute top-1/2 -right-3 grid size-9 -translate-y-1/2 place-items-center rounded-full" style={{ background: `radial-gradient(circle at 35% 30%, ${color}CC, ${color})`, boxShadow: "0 3px 6px -2px rgba(0,0,0,.4)" }} aria-hidden="true">
      <svg viewBox="0 0 24 24" className="size-4" fill="rgba(255,255,255,.75)">
        <path d="M12 21s-8-5-8-11a4.5 4.5 0 0 1 8-2.8A4.5 4.5 0 0 1 20 10c0 6-8 11-8 11z" />
      </svg>
    </span>
  );
}

function TagHole({ string, twine = false }: { string: string; twine?: boolean }) {
  return (
    <>
      <span className="absolute top-3 left-1/2 size-3 -translate-x-1/2 rounded-full bg-[var(--gift-surface,#fff)]" style={{ boxShadow: "inset 0 1px 2px rgba(0,0,0,.35)" }} aria-hidden="true" />
      <span className="absolute -top-8 left-1/2 h-10 w-[2px] -translate-x-1/2" style={{ background: twine ? "repeating-linear-gradient(180deg,#C9A57A 0 3px,#A8865C 3px 6px)" : string }} aria-hidden="true" />
    </>
  );
}

function Pegs() {
  return (
    <>
      <span className="absolute -top-4 right-0 left-0 h-[2px] bg-[#B9A98E]" aria-hidden="true" />
      {[22, 78].map((x) => (
        <span key={x} className="absolute -top-6 h-8 w-[9px] -translate-x-1/2 rounded-[3px]" style={{ left: `${x}%`, background: "linear-gradient(90deg,#E9D6B2,#D6BE93)", boxShadow: "0 2px 3px rgba(0,0,0,.18)" }} aria-hidden="true" />
      ))}
    </>
  );
}

function Flute({ gold }: { gold: string }) {
  return (
    <svg className="absolute top-5 right-5 h-12 w-6" viewBox="0 0 24 48" aria-hidden="true">
      <path d="M6 2h12l-2 20a4 4 0 0 1-8 0z" fill={`${gold}55`} stroke={gold} strokeWidth="1.2" />
      <path d="M12 26v16M7 44h10" stroke={gold} strokeWidth="1.4" strokeLinecap="round" />
      {[6, 10, 14].map((y, i) => (
        <circle key={y} cx={10 + i * 2} cy={y} r="0.9" fill="#FFF6DD" />
      ))}
    </svg>
  );
}

function PostStamp({ i, orange, sky, ink }: { i: number; orange: string; sky: string; ink: string }) {
  return (
    <>
      <span
        className="absolute top-4 right-4 grid h-14 w-12 place-items-center"
        style={{
          background: i % 2 ? sky : orange,
          boxShadow: "0 0 0 3px #fff",
          WebkitMaskImage: "radial-gradient(circle 2.2px at 2.5px 2.5px, transparent 98%, #000) -2.5px -2.5px / 6px 6px",
          maskImage: "radial-gradient(circle 2.2px at 2.5px 2.5px, transparent 98%, #000) -2.5px -2.5px / 6px 6px",
        }}
        aria-hidden="true"
      >
        <svg viewBox="0 0 24 24" className="size-6" fill="#fff">
          <path d="M21 15.5v-2l-8-5V3.5a1.5 1.5 0 0 0-3 0v5l-8 5v2l8-2.5v5.5l-2 1.5V22l3.5-1 3.5 1v-1.5l-2-1.5V13z" />
        </svg>
      </span>
      <motion.span
        className="absolute top-10 right-12 grid size-14 place-items-center rounded-full text-[7px] font-bold tracking-[0.18em] uppercase"
        style={{ boxShadow: `inset 0 0 0 1.5px ${ink}88`, color: `${ink}AA`, fontFamily: "var(--jb-text)", rotate: -14 }}
        aria-hidden="true"
      >
        Posted
      </motion.span>
    </>
  );
}

function Paw({ color }: { color: string }) {
  return (
    <svg className="absolute -top-3 -right-1 size-9 rotate-12" viewBox="0 0 24 24" aria-hidden="true">
      <path fill={color} d="M12 13c-3 0-6 3-6 5.5S8 22 12 21s6 .5 6-2.5S15 13 12 13zM5 8.5a2.3 2.8 0 1 0 0 .1zM9 4a2.3 2.8 0 1 0 0 .1zM15 4a2.3 2.8 0 1 0 0 .1zM19 8.5a2.3 2.8 0 1 0 0 .1z" />
    </svg>
  );
}

/** A strip of washi tape across the top edge. */
function Tape({ color }: { color: string }) {
  return (
    <span
      aria-hidden="true"
      className="pointer-events-none absolute -top-3 left-1/2 block h-6 w-20 -translate-x-1/2 -rotate-3"
      style={{ background: `repeating-linear-gradient(90deg, ${color}aa 0 6px, ${color}88 6px 12px)`, boxShadow: "0 1px 2px rgba(0,0,0,.08)", clipPath: "polygon(3% 0, 97% 4%, 100% 50%, 96% 100%, 2% 96%, 0 50%)" }}
    />
  );
}

/** A card suit in the corner of a game card. */
function Suit({ color, index }: { color: string; index: number }) {
  const glyph = ["♠", "♥", "♣", "♦"][index % 4];
  return (
    <span aria-hidden="true" className="pointer-events-none absolute top-3 right-4 text-lg leading-none" style={{ color }}>
      {glyph}
    </span>
  );
}

/** The "more text" arrow in the corner of a pixel dialog box. */
function PixelArrow({ color }: { color: string }) {
  return (
    <span aria-hidden="true" className="pointer-events-none absolute right-4 bottom-3 block size-[10px] motion-safe:animate-pulse" style={{ background: color, clipPath: "polygon(0 0, 100% 0, 50% 100%)" }} />
  );
}
