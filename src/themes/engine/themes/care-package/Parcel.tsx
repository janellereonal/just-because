/**
 * The parcel, for Care Package and Balikbayan Box. A cardboard box seen from
 * a little above: tape along the seam of the top flaps, a label with where
 * it's going and where it came from. Peel the tape, the flaps open, and
 * friends' notes come out as things packed inside: a folded letter, a photo in
 * a frame, a little jar, something small. Tap one to read it.
 *
 * Balikbayan Box adds what a real one has: tape everywhere, printed markings,
 * a cargo label, and the name written on the side in marker.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { motion, useTransform } from "motion/react";
import { material, noise, shade } from "@/themes/engine/materials";
import { particlesFrom } from "@/themes/engine/particles";
import { NoteBubble } from "@/themes/engine/ui/NoteBubble";
import { Greeting } from "@/themes/_shared/opening";
import { t, type MessageKey } from "@/i18n";
import type { EngineNote, EngineObjectProps } from "@/themes/engine/define";

type ItemKind = "letter" | "photo" | "jar" | "toy";
const ITEM_LABEL: Record<ItemKind, MessageKey> = { letter: "theme.parcel.letter", photo: "theme.parcel.photo", jar: "theme.parcel.jar", toy: "theme.parcel.toy" };
/** Where things land once they're out, as % of the parcel's width (x) and height (y). */
const LANDING: [number, number, number][] = [
  [17, 21, -10],
  [39, 14, 4],
  [61, 15, -3],
  [83, 22, 9],
];

