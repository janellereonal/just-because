/**
 * Wax Seal's body: a quiet invitation in coffee tones, after the Chai shower page.
 *
 * Every part is its own band of color from six (espresso, mocha, taupe, greige, white,
 * black), and no two neighbours share one. Film grain over all of it. Sacramento for
 * the titles, Instrument Serif italic for labels, DM Mono Light for everything else.
 *
 *   hero          the heading over a slowly drifting blur, the day and the place
 *   invitation    the organiser's message, signed
 *   details       date and time (add to calendar), where (directions)
 *   the plan      what happens when, beside a line drawing
 *   on the table  the menu
 *   guess the baby  baby photos drifting past; tap one to see who it is
 *   letters       "from danielle", tap to open, one at a time
 *   photos        photos drifting past; tap one to see it big (swipe or arrows for the next)
 *   drawings, songs, words, video and quiz, then the footer
 *
 * The day and the plan come from format_settings.event, the date from the opening's
 * seal (src/lib/waxSeal.ts). Parts with nothing in them are left out.
 */
import "@/styles/bodies/waxseal.css";
import { useEffect, useMemo, useRef, useState } from "react";
import { Lock } from "lucide-react";
import { t } from "@/i18n";
import { buzz, foley } from "@/lib/play";
import { formatDay } from "@/lib/time";
import { babyHint, babyName } from "@/lib/sections";
import { useMediaUrl } from "@/lib/giftPieces";
import { photoProps } from "@/lib/media";
import { shareGift } from "@/lib/track";
import { SampleText } from "@/components/SampleMark";
import { loadWaxFonts } from "@/themes/waxseal/Opening";
import {
  WAX,
  WAX_FONTS,
  calendarLink,
  clockTime,
  directionsLink,
  eventView,
  longDate,
  partOfDay,
  sealInitial,
  shortDate,
} from "@/lib/waxSeal";
import {
  CountdownLine,
  PhotoFace,
  Reader,
  isLocked,
  listNames,
  pieceWhat,
  useBody,
  type BodyProps,
  type Piece,
} from "@/components/bodies/kit";

type Tone = "espresso" | "mocha" | "taupe" | "greige" | "white" | "black";
const CYCLE: Tone[] = ["espresso", "mocha", "greige", "taupe", "black", "white"];
const LIGHT_TEXT: Tone[] = ["espresso", "mocha", "taupe", "black"];

/**
 * Each part asks for a color; a part that would match the one above it takes the next
 * color in the cycle instead, so neighbours always look different.
 */
function assignTones<T extends { want: Tone }>(parts: T[]): (T & { tone: Tone })[] {
  let prev: Tone | null = null;
  return parts.map((p) => {
    let tone = p.want;
    if (tone === prev) {
      const at = CYCLE.indexOf(tone);
      tone = CYCLE[(at + 1) % CYCLE.length]!;
    }
    prev = tone;
    return { ...p, tone };
  });
}

const lower = (s: string) => s.toLocaleLowerCase();

