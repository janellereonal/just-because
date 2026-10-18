/**
 * Fetch's body: a toy basket.
 *
 * The pet from the opening brought the gift; now its toy basket is full of
 * notes. The name is on a bone-shaped ID tag hanging from a collar. Every note
 * rides on a toy (balls, bones, rope toys, squeaky toys) heaped in a woven
 * basket. Tap one and it bounces out of the basket onto the rug, and the note
 * opens. Toys you've played with stay on the rug on this device. Photos are
 * pinned to a "best friends" wall of polaroids with paw prints, and the words
 * are dog biscuits.
 */
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { CalendarDays, Lock, Mic, Music2, PawPrint, Star } from "lucide-react";
import { t } from "@/i18n";
import { SampleText } from "@/components/SampleMark";
import { useCountdown } from "@/lib/giftPieces";
import { burst, buzz, chime, foley } from "@/lib/play";
import {
  BodyFooter,
  BodyRoot,
  PhotoFace,
  Reader,
  isLocked,
  pieceLabel,
  seed,
  useBody,
  useOpened,
  type BodyProps,
  type Piece,
} from "@/components/bodies/kit";

type Body = ReturnType<typeof useBody>;
type Toy = "tennis" | "ball" | "bone" | "rope" | "squeaky" | "donut" | "star";
type Colors = { primary: string; accent: string; tennis: string; cream: string; soft: string };

// useLayoutEffect warns on the server; it only matters in the browser.
const useIso = typeof window === "undefined" ? useEffect : useLayoutEffect;

