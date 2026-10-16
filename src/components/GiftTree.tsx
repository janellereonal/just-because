/**
 * The wishing tree: a clay tree (public/clay/xtree.webp) with each friend's
 * clay ornament hanging from a branch. Ornaments sway on their own, wiggle
 * when touched and open into the note. Locked ones show a little padlock.
 */
import { useMemo, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Lock } from "lucide-react";
import { localToday } from "@/lib/time";
import Bo from "@/components/Bo";
import { ORNAMENTS, type ViewContribution } from "@/lib/gift";
import { readableInk } from "@/lib/palettes";
import type { Palette } from "@/lib/themes";
import { TREE_COPY } from "@/copy/strings";

/** Branch points in the tree's 120 box (see src/lib/clay/tree.ts), top to bottom. */
const HANGS: [number, number][] = [
  [60, 31],
  [45, 47],
  [75, 47],
  [33, 64],
  [60, 61],
  [87, 65],
  [24, 85],
  [46, 81],
  [72, 83],
  [96, 89],
  [36, 99],
  [84, 100],
];
/** The tree's little lights, for the twinkle. */
const LIGHTS: [number, number][] = [
  [40, 92],
  [58, 96],
  [78, 92],
  [30, 98],
  [90, 98],
  [46, 68],
  [70, 70],
  [58, 46],
];
const pct = (b: number) => ((b + 10) / 140) * 100;

const ORN_KEYS = new Set<string>(ORNAMENTS.map(([k]) => k));
export const ornamentSrc = (key: string | null, big = false) =>
  `/clay/orn-${key && ORN_KEYS.has(key) ? key : "bauble"}${big ? "" : "@256"}.webp`;

export function OrnamentIcon({
  ornamentKey,
  className = "size-10",
  big = false,
}: {
  ornamentKey: string | null;
  className?: string;
  big?: boolean;
}) {
  return (
    <img
      src={ornamentSrc(ornamentKey, big)}
      alt=""
      aria-hidden="true"
      draggable={false}
      className={`object-contain ${className}`}
    />
  );
}