export function WaxSealBody(props: BodyProps) {
  const body = useBody(props);
  const { data, site, reduce } = body;
  useEffect(() => loadWaxFonts(), []);
  const seal = site.intro_settings?.seal;
  const day = eventView(
    seal,
    (site.format_settings as Record<string, unknown> | undefined)?.["event"],
  );
  const name = data.named ? data.name : "";
  const lname = lower(name);
  const custom = site.custom_text as Record<string, string | undefined>;
  const title = (key: string, fallback: string) => custom[key]?.trim() || fallback;

  // Sort the notes into the parts that hold them.
  const groups = useMemo(() => {
    const babies: Piece[] = [];
    const photos: Piece[] = [];
    const drawings: Piece[] = [];
    const songs: Piece[] = [];
    const notes: Piece[] = [];
    for (const p of data.notes) {
      if (p.section === "babies") babies.push(p);
      else if (p.section === "doodle") drawings.push(p);
      else if (p.kind === "photo") photos.push(p);
      else if (p.kind === "song") songs.push(p);
      else notes.push(p);
    }
    return { babies, photos, drawings, songs, notes };
  }, [data.notes]);

  const intro = body.intro || body.voice.intro(name);
  const paragraphs = intro
    .split(/\n\s*\n/)
    .map((x) => x.trim())
    .filter(Boolean);
  const when = [longDate(day.date), clockTime(day.time)].filter(Boolean);
  const where = [day.place, day.address].filter(Boolean) as string[];
  const cal = calendarLink(body.heading, day);
  // "tuesday, november 17" / "2:00 pm at one legazpi park"
  const heroLines = [
    lower(longDate(day.date)),
    lower([clockTime(day.time), day.place].filter(Boolean).join(" at ")),
  ].filter(Boolean);
  const maps = directionsLink(day);

  type Part = { id: string; want: Tone; nav?: string; node: (tone: Tone) => React.ReactNode };
  const parts: Part[] = [];

  parts.push({
    id: "invite",
    want: "espresso",
    node: () => (
      <>
        <h2 className="ws-script">
          {day.hasDetails ? "you’re invited" : name ? `for ${lname}` : "for you"}
        </h2>
        <div className="ws-col ws-invite">
          {paragraphs.map((para, i) => (
            <p key={i}>{para}</p>
          ))}
          {day.sign ? <p className="ws-sign">{day.sign}</p> : null}
        </div>
      </>
    ),
  });

  if (day.hasDetails)
    parts.push({
      id: "details",
      nav: "details",
      want: "mocha",
      node: () => (
        <div className="ws-details">
          {when.length ? (
            <div className="ws-block">
              <p className="ws-label">date &amp; time</p>
              <p>
                {when.map((w, i) => (
                  <span key={i} className="block">
                    {w}
                  </span>
                ))}
              </p>
              {cal ? (
                <a className="ws-pill" href={cal} target="_blank" rel="noopener noreferrer">
                  ↗ add to calendar
                </a>
              ) : null}
            </div>
          ) : null}
          {where.length ? (
            <div className="ws-block">
              <p className="ws-label">where</p>
              <p>
                {where.map((w, i) => (
                  <span key={i} className="block">
                    {w}
                  </span>
                ))}
              </p>
              {maps ? (
                <a className="ws-pill" href={maps} target="_blank" rel="noopener noreferrer">
                  ↗ get directions
                </a>
              ) : null}
            </div>
          ) : null}
          <CountdownLine date={data.countdownDate} className="ws-note ws-countdown" />
        </div>
      ),
    });

  if (day.schedule.length)
    parts.push({
      id: "plan",
      nav: "schedule",
      want: "greige",
      node: () => (
        <>
          <h2 className="ws-script">{partOfDay(day.time)}</h2>
          <div className="ws-sched">
            <BouquetDrawing />
            <ul className="ws-times">
              {day.schedule.map((s, i) => (
                <li key={i}>
                  {s.time ? <b>{s.time}</b> : null}
                  {s.what}
                </li>
              ))}
            </ul>
          </div>
        </>
      ),
    });

  if (day.menu.length)
    parts.push({
      id: "menu",
      want: "taupe",
      node: () => (
        <div className="ws-menu">
          <h2 className="ws-script">on the table</h2>
          <ul>
            {day.menu.map((c, i) => (
              <li key={i}>
                {c.label ? <p className="ws-label">{c.label}</p> : null}
                {c.what}
              </li>
            ))}
          </ul>
        </div>
      ),
    });

  if (groups.babies.length)
    parts.push({
      id: "babies",
      nav: "babies",
      want: "black",
      node: () => (
        <>
          <h2 className="ws-script">{title("babies_title", "guess the baby")}</h2>
          <p className="ws-lead">
            {groups.babies.length > 2
              ? `${groups.babies.length} babies${name ? `, one of them is ${name}` : ""}. Tap a photo to see who it is.`
              : "Tap a photo to see who it is."}
          </p>
          <Strip
            reduce={reduce}
            items={groups.babies}
            render={(p, clone) => <Baby piece={p} recipient={name} clone={clone} />}
          />
        </>
      ),
    });

  if (groups.notes.length)
    parts.push({
      id: "letters",
      nav: "letters",
      want: "white",
      node: () => (
        <>
          <h2 className="ws-script">
            {title("letters_title", name ? `a little note for ${lname}` : "a little note for you")}
          </h2>
          <div className="ws-stack">
            {groups.notes.map((p) => (
              <Letter key={p.id} piece={p} />
            ))}
          </div>
        </>
      ),
    });

  const [lightbox, setLightbox] = useState<{ list: Piece[]; at: number } | null>(null);

  if (groups.photos.length)
    parts.push({
      id: "photos",
      nav: "photos",
      want: "black",
      node: () => (
        <>
          <h2 className="ws-script">{title("photobooth_title", "the photos")}</h2>
          <p className="ws-lead">Tap one to see it bigger.</p>
          <Strip
            reduce={reduce}
            items={groups.photos}
            render={(p, clone, i) => (
              <button
                type="button"
                className="ws-clip"
                tabIndex={clone ? -1 : 0}
                aria-label={
                  clone
                    ? undefined
                    : `${p.text || pieceWhat(p)}, from ${p.author || "a friend"}. See it bigger`
                }
                onClick={() => setLightbox({ list: groups.photos, at: i })}
              >
                {p.media ? (
                  <PhotoFace piece={p} tint={WAX.taupe} sizes="(max-width: 640px) 80vw, 420px" />
                ) : (
                  <span className="ws-ph">photo</span>
                )}
                <span className="ws-clip-cap">{p.author ? `from ${lower(p.author)}` : ""}</span>
              </button>
            )}
          />
        </>
      ),
    });

  if (groups.drawings.length)
    parts.push({
      id: "drawings",
      want: "white",
      node: () => (
        <>
          <h2 className="ws-script">{title("doodle_title", "drawn by hand")}</h2>
          <div className="ws-board">
            {groups.drawings.map((p, i) => (
              <figure key={p.id}>
                <button
                  type="button"
                  className="ws-slot"
                  aria-label={`A drawing from ${p.author || "a friend"}. See it bigger`}
                  onClick={() => setLightbox({ list: groups.drawings, at: i })}
                >
                  <PhotoFace piece={{ ...p, framed: true }} tint={WAX.greige} sizes="240px" />
                </button>
                <figcaption>{lower(p.author || "a friend")}</figcaption>
              </figure>
            ))}
          </div>
        </>
      ),
    });

  if (groups.songs.length)
    parts.push({
      id: "songs",
      want: "greige",
      node: () => (
        <div className="ws-playlist">
          <h2 className="ws-script">{title("songs_title", "songs for the day")}</h2>
          <p>
            {name ? `The songs that remind us of ${name}.` : "The songs that remind us of you."}
          </p>
          <div className="ws-pills">
            {groups.songs.map((p) => (
              <button key={p.id} type="button" className="ws-pill" onClick={() => body.read(p)}>
                ↗ {p.author ? `${lower(p.author)}’s song` : "a song"}
              </button>
            ))}
          </div>
        </div>
      ),
    });

  if (data.words.length)
    parts.push({
      id: "words",
      want: "taupe",
      node: () => (
        <>
          <h2 className="ws-script">{title("wordcloud_title", "in a few words")}</h2>
          <p className="ws-words">
            {data.words.map((w) => (
              <span key={w.id}>{w.text}</span>
            ))}
          </p>
        </>
      ),
    });

  if (props.extraSections)
    parts.push({
      id: "more",
      want: "espresso",
      node: () => <div className="ws-extras">{props.extraSections}</div>,
    });

  const toned = assignTones(parts);
  const last = toned[toned.length - 1]?.tone;
  const footerTone: Tone = last === "black" ? "espresso" : "black";
  const nav = toned.filter((p) => p.nav).slice(0, 4);
  const firstStop = toned.find((p) => p.id === "details") ?? toned.find((p) => p.id === "letters");

  function go(id: string) {
    document
      .getElementById(`ws-${id}-${site.id}`)
      ?.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
  }

  const vars = {
    "--ws-script": WAX_FONTS.script,
    "--ws-serif": WAX_FONTS.serif,
    "--ws-mono": WAX_FONTS.mono,
  } as React.CSSProperties;

  return (
    <div ref={body.hostRef} data-play-host className="ws-root" style={vars}>
      <div className="ws-grain" aria-hidden="true" />
      <div className="ws-top-wrap">
        <header className="ws-top">
          <button
            type="button"
            className="ws-mark"
            onClick={() => go("hero")}
            aria-label="back to top"
          >
            {sealInitial(seal, name)}
          </button>
          <span className="ws-date">{shortDate(day.date)}</span>
          {nav.length ? (
            <nav aria-label="sections">
              {nav.map((p) => (
                <button key={p.id} type="button" onClick={() => go(p.id)}>
                  {p.nav}
                </button>
              ))}
            </nav>
          ) : (
            <span />
          )}
        </header>
      </div>

      <section
        className="ws-hero"
        id={`ws-hero-${site.id}`}
        aria-label="introduction"
        data-gift-page=""
      >
        <div className="ws-blur" aria-hidden="true" />
        <div className="ws-shade" aria-hidden="true" />
        <div className="ws-hero-inner">
          <h1>{data.nameIsSample ? <SampleText on>{body.heading}</SampleText> : body.heading}</h1>
          {heroLines.length ? (
            <p>
              {heroLines.map((line, i) => (
                <span key={i} className="block">
                  {line}
                </span>
              ))}
            </p>
          ) : null}
          {firstStop ? (
            <button type="button" className="ws-pill" onClick={() => go(firstStop.id)}>
              {firstStop.id === "details" ? "see the details" : "read the notes"}
            </button>
          ) : null}
        </div>
      </section>

      {toned.map((p) => (
        <section
          key={p.id}
          id={`ws-${p.id}-${site.id}`}
          className={`ws-part ws-${p.id} is-${p.tone} ${LIGHT_TEXT.includes(p.tone) ? "is-light" : "is-dark"}`}
        >
          {p.node(p.tone)}
        </section>
      ))}

      <footer className={`ws-footer is-${footerTone} is-light`}>
        <p>
          {data.friends.length
            ? `made with love${name ? ` for ${name}` : ""}, by ${listNames(data.friends)}`
            : name
              ? `made with love for ${name}`
              : "made with love"}
        </p>
        {site.custom_text.footer_note ? <p>{site.custom_text.footer_note}</p> : null}
        {data.isSample ? <p className="ws-note">{body.voice.sample}</p> : null}
        {body.showShare ? (
          <p>
            <button type="button" className="ws-pill" onClick={() => shareGift(site)}>
              {t("body.share")}
            </button>
          </p>
        ) : null}
      </footer>

      {lightbox ? (
        <Lightbox list={lightbox.list} at={lightbox.at} onClose={() => setLightbox(null)} />
      ) : null}

      {body.reading ? (
        <Reader
          piece={body.reading}
          onClose={body.closeReader}
          accent={WAX.mocha}
          className="ws-reader"
        />
      ) : null}
    </div>
  );
}