export default function Parcel(p: EngineObjectProps) {
  const { slots, palette, gesture, reduced, hostRef, notes, setHint, greeting, interactive, theme } = p;
  const bb = theme.id === "balikbayan-box";
  const insideRef = useRef<HTMLDivElement | null>(null);
  const [open, setOpen] = useState<{ note: EngineNote; kind: ItemKind } | null>(null);

  // Pick what comes out: the first letter, the first photo, then whatever's next.
  const items = useMemo(() => {
    const pool = notes.filter((n) => n.text || n.media);
    const used = new Set<string>();
    const take = (pred: (n: EngineNote) => boolean) => {
      const n = pool.find((x) => !used.has(x.id) && pred(x));
      if (n) used.add(n.id);
      return n;
    };
    const out: { kind: ItemKind; note: EngineNote | undefined }[] = [
      { kind: "letter", note: take((n) => !!n.text && (n.kind === "letters" || n.kind === "openwhen")) ?? take((n) => !!n.text) },
      { kind: "photo", note: take((n) => !!n.media && n.kind === "photobooth") },
      { kind: "jar", note: take(() => true) },
      { kind: "toy", note: take(() => true) },
    ];
    return out;
  }, [notes]);
  const withNotes = items.filter((i) => i.note).length;

  useEffect(() => {
    if (!gesture.done) return;
    particlesFrom("confetti", hostRef.current, insideRef.current, { colors: [palette.accent, palette.accent2, "#FFD166", "#FFFFFF"] });
    if (interactive && withNotes) setHint(t("theme.parcel.inside"));
  }, [gesture.done, hostRef, interactive, palette, setHint, withNotes]);

  const tint = palette.surface;
  const peeled = useTransform(gesture.progress, (v) => `${v * 100}%`);
  const curl = useTransform(gesture.progress, (v) => (v > 0.02 ? -30 * Math.min(1, v * 3) : 0));
  const flap = (front: boolean) =>
    gesture.done ? (reduced ? { opacity: 0 } : { rotateX: front ? 118 : -122, opacity: 1 }) : { rotateX: 0, opacity: 1 };

  return (
    <div className="relative" style={{ width: "min(86cqi, 400px, calc((100cqh - 64px) * 0.7))", aspectRatio: bb ? "1 / 1.42" : "1 / 1.32" }}>
      {/* The greeting, up top once it's open */}
      <div className="absolute inset-x-[-6%] top-[-6%] z-[6] text-center" style={{ color: palette.ink }}>
        {gesture.done ? (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: reduced ? 0 : 1.1 }}>
            <Greeting text={greeting} className={bb ? "text-[clamp(1.3rem,6.6cqi,2.1rem)]" : "text-[clamp(1.3rem,6.4cqi,2rem)]"} style={{ fontStyle: bb ? "normal" : "italic", fontWeight: 500 }} />
          </motion.div>
        ) : null}
      </div>

      {items.map((it, i) => {
          const [x, y, r] = LANDING[i]!;
          return (
            <motion.button
              key={it.kind}
              type="button"
              disabled={!gesture.done || !it.note || !interactive}
              onClick={() => it.note && setOpen({ note: it.note, kind: it.kind })}
              aria-label={it.note ? `Note from ${it.note.author} (${t(ITEM_LABEL[it.kind]).toLowerCase()})` : t(ITEM_LABEL[it.kind])}
              className="absolute z-[4] w-[23%] -translate-x-1/2 outline-none disabled:cursor-default focus-visible:ring-4 focus-visible:ring-white/80"
              style={{ left: `${x}%`, top: `${y}%` }}
              initial={false}
              animate={
                gesture.done
                  ? { y: "0%", rotate: r, opacity: it.note || !interactive ? 1 : 0.55, scale: 1 }
                  : { y: "120%", rotate: 0, opacity: 0, scale: 0.7 }
              }
              transition={reduced ? { duration: 0 } : { type: "spring", stiffness: 120, damping: 14, delay: 0.35 + i * 0.14 }}
              whileHover={gesture.done && it.note ? { y: "-6%" } : {}}
            >
              <Item kind={it.kind} note={it.note} accent={palette.accent} accent2={palette.accent2} />
            </motion.button>
          );
        })}

      <div className="absolute inset-x-0 bottom-0" style={{ aspectRatio: bb ? "1 / 1.06" : "1 / 0.92" }}>
        {/* Things packed inside, coming out */}
        <div ref={insideRef} className="absolute inset-x-[8%] top-[6%] z-[3] h-[10%]" />
        {/* Top of the box: two flaps meeting at the seam, taped */}
        <div className="absolute inset-x-0 top-0 z-[2] h-[30%]" style={{ perspective: 700, transformStyle: "preserve-3d" }}>
          <div className="absolute inset-0 origin-bottom" style={{ transform: "rotateX(52deg)", transformStyle: "preserve-3d" }}>
            {/* Inside of the box */}
            <div className="absolute inset-0" style={{ background: shade(tint, -0.55), boxShadow: "inset 0 10px 22px rgba(0,0,0,.55)" }} />
            <motion.div className="absolute inset-x-0 top-0 h-1/2 origin-top" style={{ ...(material("cardboard", { tint: shade(tint, 0.08), lift: 0, radius: 2 }) as object), backfaceVisibility: "visible" }} animate={flap(false)} transition={{ type: "spring", stiffness: 70, damping: 12 }} />
            <motion.div className="absolute inset-x-0 bottom-0 h-1/2 origin-bottom" style={{ ...(material("cardboard", { tint: shade(tint, 0.12), lift: 0, radius: 2 }) as object) }} animate={flap(true)} transition={{ type: "spring", stiffness: 70, damping: 12, delay: 0.08 }} />
          </div>
          {/* The tape along the seam: what you peel */}
          {!gesture.done ? (
            <div
              {...gesture.bind}
              className="absolute inset-x-[-4%] top-[46%] z-[3] h-[22%] -translate-y-1/2 cursor-grab outline-none focus-visible:ring-4 focus-visible:ring-white/80 active:cursor-grabbing"
            >
              <motion.div
                className="absolute inset-y-[18%] right-0"
                style={{
                  left: peeled,
                  backgroundColor: bb ? "rgba(150,108,62,.94)" : "rgba(214,188,140,.92)",
                  backgroundImage: `${noise(1.6, 0.1)}, linear-gradient(180deg, rgba(255,255,255,.3), rgba(255,255,255,0) 45%, rgba(0,0,0,.1))`,
                  boxShadow: "0 1px 0 rgba(255,255,255,.5) inset, 0 2px 3px rgba(60,40,20,.25)",
                  transformOrigin: "0% 50%",
                  rotate: curl,
                }}
              />
              <motion.span className="absolute top-1/2 grid size-9 -translate-y-1/2 place-items-center rounded-full text-sm font-bold text-white shadow-md" style={{ left: peeled, background: palette.accent, x: -10 }} aria-hidden>
                →
              </motion.span>
            </div>
          ) : null}
        </div>

        {/* Front of the box */}
        <div className="absolute inset-x-0 top-[30%] bottom-0 z-[1] overflow-hidden" style={material("cardboard", { tint, lift: 0.85, radius: 4 })}>
          {/* Depth: the right edge turns away from the light */}
          <div className="pointer-events-none absolute inset-y-0 right-0 w-[12%]" style={{ background: "linear-gradient(90deg, transparent, rgba(0,0,0,.16))" }} />
          {bb ? <BalikbayanFront {...p} /> : <CareFront {...p} />}
        </div>
      </div>
      <NoteBubble note={open?.note ?? null} onClose={() => setOpen(null)} accent={palette.accent} title={open ? t(ITEM_LABEL[open.kind]) : undefined} {...(bb ? { font: "var(--jb-text)" } : {})} />
    </div>
  );
}