export function ToyBasketBody(props: BodyProps) {
  const body = useBody(props);
  const { data, colors, fonts, reduce } = body;
  const { opened, open } = useOpened("toybasket", body.site.id, body.sample);
  // Toys taken out during this visit leave a gap in the basket instead of reshuffling it.
  const [takenNow, setTakenNow] = useState<Set<string>>(new Set());
  const [landing, setLanding] = useState<{ id: string; from: DOMRect } | null>(null);
  const busy = useRef(false);

  const toys = data.notes.filter((p) => p.kind !== "photo" || p.sealed);
  const photos = data.notes.filter((p) => p.kind === "photo" && !p.sealed);
  const inBasket = toys.filter((p) => !opened.has(p.id) || takenNow.has(p.id));
  const onRug = toys.filter((p) => opened.has(p.id));
  const count = data.notes.filter((p) => opened.has(p.id)).length;
  const all = toys.length > 0 && onRug.length === toys.length;

  const tc = useMemo<Colors>(
    () => ({
      primary: colors.primary,
      accent: colors.accent,
      tennis: colors.mix("#D7E25A", colors.primary, 0.08),
      cream: "#FBF1DE",
      soft: colors.mix(colors.accent, "#FFFFFF", 0.5),
    }),
    [colors],
  );

  function pull(p: Piece, e: React.MouseEvent<HTMLButtonElement>) {
    if (busy.current) return;
    if (opened.has(p.id) && !takenNow.has(p.id)) {
      // Already on the rug: a little hop, then read.
      chime("boop");
      body.read(p);
      return;
    }
    if (opened.has(p.id)) return;
    const from = e.currentTarget.getBoundingClientRect();
    busy.current = true;
    foley("thunk");
    buzz([8, 50, 8]);
    setTakenNow((s) => new Set(s).add(p.id));
    open(p.id);
    if (reduce) {
      busy.current = false;
      body.read(p);
      return;
    }
    setLanding({ id: p.id, from });
  }

  // The bounce: the toy leaves the basket where it was and arcs onto its spot on the rug.
  const rugRef = useRef<HTMLDivElement | null>(null);
  useIso(() => {
    if (!landing) return;
    const el = rugRef.current?.querySelector<HTMLElement>(`[data-toy="${CSS.escape(landing.id)}"]`);
    const piece = toys.find((p) => p.id === landing.id);
    const done = () => {
      busy.current = false;
      setLanding(null);
      if (piece) body.read(piece);
    };
    if (!el || !el.animate) {
      done();
      return;
    }
    const to = el.getBoundingClientRect();
    const dx = landing.from.left + landing.from.width / 2 - (to.left + to.width / 2);
    const dy = landing.from.top + landing.from.height / 2 - (to.top + to.height / 2);
    const lift = Math.min(220, 90 + Math.abs(dy) * 0.25);
    const spin = dx > 0 ? -1 : 1;
    const anim = el.animate(
      [
        { transform: `translate(${dx}px, ${dy}px) rotate(0deg) scale(1)`, easing: "cubic-bezier(.3,.6,.5,1)" },
        { transform: `translate(${dx * 0.5}px, ${Math.min(dy, 0) * 0.5 - lift}px) rotate(${spin * 200}deg) scale(1.12)`, offset: 0.42, easing: "cubic-bezier(.5,0,.8,.5)" },
        { transform: `translate(0px, 0px) rotate(${spin * 360}deg) scale(1, .82)`, offset: 0.72, easing: "cubic-bezier(.2,.7,.4,1)" },
        { transform: `translate(0px, -26px) rotate(${spin * 380}deg) scale(1)`, offset: 0.86, easing: "cubic-bezier(.5,0,.8,.5)" },
        { transform: `translate(0px, 0px) rotate(${spin * 360}deg) scale(1)` },
      ],
      { duration: 1000 },
    );
    const thud = window.setTimeout(() => {
      foley("thunk");
      const r = el.getBoundingClientRect();
      burst(body.hostRef.current, r.left + r.width / 2, r.top + r.height / 2, { shape: "paws", colors: [tc.primary, tc.accent], count: 7, spread: 0.7, up: true });
    }, 720);
    const end = window.setTimeout(done, 1080);
    return () => {
      anim.cancel();
      window.clearTimeout(thud);
      window.clearTimeout(end);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [landing]);

  const name = data.named ? data.name : "";
  return (
    <BodyRoot
      body={body}
      className="tb-root"
      style={
        {
          "--tb-wicker": colors.mix("#D5A866", colors.primary, 0.06),
          "--tb-wicker-deep": colors.mix("#A87A3E", colors.primary, 0.08),
          "--tb-wicker-dark": colors.mix("#5E3F1E", colors.primary, 0.08),
          "--tb-collar": colors.primary,
          "--tb-trail": pawTrail(colors.ink),
          "--tb-title": colors.dark ? colors.mix(colors.primary, "#FFFFFF", 0.5) : colors.primary,
          "--tb-rug1": colors.mix(colors.primary, "#FFFFFF", 0.62),
          "--tb-rug2": colors.mix(colors.accent, "#FFFFFF", 0.7),
          "--tb-rug3": colors.mix("#F3E6CF", colors.primary, 0.06),
          "--tb-rug4": colors.mix(colors.primary, "#FFFFFF", 0.4),
          "--tb-floor": colors.dark ? colors.mix(colors.bg, "#000000", 0.18) : colors.mix(colors.bg, "#8C6A48", 0.1),
        } as React.CSSProperties
      }
    >
      <div className="relative mx-auto max-w-6xl px-4 pb-20">
        {/* The collar and the name tag */}
        <header className="tb-head" data-gift-page="">
          <div className="tb-collar" aria-hidden="true">
            <span className="tb-collar-ring" />
          </div>
          <div className="tb-tag">
            <svg viewBox="0 0 320 150" className="tb-tag-art" aria-hidden="true">
              <defs>
                <linearGradient id="tb-metal" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#FFF4CF" />
                  <stop offset="45%" stopColor="#E9C46A" />
                  <stop offset="100%" stopColor="#B98A2E" />
                </linearGradient>
              </defs>
              <path
                d="M58 18c22 0 34 16 36 30h132c2-14 14-30 36-30 26 0 42 20 38 40-2 10-8 16-14 17 6 1 12 7 14 17 4 20-12 40-38 40-22 0-34-16-36-30H94c-2 14-14 30-36 30-26 0-42-20-38-40 2-10 8-16 14-17-6-1-12-7-14-17-4-20 12-40 38-40Z"
                fill="url(#tb-metal)"
                stroke="#A87A24"
                strokeWidth="2.5"
              />
              <path d="M70 34c-14 0-24 10-22 22" fill="none" stroke="#FFFBE8" strokeWidth="4" strokeLinecap="round" opacity=".7" />
              <circle cx="160" cy="34" r="6" fill="none" stroke="#A87A24" strokeWidth="2.5" />
            </svg>
            <div className="tb-tag-text">
              <p className="tb-tag-kicker">{data.named ? t("toybasket.tagFor") : ""}</p>
              <h1 className="tb-tag-name" style={{ fontFamily: fonts.heading }}>
                {data.named ? <SampleText on={data.nameIsSample}>{data.name}</SampleText> : body.heading}
              </h1>
            </div>
          </div>
          {data.named ? (
            <p className="tb-heading" style={{ fontFamily: fonts.heading }}>
              {body.heading}
            </p>
          ) : null}
          <p className="tb-intro">{body.intro || body.voice.intro(name)}</p>
          <PawCountdown date={data.countdownDate} />
        </header>

        <p className="tb-progress" role="status" aria-live="polite">
          {data.notes.length === 0
            ? body.voice.empty(t("toybasket.what"))
            : count === 0
              ? t("toybasket.count", { n: toys.length || data.notes.length })
              : count === data.notes.length
                ? t("toybasket.allRead")
                : t("toybasket.progress", { n: onRug.length, total: toys.length })}
        </p>

        <div className="tb-play">
          {/* The basket */}
          <section className="tb-basket" aria-label={t("toybasket.basketAria")}>
            <span className="tb-handle is-left" aria-hidden="true" />
            <span className="tb-handle is-right" aria-hidden="true" />
            <div className="tb-basket-rim">
              <div className="tb-basket-in">
                {inBasket.length && !all ? (
                  <ul className="tb-heap">
                    {inBasket.map((p, i) => (
                      <li
                        key={p.id}
                        style={
                          {
                            "--jx": `${((seed(`${p.id}-x`) - 0.5) * 18).toFixed(1)}px`,
                            "--jy": `${((seed(`${p.id}-y`) - 0.5) * 22).toFixed(1)}px`,
                          } as React.CSSProperties
                        }
                      >
                        {takenNow.has(p.id) && opened.has(p.id) ? (
                          <span className="tb-gap" aria-hidden="true" />
                        ) : (
                          <ToyButton piece={p} tc={tc} onPull={(e) => pull(p, e)} index={i} />
                        )}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="tb-basket-empty">{toys.length ? t("toybasket.basketEmpty") : body.voice.empty(t("toybasket.what"))}</p>
                )}
              </div>
            </div>
            <div className="tb-basket-front" aria-hidden="true" />
          </section>

          {/* The rug */}
          <section className="tb-rug" aria-label={t("toybasket.rugAria")} ref={rugRef}>
            {onRug.length ? (
              <ul className="tb-rug-toys">
                {onRug.map((p, i) => (
                  <li key={p.id}>
                    <ToyButton piece={p} tc={tc} onPull={(e) => pull(p, e)} index={i} onRug landing={landing?.id === p.id} />
                  </li>
                ))}
              </ul>
            ) : (
              <p className="tb-rug-empty">
                <PawPrint className="size-6" aria-hidden="true" />
                {t("toybasket.rugEmpty")}
              </p>
            )}
          </section>
        </div>

        {photos.length ? (
          <section className="tb-wall" aria-label={t("toybasket.wallTitle")}>
            <p className="tb-wall-title" style={{ fontFamily: fonts.heading }}>
              {t("toybasket.wallTitle")}
            </p>
            <p className="tb-wall-note">{t("toybasket.wallNote")}</p>
            <ul className="tb-polaroids">
              {photos.map((p, i) => (
                <li key={p.id} style={{ "--tilt": `${((seed(p.id) - 0.5) * 9).toFixed(1)}deg` } as React.CSSProperties}>
                  <button type="button" className={`tb-polaroid ${opened.has(p.id) ? "is-seen" : ""}`} onClick={() => { open(p.id); foley("paper"); body.read(p); }} aria-label={pieceLabel(p)}>
                    <span className="tb-tape" aria-hidden="true" style={{ rotate: `${(seed(`${p.id}t`) - 0.5) * 16}deg` }} />
                    <span className="tb-polaroid-pic">
                      <PhotoFace piece={p} tint={i % 2 ? tc.soft : tc.tennis} sizes="200px" />
                    </span>
                    <span className="tb-polaroid-name">{p.author || t("toybasket.friend")}</span>
                    <PawPrint className="tb-paw" aria-hidden="true" />
                  </button>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {data.words.length ? (
          <section className="tb-treats" aria-label={data.named ? t("toybasket.wordsTitle", { name: data.name }) : t("toybasket.wordsAnon")}>
            <p className="tb-wall-title" style={{ fontFamily: fonts.heading }}>
              {data.named ? t("toybasket.wordsTitle", { name: data.name }) : t("toybasket.wordsAnon")}
            </p>
            <ul className="tb-biscuits">
              {data.words.map((w) => (
                <li key={w.id} style={{ rotate: `${((seed(w.id) - 0.5) * 10).toFixed(1)}deg` }}>
                  <span className="tb-biscuit">{w.text}</span>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        <BodyFooter body={body} className="tb-footer" buttonStyle={{ background: colors.primary, color: colors.onPrimary }} />
      </div>

      {body.reading ? <TagReader body={body} piece={body.reading} /> : null}
    </BodyRoot>
  );
}

/** The countdown with a paw. Client only (minutes move between server and browser). */
function PawCountdown({ date }: { date: string | null }) {
  const c = useCountdown(date);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!c) return null;
  if (!mounted) return <div className="tb-count is-waiting" aria-hidden="true" />;
  return (
    <p className="tb-count" role="timer">
      <PawPrint className="size-4 flex-none" aria-hidden="true" />
      <span>{c.done ? t("toybasket.now") : `${t("body.countdown.left", { days: c.days, hours: c.hours, mins: c.mins })}`}</span>
    </p>
  );
}

function toyFor(p: Piece): Toy {
  if (p.kind === "song" || p.kind === "voice") return "squeaky";
  if (p.kind === "ornament") return "star";
  const list: Toy[] = ["tennis", "ball", "bone", "rope", "donut", "tennis", "bone"];
  return list[Math.floor(seed(`${p.id}-toy`) * list.length) % list.length]!;
}

function ToyButton({
  piece,
  tc,
  onPull,
  index,
  onRug = false,
  landing = false,
}: {
  piece: Piece;
  tc: Colors;
  onPull: (e: React.MouseEvent<HTMLButtonElement>) => void;
  index: number;
  onRug?: boolean;
  landing?: boolean;
}) {
  const toy = toyFor(piece);
  const r = seed(piece.id);
  const locked = piece.sealed || isLocked(piece);
  const Icon = locked ? Lock : piece.kind === "song" ? Music2 : piece.kind === "voice" ? Mic : piece.kind === "ornament" ? Star : piece.kind === "calendar" ? CalendarDays : null;
  const tilt = (r - 0.5) * (onRug ? 50 : 70);
  return (
    <button
      type="button"
      data-toy={piece.id}
      className={`tb-toy is-${toy} ${onRug ? "is-out" : ""} ${landing ? "is-landing" : ""}`}
      style={{ "--tilt": `${tilt.toFixed(1)}deg`, "--i": index % 12, "--sc": (0.84 + seed(`${piece.id}-s`) * 0.3).toFixed(2), "--tr": `${((r - 0.5) * 18).toFixed(1)}deg` } as React.CSSProperties}
      onClick={onPull}
      aria-label={pieceLabel(piece)}
    >
      <span className="tb-toy-art">
        <ToyArt toy={toy} tc={tc} r={r} />
      </span>
      <span className="tb-toy-tag">
        {Icon ? <Icon className="tb-toy-icon" aria-hidden="true" /> : null}
        <span className="tb-toy-name">{piece.author || "♡"}</span>
      </span>
    </button>
  );
}

/** The toys, drawn small and soft in the gift's colors. */
function ToyArt({ toy, tc, r }: { toy: Toy; tc: Colors; r: number }) {
  const hi = <ellipse cx="38" cy="32" rx="12" ry="8" fill="#fff" opacity=".45" transform="rotate(-30 38 32)" />;
  if (toy === "tennis")
    return (
      <svg viewBox="0 0 100 100">
        <circle cx="50" cy="50" r="38" fill={tc.tennis} />
        <path d="M20 26c16 10 18 38 0 50M80 24c-16 10-18 40 0 52" fill="none" stroke="#FFFDF2" strokeWidth="5" strokeLinecap="round" />
        <circle cx="50" cy="50" r="38" fill="none" stroke="rgba(0,0,0,.12)" strokeWidth="2" />
        {hi}
      </svg>
    );
  if (toy === "ball")
    return (
      <svg viewBox="0 0 100 100">
        <circle cx="50" cy="50" r="36" fill={r > 0.5 ? tc.primary : tc.accent} />
        <path d="M15 44q35 16 70 0v12q-35 16-70 0Z" fill="#FFFDF5" opacity=".9" />
        <circle cx="50" cy="50" r="36" fill="none" stroke="rgba(0,0,0,.14)" strokeWidth="2" />
        {hi}
      </svg>
    );
  if (toy === "bone") {
    const shape = (fill: string) => (
      <g fill={fill}>
        <rect x="27" y="42" width="46" height="16" rx="6" />
        <circle cx="27" cy="41" r="11" />
        <circle cx="27" cy="59" r="11" />
        <circle cx="73" cy="41" r="11" />
        <circle cx="73" cy="59" r="11" />
      </g>
    );
    return (
      <svg viewBox="0 0 100 100">
        <g transform="rotate(-32 50 50)">
          <g transform="translate(0 3)">{shape("rgba(90,60,30,.28)")}</g>
          {shape(r > 0.5 ? tc.cream : tc.soft)}
          <path d="M22 35a7 7 0 0 1 9-3M33 45h30" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" opacity=".75" />
        </g>
      </svg>
    );
  }
  if (toy === "rope")
    return (
      <svg viewBox="0 0 100 100">
        <path d="M22 70Q50 40 78 30" fill="none" stroke={tc.cream} strokeWidth="14" strokeLinecap="round" />
        <path d="M22 70Q50 40 78 30" fill="none" stroke={r > 0.5 ? tc.primary : tc.accent} strokeWidth="14" strokeDasharray="7 7" />
        <path d="M22 70Q50 40 78 30" fill="none" stroke="rgba(0,0,0,.12)" strokeWidth="14" strokeDasharray="1 6" />
        <circle cx="20" cy="72" r="11" fill={tc.cream} stroke="rgba(90,60,30,.3)" strokeWidth="2" />
        <circle cx="80" cy="28" r="11" fill={tc.cream} stroke="rgba(90,60,30,.3)" strokeWidth="2" />
        <path d="M12 82l-4 6M18 84l-1 7M26 82l3 6M88 18l4-6M82 16l1-7M74 18l-3-6" stroke={tc.cream} strokeWidth="3" strokeLinecap="round" />
      </svg>
    );
  if (toy === "donut")
    return (
      <svg viewBox="0 0 100 100">
        <circle cx="50" cy="50" r="36" fill={colorMixLite(tc.cream, "#E8B07A")} />
        <path d="M50 18a32 32 0 1 1-0.1 0Z" fill={tc.soft} />
        <circle cx="50" cy="50" r="13" fill="var(--tb-hole, #6b4a2a)" />
        <circle cx="50" cy="50" r="13" fill="none" stroke="rgba(0,0,0,.18)" strokeWidth="2" />
        {[0, 1, 2, 3, 4, 5, 6, 7].map((k) => (
          <rect key={k} x="48" y="23" width="4" height="9" rx="2" fill={[tc.primary, tc.tennis, "#fff", tc.accent][k % 4]} transform={`rotate(${k * 45 + 20} 50 50)`} />
        ))}
      </svg>
    );
  if (toy === "star")
    return (
      <svg viewBox="0 0 100 100">
        <path d="M50 12 61 37 88 39 67 57 74 84 50 69 26 84 33 57 12 39 39 37Z" fill={tc.tennis} stroke="rgba(90,60,30,.3)" strokeWidth="3" strokeLinejoin="round" />
        <circle cx="42" cy="48" r="3.5" fill="#3A2A22" />
        <circle cx="58" cy="48" r="3.5" fill="#3A2A22" />
        <path d="M44 58q6 5 12 0" fill="none" stroke="#3A2A22" strokeWidth="3" strokeLinecap="round" />
      </svg>
    );
  // A squeaky bear: round body, little ears and a smile.
  return (
    <svg viewBox="0 0 100 100">
      <ellipse cx="50" cy="56" rx="34" ry="28" fill={tc.accent} />
      <circle cx="30" cy="30" r="10" fill={tc.accent} />
      <circle cx="70" cy="30" r="10" fill={tc.accent} />
      <circle cx="30" cy="30" r="5" fill={tc.soft} />
      <circle cx="70" cy="30" r="5" fill={tc.soft} />
      <ellipse cx="50" cy="62" rx="20" ry="14" fill={tc.soft} />
      <circle cx="40" cy="50" r="3.5" fill="#2E2220" />
      <circle cx="60" cy="50" r="3.5" fill="#2E2220" />
      <ellipse cx="50" cy="60" rx="5" ry="3.5" fill="#2E2220" />
      <path d="M44 67q6 4 12 0" fill="none" stroke="#2E2220" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
}

/** A tile of little paw prints walking left to right, as a CSS background. */
function pawTrail(color: string) {
  const paw = (x: number, y: number, r: number) =>
    `<g transform='translate(${x} ${y}) rotate(${r})'><ellipse cx='0' cy='4' rx='6' ry='5'/><circle cx='-6' cy='-4' r='2.4'/><circle cx='-2' cy='-7.5' r='2.4'/><circle cx='2.5' cy='-7.5' r='2.4'/><circle cx='6.5' cy='-4' r='2.4'/></g>`;
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='150' height='120'><g fill='${color}'>${paw(18, 70, 80)}${paw(52, 50, 100)}${paw(88, 74, 80)}${paw(124, 54, 100)}</g></svg>`;
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
}

function colorMixLite(a: string, b: string) {
  const pa = parseInt(a.slice(1), 16);
  const pb = parseInt(b.slice(1), 16);
  const ch = (sh: number) => Math.round(((pa >> sh) & 255) * 0.5 + ((pb >> sh) & 255) * 0.5);
  return `#${((ch(16) << 16) | (ch(8) << 8) | ch(0)).toString(16).padStart(6, "0")}`;
}

/** The note, read on a big tag-shaped card with a paw stamp. */
function TagReader({ body, piece }: { body: Body; piece: Piece }) {
  const { colors, fonts } = body;
  return (
    <Reader piece={piece} onClose={body.closeReader} accent={colors.dark ? colors.mix(colors.primary, "#000000", 0.15) : colors.primary} className="tb-reader">
      <div className="tb-reader-head">
        <span className="tb-reader-ring" aria-hidden="true" />
        <span className="tb-reader-from" style={{ fontFamily: fonts.heading }}>
          {piece.author ? t("toybasket.from", { name: piece.author }) : t("toybasket.friend")}
        </span>
        <PawPrint className="tb-reader-paw" aria-hidden="true" />
      </div>
    </Reader>
  );
}
