/**
 * A friend's note, opened from inside an object (an ornament, a parcel item, a
 * candle). Paper card, author at the bottom, long text clamped with a soft
 * fade. Closes with the x, Escape, or a tap outside. Focus moves to it.
 */
import { useEffect, useRef } from "react";
import { AnimatePresence, motion } from "motion/react";
import { X } from "lucide-react";
import { material } from "@/themes/engine/materials";
import { t } from "@/i18n";
import type { EngineNote } from "@/themes/engine/define";

export function NoteBubble({
  note,
  onClose,
  ink = "#2B2522",
  accent = "#B5623E",
  title,
  font = "var(--jb-display)",
}: {
  note: EngineNote | null;
  onClose: () => void;
  ink?: string;
  accent?: string;
  /** A small label above the note ("Candle 3", "Night 2"). */
  title?: string | undefined;
  /** The note's typeface: the theme's display face by default; marker-style themes use their text face. */
  font?: string;
}) {
  const ref = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (!note) return;
    ref.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [note, onClose]);
  return (
    <AnimatePresence>
      {note ? (
        <motion.div
          key={note.id}
          className="absolute inset-0 z-[40] grid place-items-center p-[6%]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onPointerDown={(e) => {
            if (e.target === e.currentTarget) onClose();
          }}
        >
          <motion.div
            ref={ref}
            tabIndex={-1}
            role="dialog"
            aria-label={note.author}
            className="relative w-full max-w-[300px] px-5 pt-5 pb-4 text-left outline-none"
            style={{ ...(material("paper", { lift: 0.9 }) as object), color: ink, borderRadius: 6 }}
            initial={{ y: 18, scale: 0.94, rotate: -2 }}
            animate={{ y: 0, scale: 1, rotate: -1 }}
            exit={{ y: 10, scale: 0.96 }}
            transition={{ type: "spring", stiffness: 260, damping: 22 }}
          >
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="absolute top-1.5 right-1.5 grid size-9 place-items-center rounded-full opacity-60 hover:opacity-100"
            >
              <X className="size-4" />
            </button>
            {title ? <p className="mb-1.5 text-[10px] font-semibold tracking-[0.2em] uppercase opacity-60">{title}</p> : null}
            {note.media && /\.(webp|jpe?g|png|gif|avif)(\?|$)|blob\.vercel|dev-uploads/i.test(note.media) ? (
              <img src={note.media} alt={t("slot.photo.alt", { name: note.author })} className="mb-3 aspect-[4/3] w-full rounded-[3px] object-cover" />
            ) : null}
            {note.text ? (
              <p
                className="max-h-[11.5em] overflow-hidden text-[15px] leading-relaxed whitespace-pre-line [overflow-wrap:anywhere]"
                style={{ fontFamily: font, maskImage: "linear-gradient(180deg,#000 80%,transparent)" }}
              >
                {note.text}
              </p>
            ) : null}
            <p className="mt-3 truncate text-sm font-semibold" style={{ color: accent }}>
              {note.author}
            </p>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