/* ---------- fronts ---------- */

function Stamp({ label, color, rotate, glyph, holes }: { label: string; color: string; rotate: number; glyph: string; holes: string }) {
  return (
    <div className="relative grid aspect-[0.82] w-full place-items-center p-[6%]" style={{ transform: `rotate(${rotate}deg)`, background: "#FFFDF7", border: `3px dotted ${holes}`, boxShadow: "1px 2px 3px rgba(0,0,0,.2)" }}>
      <div className="grid size-full place-items-center px-1 text-center" style={{ background: color, color: "#fff", backgroundImage: noise(1.2, 0.1) }}>
        <span className="text-[clamp(13px,4.6cqi,22px)] leading-none" aria-hidden>
          {glyph}
        </span>
        <span className="line-clamp-2 text-[clamp(6px,1.9cqi,9px)] font-bold tracking-[0.06em] uppercase">{label}</span>
      </div>
    </div>
  );
}

function CareFront({ slots, palette }: EngineObjectProps) {
  const toPlace = slots.place.country || slots.place.city || slots.place.label;
  const fromPlace = slots.senderPlace.country || slots.senderPlace.city || slots.senderPlace.label;
  return (
    <>
      <p className="absolute top-[6%] left-[6%] text-[clamp(7px,2.2cqi,11px)] font-bold tracking-[0.18em] uppercase opacity-60" style={{ color: "#3B2A1E" }}>
        ↑↑ {t("theme.parcel.thisSideUp")}
      </p>
      <div className="absolute top-[22%] left-[6%] w-[56%] px-[5%] py-[4%] text-left" style={{ ...(material("paper", { lift: 0.25 }) as object), color: palette.ink, transform: "rotate(-1.5deg)" }}>
        <p className="text-[clamp(7px,2cqi,10px)] font-bold tracking-[0.2em] uppercase opacity-55">{t("theme.parcel.to")}</p>
        <p className="truncate text-[clamp(16px,5.2cqi,24px)] leading-tight font-semibold" style={{ fontFamily: "var(--jb-display)" }}>
          {slots.recipient}
        </p>
        <p className="truncate text-[clamp(8px,2.4cqi,12px)] opacity-80">{slots.place.label}</p>
        <div className="my-[4%] border-t border-dashed" style={{ borderColor: `${palette.ink}33` }} />
        <p className="text-[clamp(7px,2cqi,10px)] font-bold tracking-[0.2em] uppercase opacity-55">{t("theme.parcel.from")}</p>
        <p className="truncate text-[clamp(8px,2.4cqi,12px)] opacity-80">{slots.senderPlace.label}</p>
      </div>
      <div className="absolute top-[7%] right-[7%] grid w-[21%] gap-[6%]">
        <Stamp label={fromPlace} color={palette.accent2} rotate={6} glyph="✈" holes={palette.surface} />
        <Stamp label={toPlace} color={palette.accent} rotate={-5} glyph="♥" holes={palette.surface} />
      </div>
      {/* Postmark over the stamps */}
      <div className="pointer-events-none absolute top-[4%] right-[24%] grid size-[19%] place-items-center rounded-full border-2 text-center text-[clamp(5px,1.6cqi,8px)] leading-tight font-bold uppercase opacity-50" style={{ borderColor: "#2D3640", color: "#2D3640", transform: "rotate(-14deg)" }}>
        <span>
          {slots.senderPlace.city || t("theme.parcel.packedWith")}
          <br />
          {slots.dateLabel}
        </span>
      </div>
      <p className="absolute bottom-[8%] left-[6%] rounded-[3px] border-2 px-2 py-0.5 text-[clamp(10px,3.4cqi,16px)] font-bold tracking-[0.14em] uppercase" style={{ borderColor: "#C8452B", color: "#C8452B", transform: "rotate(-4deg)", opacity: 0.85 }}>
        {t("theme.parcel.fragile")}
      </p>
    </>
  );
}