/* ---------- letters ---------- */

function Letter({ piece }: { piece: Piece }) {
  const media = useMediaUrl(piece.kind === "voice" ? piece.media : null);
  const locked = isLocked(piece);
  const from = piece.author ? `from ${lower(piece.author)}` : "from a friend";
  const tag =
    piece.section && !["letters", "voice"].includes(piece.section)
      ? lower(pieceWhat(piece))
      : piece.kind === "voice"
        ? "a voice note"
        : "";
  const text = piece.text?.trim() ?? "";
  return (
    <details
      onToggle={(e) => {
        if ((e.currentTarget as HTMLDetailsElement).open) {
          foley("paper");
          buzz(6);
        }
      }}
    >
      <summary>
        <span className="ws-label">
          {from}
          {tag ? <small className="ws-tag">{tag}</small> : null}
        </span>
        <span className="ws-act" aria-hidden="true" />
      </summary>
      <div className="ws-letter">
        {piece.sealed ? (
          <p className="ws-locked">
            <Lock className="size-4" /> {t("body.sealed")}
          </p>
        ) : locked ? (
          <p className="ws-locked">
            <Lock className="size-4" /> {t("body.opensOn", { day: formatDay(piece.date!) })}
          </p>
        ) : (
          <>
            {piece.kind === "voice" && media ? (
              <audio controls preload="none" src={media} className="ws-audio" />
            ) : null}
            {text
              .split(/\n\s*\n/)
              .map((x) => x.trim())
              .filter(Boolean)
              .map((para, i) => (
                <p key={i}>{para}</p>
              ))}
            {piece.author ? <p className="ws-sign">love, {lower(piece.author)}</p> : null}
          </>
        )}
      </div>
    </details>
  );
}

