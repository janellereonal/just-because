/**
 * Boarding Pass's body: a passport, stamped by every friend.
 *
 * The opening tore the stub off a boarding pass; the pass stays at the top (torn
 * edge and all) with the countdown on a split-flap board. Under it, a little
 * route map: every friend's pin, with a dotted flight path to the recipient.
 * Then the passport lies open, page after page, scrolled (not flipped). Each
 * note is an ink stamp that thumps onto its page as it scrolls into view;
 * photos are entry photos and postcards clipped to the pages. Tap a stamp and
 * it lifts off the page into a postcard. Read stamps get a pencil tick.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { CalendarDays, Camera, Heart, Lock, Mail, Mic, Music2, Plane, Star } from "lucide-react";
import { t, type MessageKey } from "@/i18n";
import { SampleText } from "@/components/SampleMark";
import { useCountdown } from "@/lib/giftPieces";
import { formatDay } from "@/lib/time";
import { burst, buzz, chime, foley } from "@/lib/play";
import {
  BodyFooter,
  BodyRoot,
  PhotoFace,
  Reader,
  initial,
  isLocked,
  pieceLabel,
  seed,
  useBody,
  useOpened,
  type BodyProps,
  type Piece,
} from "@/components/bodies/kit";

const PER_PAGE = 6;

type Body = ReturnType<typeof useBody>;

export function PassportBody(props: BodyProps) {
  const body = useBody(props);
  const { data, colors, fonts, reduce } = body;
  const { opened, open } = useOpened("passport", body.site.id, body.sample);
  const [lifting, setLifting] = useState<string | null>(null);
  const [found, setFound] = useState<string | null>(null);
  const notes = data.notes;
  const count = notes.filter((p) => opened.has(p.id)).length;

  // Inks that always read on cream paper, whatever the palette.
  const inks = useMemo(() => {
    const deep = (c: string) => {
      const l = luma(c);
      return l > 0.42 ? colors.mix(c, "#1E1B2E", Math.min(0.62, (l - 0.3) * 1.25)) : c;
    };
    return [
      deep(colors.primary),
      deep(colors.accent),
      colors.mix(deep(colors.primary), "#1B2440", 0.45),
    ];
  }, [colors]);
  const paper = colors.mix("#FBF6EA", colors.primary, 0.035);
  const cover = colors.mix(deep2(colors.primary), "#0E1424", 0.45);

  const pages = useMemo(() => chunk(notes, PER_PAGE), [notes]);
  const spreads = useMemo(() => chunk(pages, 2), [pages]);
  const authors = useMemo(() => [...new Set(notes.map((p) => p.author).filter(Boolean))], [notes]);

  // The day on the stamps: the trip's day (the countdown), else today. Set after mount (viewer's zone).
  const [stampDay, setStampDay] = useState("");
  useEffect(() => {
    setStampDay(
      formatDay(data.countdownDate ?? Date.now(), { day: "2-digit", month: "short" }).toUpperCase(),
    );
  }, [data.countdownDate]);

  // Pages thump their stamps down as they scroll into view.
  const bookRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const root = bookRef.current;
    if (!root) return;
    const list = [...root.querySelectorAll<HTMLElement>(".pp-page")];
    if (reduce || typeof IntersectionObserver === "undefined") {
      list.forEach((el) => el.setAttribute("data-in", ""));
      return;
    }
    let last = 0;
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (!e.isIntersecting) continue;
          const el = e.target as HTMLElement;
          // This page and any it skipped past on a fast scroll.
          for (const page of list.slice(0, list.indexOf(el) + 1)) {
            if (!page.hasAttribute("data-wait")) continue;
            page.removeAttribute("data-wait");
            page.setAttribute("data-in", "");
            io.unobserve(page);
          }
          const now = performance.now();
          if (now - last > 350 && el.querySelector(".pp-stamp")) {
            last = now;
            window.setTimeout(() => foley("thunk"), 120);
          }
        }
      },
      { rootMargin: "0px 0px -12% 0px", threshold: 0.08 },
    );
    // Pages already on screen (or above it) show at once; the rest wait to be scrolled to.
    for (const el of list) {
      const r = el.getBoundingClientRect();
      if (r.top < window.innerHeight * 0.92) el.setAttribute("data-in", "");
      else {
        el.setAttribute("data-wait", "");
        io.observe(el);
      }
    }
    return () => io.disconnect();
  }, [reduce, pages.length]);

  function read(p: Piece, e: React.MouseEvent) {
    if (lifting) return;
    const first = !opened.has(p.id);
    open(p.id);
    foley("paper");
    buzz(first ? [6, 30, 8] : 6);
    const x = e.clientX;
    const y = e.clientY;
    if (reduce) {
      body.read(p);
      return;
    }
    setLifting(p.id);
    window.setTimeout(() => {
      setLifting(null);
      body.read(p);
      if (first && !p.sealed && !isLocked(p)) {
        chime("pop");
        burst(body.hostRef.current, x, y, {
          shape: "stars",
          colors: [inks[0]!, inks[1]!, "#F2C14E"],
          count: 8,
          spread: 0.7,
          up: true,
        });
      }
    }, 380);
  }

  function findFriend(name: string) {
    const first = notes.find((p) => p.author === name);
    if (!first) return;
    const el = bookRef.current?.querySelector<HTMLElement>(
      `[data-piece="${CSS.escape(first.id)}"]`,
    );
    const page = el?.closest<HTMLElement>(".pp-page");
    page?.removeAttribute("data-wait");
    page?.setAttribute("data-in", "");
    el?.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "center" });
    setFound(name);
    chime("boop");
    window.setTimeout(() => setFound((f) => (f === name ? null : f)), 2400);
  }

  const code =
    (data.named ? data.name : t("passport.home"))
      .replace(/[^\p{L}]/gu, "")
      .slice(0, 3)
      .toUpperCase() || "YOU";

  return (
    <BodyRoot
      body={body}
      className="pp-root"
      style={
        {
          "--pp-paper": paper,
          "--pp-paper-deep": colors.mix(paper, "#C9B48E", 0.28),
          "--pp-ink1": inks[0],
          "--pp-ink2": inks[1],
          "--pp-ink3": inks[2],
          "--pp-cover": cover,
          "--pp-band": colors.primary,
          "--pp-on-band": colors.onPrimary,
          "--pp-sky": colors.dark
            ? colors.mix(colors.bg, colors.primary, 0.22)
            : colors.mix(colors.bg, colors.primary, 0.16),
          "--pp-guilloche": guilloche(colors.mix(paper, inks[0]!, 0.16)),
          "--pp-text": "#2C2A33",
          "--pp-cloud": colors.dark ? 0.16 : 0.75,
        } as React.CSSProperties
      }
    >
      <div className="pp-sky" aria-hidden="true">
        <span className="pp-cloud" style={{ left: "-8%", top: "70px", width: "46%" }} />
        <span className="pp-cloud" style={{ right: "-12%", top: "250px", width: "40%" }} />
        <span className="pp-cloud is-far" style={{ left: "52%", top: "24px", width: "26%" }} />
      </div>

      <div className="relative mx-auto max-w-5xl px-4 pt-[clamp(26px,6vh,64px)] pb-20">
        {/* The boarding pass, stub torn off */}
        <article className="pp-pass" data-gift-page="">
          <div className="pp-pass-paper">
            <header className="pp-pass-band">
              <span>{t("passport.pass")}</span>
              <Plane className="size-4" aria-hidden="true" />
            </header>
            <div className="pp-pass-body">
              <div className="pp-route">
                <div>
                  <p className="pp-label">{t("passport.from")}</p>
                  <p className="pp-code" style={{ fontFamily: fonts.heading }}>
                    {t("passport.fromCode")}
                  </p>
                  <p className="pp-sub">{t("passport.fromName")}</p>
                </div>
                <div className="pp-route-line" aria-hidden="true">
                  <Plane className="pp-route-plane" />
                </div>
                <div className="text-right">
                  <p className="pp-label">{t("passport.to")}</p>
                  <p className="pp-code" style={{ fontFamily: fonts.heading }}>
                    {code}
                  </p>
                  <p className="pp-sub">{data.named ? data.name : t("passport.home")}</p>
                </div>
              </div>

              <p className="pp-label mt-5">{t("passport.passenger")}</p>
              <h1 className="pp-name" style={{ fontFamily: fonts.heading }}>
                {data.named ? (
                  <SampleText on={data.nameIsSample}>{data.name}</SampleText>
                ) : (
                  body.heading
                )}
              </h1>
              {data.named ? (
                <p className="pp-heading" style={{ fontFamily: fonts.heading }}>
                  {body.heading}
                </p>
              ) : null}
              <p className="pp-intro">
                {body.intro || body.voice.intro(data.named ? data.name : "")}
              </p>

              <dl className="pp-fields">
                <Field label={t("passport.seat")} value="1A" />
                <Field label={t("passport.gate")} value="B4" />
                <Field label={t("passport.class")} value={t("passport.classValue")} />
                <Field label={t("passport.stamps")} value={String(notes.length)} />
              </dl>

              <Departures date={data.countdownDate} />
            </div>
          </div>
        </article>

        {/* The route map */}
        {authors.length ? (
          <RouteMap
            authors={authors}
            code={code}
            found={found}
            onFind={findFriend}
            headingFont={fonts.heading}
            reduce={reduce}
            inks={inks}
          />
        ) : null}

        {/* The passport */}
        <section className="pp-passport" aria-label={t("passport.passportTitle")}>
          <div className="pp-passport-head">
            <p className="pp-passport-title" style={{ fontFamily: fonts.heading }}>
              {t("passport.passportTitle")}
            </p>
            <p className="pp-progress" role="status" aria-live="polite">
              {notes.length === 0
                ? body.voice.empty(t("passport.what"))
                : count === 0
                  ? t("passport.count", { n: notes.length })
                  : count === notes.length
                    ? t("passport.allRead")
                    : t("passport.progress", { n: count, total: notes.length })}
            </p>
          </div>
          <div className="pp-book" ref={bookRef}>
            {(spreads.length ? spreads : [[[]]]).map((spread, s) => (
              <div className="pp-spread" key={s}>
                {spread.map((page, k) => {
                  const n = s * 2 + k;
                  return (
                    <div className={`pp-page ${k === 0 ? "is-left" : "is-right"}`} key={n}>
                      <span className="pp-page-mark" aria-hidden="true" />
                      <p className="pp-page-head" aria-hidden="true">
                        <span>{t("passport.visas")}</span>
                        <span>{String(n + 2).padStart(2, "0")}</span>
                      </p>
                      <ul className="pp-page-grid">
                        {page.map((p, i) => (
                          <li key={p.id} style={{ "--i": i } as React.CSSProperties}>
                            {p.kind === "photo" && !p.sealed ? (
                              <PhotoClip
                                piece={p}
                                read={opened.has(p.id)}
                                lifting={lifting === p.id}
                                found={found === p.author}
                                onOpen={(e) => read(p, e)}
                                day={stampDay}
                              />
                            ) : (
                              <Stamp
                                piece={p}
                                read={opened.has(p.id)}
                                lifting={lifting === p.id}
                                found={found === p.author}
                                onOpen={(e) => read(p, e)}
                                inks={inks}
                                day={stampDay}
                              />
                            )}
                          </li>
                        ))}
                      </ul>
                      {n === pages.length - 1 || pages.length === 0 ? (
                        <p className="pp-mrz" aria-hidden="true">
                          {mrz(data.named ? data.name : "", notes.length)}
                        </p>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </section>

        {data.words.length ? (
          <section className="pp-declare" aria-label={t("passport.declareTitle")}>
            <p className="pp-declare-title">{t("passport.declareTitle")}</p>
            <p className="pp-declare-line" style={{ fontFamily: fonts.heading }}>
              {data.named
                ? t("passport.declareLine", { name: data.name })
                : t("passport.declareAnon")}
            </p>
            <ul className="pp-declare-list">
              {data.words.map((w) => (
                <li key={w.id}>
                  <span className="pp-box" aria-hidden="true">
                    <svg viewBox="0 0 16 16">
                      <path d="M3 8.5 6.5 12 13 4" />
                    </svg>
                  </span>
                  {w.text}
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        <BodyFooter
          body={body}
          className="pp-footer"
          buttonStyle={{ background: colors.primary, color: colors.onPrimary }}
        />
      </div>

      {body.reading ? <Postcard body={body} piece={body.reading} code={code} /> : null}
    </BodyRoot>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="pp-label">{label}</dt>
      <dd className="pp-field">{value}</dd>
    </div>
  );
}

/** "Departs in" on a split-flap board. */
function Departures({ date }: { date: string | null }) {
  const c = useCountdown(date);
  // Client only: the minutes would differ between the server render and hydration.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!c) return null;
  if (!mounted) return <div className="pp-departs is-waiting" aria-hidden="true" />;
  return (
    <div className="pp-departs" role="timer">
      <p className="pp-label">{t("passport.departs")}</p>
      {c.done ? (
        <p className="pp-board">
          {t("passport.boarding")
            .toUpperCase()
            .split("")
            .map((ch, i) => (
              <span key={i} className="pp-flap is-letter">
                {ch === " " ? " " : ch}
              </span>
            ))}
        </p>
      ) : (
        <p
          className="pp-board"
          aria-label={t("body.countdown.left", { days: c.days, hours: c.hours, mins: c.mins })}
        >
          <Flaps value={c.days} unit={t("passport.days")} />
          <Flaps value={c.hours} unit={t("passport.hours")} />
          <Flaps value={c.mins} unit={t("passport.mins")} />
        </p>
      )}
    </div>
  );
}

function Flaps({ value, unit }: { value: number; unit: string }) {
  const s = String(value).padStart(2, "0");
  return (
    <span className="pp-flaps" aria-hidden="true">
      <span className="flex gap-[3px]">
        {s.split("").map((d, i) => (
          <span key={`${i}-${d}`} className="pp-flap">
            {d}
          </span>
        ))}
      </span>
      <span className="pp-flap-unit">{unit}</span>
    </span>
  );
}

/** An illustrated map (no real places): a pin per friend and dotted flight paths to the recipient. */
function RouteMap({
  authors,
  code,
  found,
  onFind,
  headingFont,
  reduce,
  inks,
}: {
  authors: string[];
  code: string;
  found: string | null;
  onFind: (name: string) => void;
  headingFont: string;
  reduce: boolean;
  inks: string[];
}) {
  const W = 360;
  const H = 230;
  const home = { x: 186, y: 120 };
  const shown = authors.slice(0, 14);
  const pins = useMemo(() => {
    const n = shown.length;
    const out: { name: string; x: number; y: number; path: string }[] = [];
    shown.forEach((name, i) => {
      const r = seed(name);
      const a = (i / Math.max(1, n)) * Math.PI * 2 + (r - 0.5) * 0.3 - Math.PI / 2;
      const rx = 118 + (i % 2) * 34 + r * 14;
      const ry = 70 + ((i + 1) % 2) * 18 + r * 10;
      const x = Math.max(24, Math.min(W - 24, home.x + Math.cos(a) * rx));
      const y = Math.max(22, Math.min(H - 30, home.y + Math.sin(a) * ry));
      // A curved route: bend sideways from the straight line.
      const mx = (x + home.x) / 2;
      const my = (y + home.y) / 2;
      const dx = home.x - x;
      const dy = home.y - y;
      const bend = (i % 2 ? 1 : -1) * (0.22 + r * 0.12);
      const cx = mx - dy * bend;
      const cy = my + dx * bend - 12;
      out.push({
        name,
        x,
        y,
        path: `M${x.toFixed(1)} ${y.toFixed(1)} Q${cx.toFixed(1)} ${cy.toFixed(1)} ${home.x} ${home.y}`,
      });
    });
    return out;
  }, [shown.join("|")]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <section className="pp-map-wrap" aria-label={t("passport.mapTitle")}>
      <p className="pp-map-title" style={{ fontFamily: headingFont }}>
        {t("passport.mapTitle")}
      </p>
      <div className="pp-map">
        <svg viewBox={`0 0 ${W} ${H}`} className="pp-map-art" aria-hidden="true">
          <defs>
            <pattern id="pp-grid" width="30" height="30" patternUnits="userSpaceOnUse">
              <path
                d="M30 0H0V30"
                fill="none"
                stroke="currentColor"
                strokeOpacity=".08"
                strokeWidth=".8"
              />
            </pattern>
          </defs>
          <rect width={W} height={H} fill="url(#pp-grid)" />
          {/* Made-up islands, drawn by hand */}
          <g className="pp-land">
            <path d="M22 54c10-18 40-26 62-18 18 6 22 22 40 22 14 0 20 14 10 24-14 14-42 6-58 18-14 10-38 6-50-6-12-12-12-26-4-40z" />
            <path d="M226 26c22-10 54-8 72 6 14 10 34 8 40 22 6 16-10 28-28 26-20-2-30 12-50 8-22-4-30-22-44-28-12-6-4-28 10-34z" />
            <path d="M58 168c16-14 44-12 58-2 12 8 30 2 40 14 10 12-2 28-20 30-24 4-38-6-58-2-18 4-36-6-34-20 1-8 6-14 14-20z" />
            <path d="M250 160c14-10 38-6 50 4 14 12 34 10 38 26 4 14-16 22-34 18-18-4-30 6-48 0-16-6-22-20-14-32 2-6 4-12 8-16z" />
            <path d="M160 64c8-6 22-4 26 4 4 6-2 14-10 14-10 0-22-8-16-18z" />
          </g>
          <g className="pp-waves">
            <path d="M150 196q5-4 10 0t10 0" />
            <path d="M190 40q5-4 10 0t10 0" />
            <path d="M30 130q5-4 10 0t10 0" />
            <path d="M316 110q5-4 10 0t10 0" />
          </g>
          {/* Compass rose */}
          <g transform={`translate(${W - 34} ${H - 34})`} className="pp-compass">
            <circle r="15" />
            <path d="M0-20 4-4 0 0-4-4zM0 20 4 4 0 0-4 4z" />
            <path d="M-20 0-4-4 0 0-4 4zM20 0 4-4 0 0 4 4z" opacity=".5" />
            <text y="-24" textAnchor="middle">
              N
            </text>
          </g>
          {pins.map((p, i) => (
            <path
              key={p.name}
              id={`pp-route-${i}`}
              d={p.path}
              className={`pp-path ${found === p.name ? "is-found" : ""}`}
              style={{ stroke: inks[i % 2] }}
            />
          ))}
          {!reduce
            ? pins.slice(0, 2).map((p, i) => (
                <g key={`plane-${p.name}`} className="pp-map-plane">
                  <path d="M-6-1.5 4-1.5 7 0 4 1.5-6 1.5ZM-1-1.5-4-6h2l4 4.5ZM-1 1.5-4 6h2l4-4.5ZM-6-1.5-7.5-4h1.5l2 2.5ZM-6 1.5-7.5 4h1.5l2-2.5Z" />
                  <animateMotion
                    dur={`${7 + i * 2.3}s`}
                    begin={`${i * 1.7}s`}
                    repeatCount="indefinite"
                    rotate="auto"
                    keyPoints="0;1"
                    keyTimes="0;1"
                    calcMode="linear"
                  >
                    <mpath href={`#pp-route-${i}`} />
                  </animateMotion>
                </g>
              ))
            : null}
        </svg>
        <span
          className="pp-home"
          style={{
            left: `${((home.x / W) * 100).toFixed(2)}%`,
            top: `${((home.y / H) * 100).toFixed(2)}%`,
          }}
          aria-hidden="true"
        >
          <Heart className="size-4" fill="currentColor" />
          <span className="pp-home-code">{code}</span>
        </span>
        {pins.map((p, i) => (
          <button
            key={p.name}
            type="button"
            className={`pp-pin ${found === p.name ? "is-found" : ""}`}
            style={
              {
                left: `${((p.x / W) * 100).toFixed(2)}%`,
                top: `${((p.y / H) * 100).toFixed(2)}%`,
                "--pin": inks[i % 2],
              } as React.CSSProperties
            }
            onClick={() => onFind(p.name)}
            aria-label={t("passport.pinAria", { name: p.name })}
          >
            <span className="pp-pin-head">
              <span>{initial(p.name)}</span>
            </span>
            <span className="pp-pin-name">{p.name}</span>
          </button>
        ))}
      </div>
      <p className="pp-map-note">{t("passport.mapNote")}</p>
    </section>
  );
}

const SHAPES = ["round", "rect", "oval", "octa"] as const;
type Shape = (typeof SHAPES)[number];

function kindWord(p: Piece) {
  return t(`passport.kind.${p.sealed ? "sealed" : p.kind}` as MessageKey);
}

function KindIcon({ p, className }: { p: Piece; className?: string }) {
  const locked = p.sealed || isLocked(p);
  const Icon = locked
    ? Lock
    : p.kind === "photo"
      ? Camera
      : p.kind === "song"
        ? Music2
        : p.kind === "voice"
          ? Mic
          : p.kind === "ornament"
            ? Star
            : p.kind === "calendar"
              ? CalendarDays
              : Mail;
  return <Icon className={className} aria-hidden="true" />;
}

/** One ink stamp. Its shape, ink, tilt and spot come from the note's id, so it never moves between visits. */
function Stamp({
  piece,
  read,
  lifting,
  found,
  onOpen,
  inks,
  day,
}: {
  piece: Piece;
  read: boolean;
  lifting: boolean;
  found: boolean;
  onOpen: (e: React.MouseEvent) => void;
  inks: string[];
  day: string;
}) {
  const r = seed(piece.id);
  const r2 = seed(`${piece.id}-b`);
  const shape: Shape = SHAPES[Math.floor(r * SHAPES.length) % SHAPES.length]!;
  const ink = inks[Math.floor(r2 * inks.length) % inks.length]!;
  const tilt = (r2 - 0.5) * 30;
  const dx = (r - 0.5) * 16;
  const dy = (r2 - 0.5) * 14;
  const name = (piece.author || t("passport.withLove")).toUpperCase().slice(0, 16);
  // Long names squeeze to fit their stamp instead of running over the border.
  const fit = (max: number, size: number) =>
    name.length * size * 0.66 > max
      ? { textLength: max, lengthAdjust: "spacingAndGlyphs" as const }
      : {};
  const what = kindWord(piece).toUpperCase();
  const locked = isLocked(piece);
  const when =
    locked && piece.date
      ? formatDay(piece.date, { day: "2-digit", month: "short" }).toUpperCase()
      : day;
  const uid = piece.id.replace(/[^a-zA-Z0-9_-]/g, "");
  return (
    <button
      type="button"
      data-piece={piece.id}
      className={`pp-stamp is-${shape} ${read ? "is-read" : ""} ${lifting ? "is-lifting" : ""} ${found ? "is-found" : ""}`}
      style={
        {
          "--tilt": `${tilt.toFixed(1)}deg`,
          "--dx": `${dx.toFixed(1)}px`,
          "--dy": `${dy.toFixed(1)}px`,
          "--ink": ink,
        } as React.CSSProperties
      }
      onClick={onOpen}
      aria-label={pieceLabel(piece)}
    >
      <span className="pp-stamp-ink">
        {shape === "round" ? (
          <svg viewBox="0 0 120 120" aria-hidden="true">
            <defs>
              <path id={`pp-top-${uid}`} d="M18 60a42 42 0 0 1 84 0" />
              <path id={`pp-bot-${uid}`} d="M14 60a46 46 0 0 0 92 0" />
            </defs>
            <circle cx="60" cy="60" r="56" className="pp-line-thick" />
            <circle cx="60" cy="60" r="50.5" className="pp-line-thin" />
            <circle cx="60" cy="60" r="31" className="pp-line-thin" />
            <text className="pp-arc" fontSize={name.length > 11 ? 9.5 : 11.5}>
              <textPath href={`#pp-top-${uid}`} startOffset="50%" textAnchor="middle">
                {name}
              </textPath>
            </text>
            <text className="pp-arc is-small">
              <textPath href={`#pp-bot-${uid}`} startOffset="50%" textAnchor="middle">
                {`★ ${what} ★`}
              </textPath>
            </text>
            <text x="60" y="80" textAnchor="middle" className="pp-day" suppressHydrationWarning>
              {when}
            </text>
          </svg>
        ) : shape === "rect" ? (
          <svg viewBox="0 0 150 104" aria-hidden="true">
            <rect x="3" y="3" width="144" height="98" rx="7" className="pp-line-thick" />
            <rect x="9" y="9" width="132" height="86" rx="3" className="pp-line-thin" />
            <path d="M9 30H141M9 74H141" className="pp-line-thin" />
            <text x="75" y="24" textAnchor="middle" className="pp-small">
              {`${t("passport.entry").toUpperCase()} · ${what}`}
            </text>
            <text
              x="75"
              y="58"
              textAnchor="middle"
              className="pp-big"
              fontSize={name.length > 9 ? 13 : 17}
              {...fit(112, name.length > 9 ? 13 : 17)}
            >
              {name}
            </text>
            <text x="75" y="89" textAnchor="middle" className="pp-small" suppressHydrationWarning>
              {when}
            </text>
          </svg>
        ) : shape === "oval" ? (
          <svg viewBox="0 0 160 106" aria-hidden="true">
            <defs>
              <path id={`pp-top-${uid}`} d="M22 53a58 36 0 0 1 116 0" />
            </defs>
            <ellipse cx="80" cy="53" rx="76" ry="49" className="pp-line-thick" />
            <ellipse cx="80" cy="53" rx="69" ry="42" className="pp-line-thin" />
            <text className="pp-arc is-small">
              <textPath href={`#pp-top-${uid}`} startOffset="50%" textAnchor="middle">
                {`${t("passport.arrived").toUpperCase()} · ${what}`}
              </textPath>
            </text>
            <text
              x="80"
              y="62"
              textAnchor="middle"
              className="pp-big"
              fontSize={name.length > 9 ? 12 : 15}
              {...fit(104, name.length > 9 ? 12 : 15)}
            >
              {name}
            </text>
            <text x="80" y="80" textAnchor="middle" className="pp-small" suppressHydrationWarning>
              {when}
            </text>
          </svg>
        ) : (
          <svg viewBox="0 0 120 120" aria-hidden="true">
            <path d="M36 4H84L116 36V84L84 116H36L4 84V36Z" className="pp-line-thick" />
            <path d="M39 11H81L109 39V81L81 109H39L11 81V39Z" className="pp-line-thin" />
            <text x="60" y="34" textAnchor="middle" className="pp-small">
              {what}
            </text>
            <text
              x="60"
              y="88"
              textAnchor="middle"
              className="pp-big"
              fontSize={name.length > 8 ? 10 : 13}
              {...fit(70, name.length > 8 ? 10 : 13)}
            >
              {name}
            </text>
            <text
              x="60"
              y="100"
              textAnchor="middle"
              className="pp-small is-tiny"
              suppressHydrationWarning
            >
              {when}
            </text>
          </svg>
        )}
        <span className={`pp-stamp-icon is-${shape}`}>
          {shape === "round" || shape === "octa" ? (
            <KindIcon p={piece} className="size-full" />
          ) : (
            <span className="pp-stamp-plane">
              <KindIcon p={piece} className="size-full" />
            </span>
          )}
        </span>
      </span>
      <span className="pp-tick" aria-hidden="true">
        <svg viewBox="0 0 24 24">
          <path d="M4 13c3 2 4 4 6 6 3-6 6-10 11-14" />
        </svg>
      </span>
    </button>
  );
}

/** Photos: entry photos (portrait, paper clip) and postcards (landscape, cancelled stamp). */
function PhotoClip({
  piece,
  read,
  lifting,
  found,
  onOpen,
  day,
}: {
  piece: Piece;
  read: boolean;
  lifting: boolean;
  found: boolean;
  onOpen: (e: React.MouseEvent) => void;
  day: string;
}) {
  const r = seed(piece.id);
  const postcard = r > 0.5;
  const tilt = (r - 0.5) * 12;
  return (
    <button
      type="button"
      data-piece={piece.id}
      className={`pp-photo ${postcard ? "is-postcard" : "is-entry"} ${read ? "is-read" : ""} ${lifting ? "is-lifting" : ""} ${found ? "is-found" : ""}`}
      style={{ "--tilt": `${tilt.toFixed(1)}deg` } as React.CSSProperties}
      onClick={onOpen}
      aria-label={pieceLabel(piece)}
    >
      <span className="pp-photo-pic">
        <PhotoFace piece={piece} tint="#9DB7CF" sizes="180px" />
      </span>
      {postcard ? (
        <>
          <span className="pp-photo-greet">{t("passport.greetings")}</span>
          <span className="pp-cancel" aria-hidden="true" />
        </>
      ) : (
        <span className="pp-clip" aria-hidden="true" />
      )}
      <span className="pp-photo-from">
        {piece.author || t("passport.fromName")}
        <span suppressHydrationWarning> · {day}</span>
      </span>
      <span className="pp-tick" aria-hidden="true">
        <svg viewBox="0 0 24 24">
          <path d="M4 13c3 2 4 4 6 6 3-6 6-10 11-14" />
        </svg>
      </span>
    </button>
  );
}

/** The note, read as a postcard: a postage stamp and a postmark up top. */
function Postcard({ body, piece, code }: { body: Body; piece: Piece; code: string }) {
  const { colors, fonts } = body;
  return (
    <Reader
      piece={piece}
      onClose={body.closeReader}
      accent={colors.mix(colors.primary, "#1E1B2E", luma(colors.primary) > 0.45 ? 0.45 : 0)}
      className="pp-reader"
    >
      <div className="pp-postcard-head">
        <p className="pp-postcard-from" style={{ fontFamily: fonts.heading }}>
          {piece.author
            ? t("passport.postcardFrom", { name: piece.author })
            : t("passport.postcardFriend")}
        </p>
        <span className="pp-postage" aria-hidden="true">
          <span className="pp-postage-art">
            <Plane className="size-5" />
            <span>{code}</span>
          </span>
          <span className="pp-postmark" />
        </span>
      </div>
      <span className="pp-postcard-rule" aria-hidden="true" />
    </Reader>
  );
}

/** A machine-readable line at the foot of the last page, made from the name. */
function mrz(name: string, n: number) {
  const nm =
    (name || "FRIEND")
      .toUpperCase()
      .replace(/[^A-Z]/g, "")
      .slice(0, 12) || "FRIEND";
  const line1 = `P<JBX${nm}<<WITH<LOVE`.padEnd(40, "<").slice(0, 40);
  const line2 = `${String(n).padStart(3, "0")}STAMPS<<<1A<<<FIRST<CLASS`
    .padEnd(40, "<")
    .slice(0, 40);
  return `${line1}\n${line2}`;
}

function chunk<T>(list: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < list.length; i += size) out.push(list.slice(i, i + size));
  return out;
}

/** Relative brightness 0..1 of #rrggbb. */
function luma(c: string) {
  const n = parseInt(c.slice(1), 16);
  const ch = (s: number) => {
    const v = ((n >> s) & 255) / 255;
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * ch(16) + 0.7152 * ch(8) + 0.0722 * ch(0);
}

/** A passport cover color: the primary, kept deep. */
function deep2(c: string) {
  return luma(c) > 0.3 ? "#2E3A5C" : c;
}

/** The fine wavy security pattern on passport pages, as a CSS background. */
function guilloche(color: string) {
  const c = encodeURIComponent(color);
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='120' height='40' viewBox='0 0 120 40'><g fill='none' stroke='${c}' stroke-width='.7'><path d='M0 20 Q15 4 30 20 T60 20 T90 20 T120 20'/><path d='M0 20 Q15 36 30 20 T60 20 T90 20 T120 20'/><path d='M0 10 Q15 0 30 10 T60 10 T90 10 T120 10' opacity='.6'/><path d='M0 30 Q15 40 30 30 T60 30 T90 30 T120 30' opacity='.6'/></g></svg>`;
  return `url("data:image/svg+xml,${svg.replace(/'/g, "%27").replace(/</g, "%3C").replace(/>/g, "%3E").replace(/#/g, "%23").replace(/"/g, "%22")}")`;
}