export function GiftTree({
  contributions,
  palette,
  revealDate,
  sample = false,
}: {
  contributions: ViewContribution[];
  palette: Palette;
  revealDate: string | null;
  sample?: boolean;
}) {
  const reduce = useReducedMotion();
  const sampleItems = useMemo<ViewContribution[]>(
    () =>
      (
        [
          ["Sam", "You make every Christmas brighter.", "star"],
          ["Lia", "A little wish, just for you.", "heart"],
          ["Jo", "Warm hugs from all of us.", "gift"],
          ["Noor", "Save me a cookie this year.", "cookie"],
          ["Theo", "Snow day soon, I can feel it.", "snowman"],
        ] as const
      ).map(([who, text, key], i) => ({
        id: `tree-${i}`,
        site_id: "sample",
        module_type: "tree",
        author_name: who,
        text_content: text,
        media_url: null,
        external_link: null,
        status: "approved",
        created_at: "",
        ornament_key: key,
        visibility: "public",
      })),
    [],
  );
  const items = contributions.length > 0 ? contributions : sample ? sampleItems : [];
  const [page, setPage] = useState(0);
  const [open, setOpen] = useState<ViewContribution | null>(null);
  const [poked, setPoked] = useState<string | null>(null);
  const pages = Math.max(1, Math.ceil(items.length / HANGS.length));
  const visible = items.slice(page * HANGS.length, page * HANGS.length + HANGS.length);
  const today = localToday();
  const dateLocked = !!revealDate && revealDate > today;
  const ink = readableInk(palette.background);

  function select(item: ViewContribution) {
    setPoked(item.id);
    window.setTimeout(() => setOpen(item), reduce ? 0 : 260);
  }

  return (
    <>
      <div className="relative mx-auto aspect-square w-full max-w-[520px] select-none">
        {/* The still has room around the tree; zoom in so the tree fills the space. */}
        <div className="absolute inset-0 origin-[50%_62%] scale-[1.22]">
          <img
            src="/clay/xtree.webp"
            alt=""
            aria-hidden="true"
            draggable={false}
            className="absolute inset-0 size-full object-contain"
          />
          {!reduce
            ? LIGHTS.map(([x, y], i) => (
                <span
                  key={i}
                  aria-hidden="true"
                  className="jb-twinkle pointer-events-none absolute size-[4%] -translate-x-1/2 -translate-y-1/2 rounded-full"
                  style={{
                    left: `${pct(x)}%`,
                    top: `${pct(y)}%`,
                    animationDelay: `${(i * 0.37) % 2}s`,
                    background: "radial-gradient(circle, #fff9 0, #ffe9a066 40%, transparent 70%)",
                  }}
                />
              ))
            : null}
          <AnimatePresence mode="popLayout">
            {visible.map((item, index) => {
              const [bx, by] = HANGS[index] ?? HANGS[0]!;
              const locked = item.sealed || item.visibility === "recipient" || dateLocked;
              const w = 18;
              return (
                <motion.button
                  key={item.id}
                  type="button"
                  onClick={() => select(item)}
                  className="absolute z-10 flex flex-col items-center outline-none focus-visible:[&>span:first-child]:ring-4"
                  style={{
                    left: `${pct(bx) - w / 2}%`,
                    top: `${pct(by) - w * 0.17}%`,
                    width: `${w}%`,
                    transformOrigin: "50% 0%",
                  }}
                  initial={reduce ? false : { opacity: 0, y: -16, scale: 0.6 }}
                  animate={
                    reduce
                      ? { opacity: 1 }
                      : poked === item.id
                        ? { opacity: 1, y: 0, scale: 1, rotate: [0, -14, 10, -6, 3, 0] }
                        : { opacity: 1, y: 0, scale: 1, rotate: [-3, 3, -3] }
                  }
                  transition={
                    poked === item.id
                      ? { duration: 0.6, ease: "easeOut" }
                      : {
                          opacity: { duration: 0.3 },
                          y: { type: "spring", stiffness: 220, damping: 14, delay: index * 0.05 },
                          scale: {
                            type: "spring",
                            stiffness: 260,
                            damping: 15,
                            delay: index * 0.05,
                          },
                          rotate: {
                            duration: 3 + (index % 3) * 0.6,
                            repeat: Infinity,
                            ease: "easeInOut",
                            delay: (index % 4) * 0.4,
                          },
                        }
                  }
                  onAnimationComplete={() => poked === item.id && setPoked(null)}
                  whileHover={reduce ? {} : { scale: 1.08 }}
                  aria-label={`${locked ? TREE_COPY.lockedFrom(item.author_name) : TREE_COPY.openFrom(item.author_name)}`}
                >
                  <span
                    className="relative block w-full rounded-full"
                    style={{
                      filter: item.mine
                        ? `drop-shadow(0 0 6px ${palette.accent})`
                        : "drop-shadow(0 6px 6px rgba(43,37,34,.18))",
                    }}
                  >
                    <OrnamentIcon
                      ornamentKey={item.ornament_key}
                      className="block aspect-square w-full"
                    />
                    {locked ? (
                      <span className="absolute right-[6%] bottom-[10%] grid size-[34%] place-items-center rounded-full bg-white/95 text-ink shadow">
                        <Lock className="size-[58%]" aria-hidden="true" />
                      </span>
                    ) : null}
                  </span>
                  <span
                    className="-mt-[6%] max-w-[140%] truncate rounded-full bg-white/90 px-2 py-0.5 text-[10px] font-semibold shadow-sm"
                    style={{ color: "#2B2522" }}
                  >
                    {item.author_name}
                  </span>
                </motion.button>
              );
            })}
          </AnimatePresence>
        </div>
      </div>
      {pages > 1 ? (
        <div className="mt-3 flex items-center justify-center gap-3 text-sm">
          <button
            type="button"
            onClick={() => setPage((p) => (p - 1 + pages) % pages)}
            aria-label={TREE_COPY.prev}
            className="grid size-9 place-items-center rounded-full border border-current/20"
          >
            ←
          </button>
          <span className="font-mono text-xs">
            {page + 1}/{pages}
          </span>
          <button
            type="button"
            onClick={() => setPage((p) => (p + 1) % pages)}
            aria-label={TREE_COPY.next}
            className="grid size-9 place-items-center rounded-full border border-current/20"
          >
            →
          </button>
        </div>
      ) : null}
      {items.length === 0 ? (
        <p className="text-center text-sm opacity-60">{TREE_COPY.empty}</p>
      ) : null}

      <AnimatePresence>
        {open ? (
          <motion.div
            className="fixed inset-0 z-[90] grid place-items-center bg-ink/45 p-5 backdrop-blur-[2px]"
            onClick={() => setOpen(null)}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="relative w-full max-w-sm rounded-[28px] px-6 pt-16 pb-6 text-center shadow-xl"
              style={{ backgroundColor: palette.background, color: ink }}
              onClick={(e) => e.stopPropagation()}
              initial={reduce ? { opacity: 0 } : { opacity: 0, y: 30, scale: 0.92 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={reduce ? { opacity: 0 } : { opacity: 0, y: 20, scale: 0.95 }}
              transition={{ type: "spring", stiffness: 300, damping: 26 }}
              role="dialog"
              aria-modal="true"
            >
              <motion.span
                className="absolute -top-12 left-1/2 block w-28 -translate-x-1/2"
                style={{ transformOrigin: "50% 10%" }}
                initial={reduce ? false : { rotate: -18, y: -20 }}
                animate={reduce ? {} : { rotate: [-18, 10, -5, 2, 0], y: 0 }}
                transition={{ duration: 1.1, ease: "easeOut" }}
              >
                <OrnamentIcon
                  ornamentKey={open.ornament_key}
                  big
                  className="block aspect-square w-full drop-shadow-[0_12px_14px_rgba(43,37,34,.25)]"
                />
              </motion.span>
              {open.sealed ? (
                <>
                  <Bo pose="idle" size={80} />
                  <h3 className="mt-2 text-xl font-semibold">{TREE_COPY.sealed}</h3>
                  <p className="mt-2 text-sm opacity-70">
                    {TREE_COPY.sealedBody(open.author_name)}
                  </p>
                </>
              ) : open.visibility === "recipient" ? (
                <>
                  <h3 className="mt-2 text-xl font-semibold">{TREE_COPY.private}</h3>
                  <p className="mt-2 text-sm opacity-70">{TREE_COPY.privateBody}</p>
                </>
              ) : dateLocked ? (
                <>
                  <h3 className="mt-2 text-xl font-semibold">
                    {TREE_COPY.opensOn(
                      new Date(`${revealDate}T00:00:00`).toLocaleDateString(undefined, {
                        month: "short",
                        day: "numeric",
                      }),
                    )}
                  </h3>
                  <p className="mt-2 text-sm opacity-70">{TREE_COPY.wait}</p>
                </>
              ) : (
                <>
                  <p className="text-[17px] leading-relaxed whitespace-pre-line">
                    {open.text_content}
                  </p>
                  <p className="mt-4 text-sm font-medium" style={{ color: palette.accent }}>
                    {open.author_name}
                  </p>
                </>
              )}
              <button
                type="button"
                onClick={() => setOpen(null)}
                className="squish mt-6 w-full rounded-full px-5 py-2.5 text-sm font-medium"
                style={{ backgroundColor: palette.accent, color: readableInk(palette.accent) }}
              >
                {TREE_COPY.close}
              </button>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </>
  );
}