function BalikbayanFront({ slots, palette }: EngineObjectProps) {
  return (
    <>
      {/* Printed band, like the boxes sold for sending home */}
      <div className="absolute inset-x-0 top-[6%] flex h-[17%] items-center justify-center" style={{ background: palette.accent2, color: "#fff" }}>
        <span className="text-[clamp(12px,4.3cqi,20px)] font-black tracking-[0.08em] uppercase" style={{ fontFamily: "var(--jb-text)" }}>
          {t("theme.balikbayan.box")}
        </span>
      </div>
      <div className="absolute inset-x-0 top-[23%] h-[3.5%]" style={{ background: palette.accent }} />
      {/* Tape everywhere, the way people really pack them */}
      {[7, 93].map((x) => (
        <div key={x} className="absolute inset-y-0 w-[8%]" style={{ left: `${x - 4}%`, backgroundColor: "rgba(150,108,62,.62)", backgroundImage: noise(1.6, 0.1) }} />
      ))}
      {/* The name in marker */}
      <p className="absolute top-[32%] left-[12%] w-[76%] text-center text-[clamp(18px,6.8cqi,32px)] leading-[1.05] [overflow-wrap:anywhere]" style={{ fontFamily: "var(--jb-display)", color: "#1B1B1B", transform: "rotate(-3deg)" }}>
        {t("theme.balikbayan.para", { name: slots.recipientShort.toUpperCase() })}
      </p>
      {/* Cargo label */}
      <div className="absolute bottom-[7%] left-[22%] w-[56%] px-[4%] py-[3%] text-left" style={{ ...(material("paper", { lift: 0.25 }) as object), color: palette.ink }}>
        <div className="flex items-center justify-between">
          <p className="text-[clamp(7px,2cqi,10px)] font-black tracking-[0.16em] uppercase">{t("theme.balikbayan.doorToDoor")}</p>
          <div className="h-[clamp(10px,3cqi,16px)] w-[34%]" style={{ background: "repeating-linear-gradient(90deg,#1B1B1B 0 1px,transparent 1px 3px,#1B1B1B 3px 5px,transparent 5px 6px)" }} aria-hidden />
        </div>
        <p className="mt-1 truncate text-[clamp(8px,2.3cqi,11px)]">
          <b>{t("theme.parcel.to")}:</b> {slots.recipient}, {slots.place.label}
        </p>
        <p className="truncate text-[clamp(8px,2.3cqi,11px)]">
          <b>{t("theme.parcel.from")}:</b> {slots.senderPlace.label}
        </p>
      </div>
      <p className="absolute right-[12%] bottom-[38%] origin-bottom-right text-[clamp(7px,2cqi,10px)] font-bold tracking-[0.18em] uppercase opacity-70" style={{ transform: "rotate(-90deg) translateX(100%)", color: "#1B1B1B" }}>
        ↑↑ {t("theme.parcel.thisSideUp")}
      </p>
      <p className="absolute bottom-[29%] left-[14%] text-[clamp(7px,2cqi,10px)] font-bold tracking-[0.12em] uppercase" style={{ color: palette.accent }}>
        {t("theme.parcel.handleWithCare")}
      </p>
    </>
  );
}

