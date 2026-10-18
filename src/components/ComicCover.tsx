/**
 * The Comic Issue's cover: masthead, issue number, the title, the gift's
 * character on a burst, cover blurbs and a barcode. Used by the comic itself
 * (ComicIssueView) and by its opening (src/themes/layouts/Comic.tsx), which
 * shows the same cover sealed in a collector's bag. Needs a `.cx-root`
 * ancestor for the colors and the `comic` size container.
 */
import { motion } from "motion/react";
import { X } from "lucide-react";
import { Character } from "@/themes/_shared/cast/Character";
import type { CharacterSetting } from "@/themes/_shared/cast/types";
import { COMIC_COPY } from "@/copy/strings";

const ease = [0.22, 1, 0.36, 1] as const;

export function ComicCover({
  title,
  subtitle,
  issueNo,
  month,
  character,
  friends,
  letters,
  photos,
  reduce,
  animateIn = true,
  onOpen,
  onClose,
  className = "",
  style,
}: {
  title: string;
  subtitle: string;
  issueNo: number;
  month: string;
  character: CharacterSetting;
  friends: number;
  letters: number;
  photos: number;
  reduce: boolean;
  /** Play the cover's entrance (off when it's already on screen, as in the opening). */
  animateIn?: boolean;
  /** Shows the "Open the issue" button. */
  onOpen?: () => void;
  onClose?: () => void;
  className?: string;
  style?: React.CSSProperties;
}) {
  const still = reduce || !animateIn;
  return (
    <div
      className={`cx-cover ${className}`}
      style={style}
      role="img"
      aria-label={`${title}. ${subtitle}.`}
    >
      <div className="cx-cover-rays" aria-hidden="true" />
      <div className="cx-cover-dots" aria-hidden="true" />
      <header className="cx-mast">
        <span className="cx-imprint">
          <b>JB</b>
          <small>{COMIC_COPY.imprint}</small>
        </span>
        <span className="cx-tagline">{COMIC_COPY.tagline}</span>
        <span className="cx-issue">
          <small>{COMIC_COPY.no}</small>
          <b>{issueNo}</b>
          <small>{month}</small>
        </span>
      </header>
      <motion.p
        className="cx-cover-sub cx-title"
        initial={still ? false : { y: -16, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.15, duration: 0.5, ease }}
      >
        {subtitle}
      </motion.p>
      <motion.h1
        className="cx-cover-title cx-title"
        initial={still ? false : { scale: 1.6, opacity: 0, rotate: -6 }}
        animate={{ scale: 1, opacity: 1, rotate: -3 }}
        transition={{ type: "spring", stiffness: 260, damping: 16, delay: 0.25 }}
      >
        {title}
      </motion.h1>
      <div className="cx-cover-art">
        <span className="cx-cover-burst" aria-hidden="true" />
        {character.type !== "none" ? (
          <motion.div
            className="cx-cover-hero"
            initial={still ? false : { y: 40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ type: "spring", stiffness: 160, damping: 15, delay: 0.5 }}
          >
            <Character
              setting={character}
              accessory={null}
              size={200}
              live
              follow
              showName={false}
            />
          </motion.div>
        ) : null}
      </div>
      <motion.span
        className="cx-blurb cx-blurb-star cx-title"
        initial={still ? false : { scale: 0, rotate: -40 }}
        animate={{ scale: 1, rotate: 12 }}
        transition={{ type: "spring", stiffness: 300, damping: 14, delay: 0.75 }}
      >
        {COMIC_COPY.featuring(friends)}
      </motion.span>
      <motion.span
        className="cx-blurb cx-blurb-box"
        initial={still ? false : { x: -40, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ delay: 0.9, duration: 0.45, ease }}
      >
        {COMIC_COPY.inside(letters, photos)}
      </motion.span>
      <footer className="cx-cover-foot">
        <span className="cx-seal">
          {COMIC_COPY.seal1}
          <br />
          {COMIC_COPY.seal2}
        </span>
        {onOpen ? (
          <motion.button
            type="button"
            className="cx-open"
            onClick={onOpen}
            {...(reduce ? {} : { whileHover: { rotate: -2, scale: 1.04 } })}
            whileTap={{ scale: 0.95 }}
            initial={still ? false : { y: 24, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 1.05, type: "spring", stiffness: 260, damping: 18 }}
          >
            {COMIC_COPY.open}
          </motion.button>
        ) : (
          <span className="flex-1" />
        )}
        <span className="cx-barcode" aria-hidden="true">
          {Array.from({ length: 18 }, (_, i) => (
            <i key={i} style={{ width: [2, 1, 3, 1, 2][i % 5] }} />
          ))}
          <small>{COMIC_COPY.priceless}</small>
        </span>
      </footer>
      {onClose ? (
        <button
          type="button"
          className="cx-icon cx-cover-close"
          aria-label={COMIC_COPY.closeCover}
          onClick={onClose}
        >
          <X className="size-4" />
        </button>
      ) : null}
    </div>
  );
}