/* ---------- the moving strip ---------- */

/**
 * A row that drifts sideways forever (two copies end to end), pausing under a finger
 * or the mouse. The copy is hidden from screen readers and can't be tabbed to.
 * Reduced motion: a plain row you scroll yourself.
 */
function Strip({
  items,
  render,
  reduce,
}: {
  items: Piece[];
  render: (p: Piece, clone: boolean, index: number) => React.ReactNode;
  reduce: boolean;
}) {
  const track = useRef<HTMLDivElement | null>(null);
  const [dur, setDur] = useState(40);
  useEffect(() => {
    const el = track.current;
    if (!el) return;
    const measure = () => setDur(Math.max(25, el.scrollWidth / 2 / 40));
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [items.length]);
  // One or two photos don't need to move.
  const still = reduce || items.length < 3;
  return (
    <div className={`ws-strip ${still ? "is-still" : ""}`}>
      <div ref={track} className="ws-track" style={{ "--dur": `${dur}s` } as React.CSSProperties}>
        {items.map((p, i) => (
          <div key={p.id} className="ws-strip-item">
            {render(p, false, i)}
          </div>
        ))}
        {still
          ? null
          : items.map((p, i) => (
              <div key={`${p.id}-copy`} className="ws-strip-item" aria-hidden="true">
                {render(p, true, i)}
              </div>
            ))}
      </div>
    </div>
  );
}

/* ---------- guess the baby ---------- */

function Baby({ piece, recipient, clone }: { piece: Piece; recipient: string; clone: boolean }) {
  // Both copies in the strip flip together: the state lives with the piece id.
  const [shown, setShown] = useShared(piece.id);
  const who = babyName(piece.data, piece.author);
  const isThem = !!recipient && lower(who) === lower(recipient);
  return (
    <button
      type="button"
      className="ws-baby"
      aria-pressed={shown}
      tabIndex={clone ? -1 : 0}
      aria-label={clone ? undefined : shown ? `It's ${who}` : "A baby photo. Tap to see who it is"}
      onClick={() => {
        setShown(!shown);
        if (!shown) buzz(8);
      }}
    >
      {piece.media ? (
        <PhotoFace piece={piece} tint={WAX.taupe} sizes="300px" />
      ) : (
        <span className="ws-ph">baby photo</span>
      )}
      <span className="ws-hint">tap</span>
      <span className="ws-who">
        {isThem ? `it’s ${who}!` : who}
        {babyHint(piece.text) ? <small>{babyHint(piece.text)}</small> : null}
      </span>
    </button>
  );
}

const shared = new Map<string, Set<(v: boolean) => void>>();
const sharedValue = new Map<string, boolean>();
/** A tiny shared toggle, so a photo and its copy in the strip always agree. */
function useShared(key: string): [boolean, (v: boolean) => void] {
  const [v, setV] = useState(() => sharedValue.get(key) ?? false);
  useEffect(() => {
    const set = shared.get(key) ?? new Set();
    set.add(setV);
    shared.set(key, set);
    return () => {
      set.delete(setV);
    };
  }, [key]);
  return [
    v,
    (next) => {
      sharedValue.set(key, next);
      shared.get(key)?.forEach((fn) => fn(next));
    },
  ];
}

/* ---------- see it bigger ---------- */

function Lightbox({ list, at, onClose }: { list: Piece[]; at: number; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement | null>(null);
  const [i, setI] = useState(at);
  const piece = list[i]!;
  const url = useMediaUrl(piece.media);
  const show = (n: number) => setI((n + list.length) % list.length);
  const x0 = useRef<number | null>(null);
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (!d.open) d.showModal();
    // No close() on unmount: that fires onClose, and React's double run in dev would shut it at once.
    // A dialog taken off the page leaves the top layer by itself.
  }, []);
  const caption = [piece.text?.trim(), piece.author ? `from ${lower(piece.author)}` : ""]
    .filter(Boolean)
    .join(" · ");
  return (
    <dialog
      ref={ref}
      className="ws-lightbox"
      aria-label="photo, enlarged"
      onClose={onClose}
      onClick={(e) => e.target === e.currentTarget && onClose()}
      onKeyDown={(e) => {
        if (e.key === "ArrowLeft") show(i - 1);
        if (e.key === "ArrowRight") show(i + 1);
      }}
      onTouchStart={(e) => (x0.current = e.touches[0]?.clientX ?? null)}
      onTouchEnd={(e) => {
        if (x0.current === null) return;
        const dx = (e.changedTouches[0]?.clientX ?? x0.current) - x0.current;
        if (Math.abs(dx) > 50) show(dx < 0 ? i + 1 : i - 1);
        x0.current = null;
      }}
    >
      <button type="button" className="ws-pill ws-lb-close" onClick={onClose}>
        close
      </button>
      <figure className="ws-lb-fig">
        <div className={`ws-lb-img ${url ? "has-img" : ""}`}>
          {url ? (
            <img {...photoProps(url, undefined, "90vw")} alt={piece.text ?? ""} />
          ) : (
            <PhotoFace piece={piece} tint={WAX.taupe} />
          )}
        </div>
        {caption ? <figcaption className="ws-lb-cap">{caption}</figcaption> : null}
        {list.length > 1 ? (
          <div className="ws-lb-nav">
            <button type="button" className="ws-pill" onClick={() => show(i - 1)}>
              previous
            </button>
            <button type="button" className="ws-pill" onClick={() => show(i + 1)}>
              next
            </button>
          </div>
        ) : null}
      </figure>
    </dialog>
  );
}

/** The reference's line drawing beside the plan: a bouquet on a table, a little gift. */
function BouquetDrawing() {
  return (
    <svg
      viewBox="0 0 320 300"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M150 268c2-40 1-78-2-112M160 268c-1-42 2-80 6-114" />
      <path d="M148 160c-18-6-30-18-34-34M166 152c14-10 30-12 44-8" />
      <path d="M155 70c-26-2-48 14-52 36-22 2-38 20-34 40 4 22 28 32 48 26 10 14 32 18 46 8 16 10 40 6 50-10 20 2 36-14 34-34-2-18-20-30-38-28-4-24-28-40-54-38z" />
      <path d="M120 120c6-4 14-4 20 0M180 104c6-4 13-3 18 2M150 140c5-3 12-3 16 1" />
      <path d="M40 270c60-6 180-6 250 0M70 282c50-4 130-4 180 0" />
      <path d="M232 268v-22h40v22M228 246h48M236 246v-6h32v6" />
    </svg>
  );
}