/* ---------- things inside ---------- */

function Item({ kind, note, accent, accent2 }: { kind: ItemKind; note: EngineNote | undefined; accent: string; accent2: string }) {
  if (kind === "photo") {
    return (
      <div className="aspect-[0.85] w-full p-[9%]" style={{ ...(material("wood", { tint: "#B98552", lift: 0.6, radius: 3 }) as object) }}>
        <div className="size-full overflow-hidden rounded-[1px] bg-[#EFE6D8]">
          {note?.media ? <img src={note.media} alt="" className="size-full object-cover" /> : <div className="size-full" style={{ background: `linear-gradient(160deg, ${accent2}55, ${accent}44)` }} />}
        </div>
      </div>
    );
  }
  if (kind === "letter") {
    return (
      <div className="relative aspect-[1.3] w-full" style={{ ...(material("paper", { lift: 0.6 }) as object) }}>
        <svg viewBox="0 0 100 76" className="absolute inset-0 size-full" aria-hidden>
          <path d="M2 4 L50 44 L98 4" fill="none" stroke="#C9B89A" strokeWidth="1.6" />
          <circle cx="50" cy="44" r="7" fill={accent} />
          <path d="M50 41.5c-1.6-2-4.6-.8-4 1.6.4 1.5 4 4 4 4s3.6-2.5 4-4c.6-2.4-2.4-3.6-4-1.6z" fill="#fff" />
        </svg>
      </div>
    );
  }
  if (kind === "jar") {
    return (
      <svg viewBox="0 0 60 70" className="block w-full drop-shadow-[2px_5px_4px_rgba(0,0,0,.25)]" aria-hidden>
        <rect x="14" y="4" width="32" height="10" rx="3" fill={accent2} />
        <path d="M12 16h36c4 0 6 4 6 8v34c0 6-4 10-10 10H16C10 68 6 64 6 58V24c0-4 2-8 6-8z" fill="rgba(220,236,242,.7)" stroke="rgba(255,255,255,.9)" strokeWidth="1.5" />
        {[[20, 40], [32, 50], [42, 36], [26, 56], [40, 58]].map(([x, y], i) => (
          <path key={i} transform={`translate(${x} ${y}) scale(.55)`} d="M0-4c-3-4-9-1.6-8 3 .8 3 8 8 8 8s7.2-5 8-8c1-4.6-5-7-8-3z" fill={i % 2 ? accent : "#FFD166"} />
        ))}
        <path d="M14 22v34" stroke="rgba(255,255,255,.8)" strokeWidth="3" strokeLinecap="round" />
      </svg>
    );
  }
  // Something small: a knitted ball of yarn with a bow.
  return (
    <svg viewBox="0 0 60 60" className="block w-full drop-shadow-[2px_5px_4px_rgba(0,0,0,.25)]" aria-hidden>
      <circle cx="30" cy="32" r="22" fill={accent} />
      {[-12, -4, 4, 12].map((d) => (
        <path key={d} d={`M${12 + Math.abs(d) / 2} ${20 + d / 3} Q30 ${32 + d} ${48 - Math.abs(d) / 2} ${20 - d / 3}`} fill="none" stroke={shade(accent, -0.25)} strokeWidth="1.6" />
      ))}
      <path d="M30 12c-5-8-14-4-10 1 3 3 10-1 10-1s7 4 10 1c4-5-5-9-10-1z" fill="#FFD166" />
      <circle cx="30" cy="12" r="2.5" fill="#E3B04B" />
    </svg>
  );
}
