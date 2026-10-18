import { useEffect } from "react";
import { X } from "lucide-react";
import { toEmbedUrl } from "@/lib/gift";
import { readableInk, surfaceColor } from "@/lib/palettes";
import type { Palette } from "@/lib/themes";
import { giftToday, useMediaUrl, type Piece } from "@/lib/giftPieces";
import { onPhotoError } from "@/lib/media";

/** Deterministic 0..1 from an id, so layouts don't jump between renders. */
import { material, type Material } from "@/lib/sound/material";

export function seed(id: string) {
  let h = 2166136261;
  for (let i = 0; i < id.length; i++) h = Math.imul(h ^ id.charCodeAt(i), 16777619);
  return ((h >>> 0) % 1000) / 1000;
}

export function pieceLabel(p: Piece) {
  if (p.sealed) return `A sealed note from ${p.author}`;
  const what = {
    letter: "Note",
    photo: "Photo",
    song: "Song",
    voice: "Voice note",
    word: "Word",
    ornament: "Wish",
    calendar: "Surprise",
  }[p.kind];
  return `${what}${p.author ? ` from ${p.author}` : ""}. Open it.`;
}

/** The full piece in a sheet: big photo, playable song or voice note, the whole note. */
export function PieceSheet({
  piece,
  palette,
  onClose,
  sound = "unfold",
}: {
  piece: Piece;
  palette: Palette;
  onClose: () => void;
  /** What opening this note sounds like in this style (a page, a card, a polaroid...). */
  sound?: Material | null;
}) {
  // The note itself makes a sound when it opens, and a softer one when it's put down.
  useEffect(() => {
    if (sound) material(sound, { strength: 0.9 });
    return () => {
      if (sound) material("slide", { strength: 0.6 });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [piece.id]);
  const media = useMediaUrl(piece.media);
  const embed = piece.link ? toEmbedUrl(piece.link) : null;
  const ink = readableInk(palette.background);
  useEffect(() => {
    const key = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, [onClose]);
  const locked = piece.kind === "calendar" && !!piece.date && piece.date > giftToday();
  return (
    <div className="bento-sheet-backdrop" onClick={onClose} role="presentation">
      <div
        role="dialog"
        aria-modal="true"
        aria-label={pieceLabel(piece)}
        className="bento-sheet"
        style={{ background: surfaceColor(palette.background), color: ink }}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute top-3 right-3 grid size-9 place-items-center rounded-full bg-black/5 hover:bg-black/10"
          aria-label="Close"
        >
          <X className="size-4" />
        </button>
        {locked ? (
          <p className="py-10 text-center text-lg">This one opens on {piece.date}. No peeking.</p>
        ) : (
          <>
            {piece.kind === "photo" && media ? (
              <img
                src={media}
                alt={piece.text ?? ""}
                className="mb-5 max-h-[60vh] w-full rounded-2xl object-contain"
                onError={onPhotoError}
              />
            ) : null}
            {piece.kind === "voice" && media ? (
              <audio controls autoPlay src={media} className="mb-5 w-full" />
            ) : null}
            {embed ? (
              <iframe
                src={embed}
                title={`Song from ${piece.author}`}
                loading="lazy"
                allow="encrypted-media; clipboard-write; picture-in-picture; autoplay"
                className="mb-5 h-[152px] w-full rounded-2xl border-0"
              />
            ) : piece.link ? (
              <a
                href={piece.link}
                target="_blank"
                rel="noreferrer"
                className="mb-5 inline-block underline underline-offset-4"
                style={{ color: palette.accent }}
              >
                Open the song
              </a>
            ) : null}
            {piece.text ? (
              <p className="text-lg leading-relaxed whitespace-pre-line">{piece.text}</p>
            ) : null}
            {piece.author ? (
              <p className="mt-5 font-medium" style={{ color: palette.accent }}>
                {piece.author}
              </p>
            ) : null}
          </>
        )}
      </div>
    </div>
  );
}
