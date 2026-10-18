/**
 * Countdown's body: a rooftop at midnight.
 *
 * The New Year opening's clock hangs at the top of the night sky, still counting
 * down. Below it the city glows, and on the roof the notes stand in rows along
 * the ledges as fireworks, one rocket per friend with their name on a tag. Tap a
 * rocket: its fuse catches, it shoots up and bursts, and the note opens. It
 * leaves a spark with the friend's name in the sky above the city, so the sky
 * fills up as you read. When every rocket has gone up, the finale goes off.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { Lock, Mic, Music2, Star } from "lucide-react";
import { t } from "@/i18n";
import { SampleText } from "@/components/SampleMark";
import { burst, buzz, chime, foley } from "@/lib/play";
import { formatDay } from "@/lib/time";
import { useCountdown } from "@/lib/giftPieces";
import {
  BodyFooter,
  BodyRoot,
  Reader,
  isLocked,
  pieceLabel,
  pieceWhat,
  seed,
  useBody,
  useOpened,
  type BodyProps,
  type Piece,
} from "@/components/bodies/kit";

const FINALE = "rooftop-finale";
/** The sky starts low and grows a little with each spark (sparks sit from the skyline up, so none ever move). */
const SKY_BASE = 132;
const SKY_STEP = 14;
const SKY_MAX = 400;
const skyFor = (n: number) => Math.min(SKY_MAX, SKY_BASE + n * SKY_STEP);
type Kind = "rocket" | "fountain" | "candle" | "cake";
const KINDS: Kind[] = ["rocket", "fountain", "rocket", "candle", "cake", "rocket", "candle", "fountain"];

export function RooftopBody(props: BodyProps) {
  const body = useBody(props);
  const { data, colors, fonts, reduce } = body;
  const { opened, open } = useOpened("rooftop", body.site.id, body.sample);
  const notes = data.notes;
  const total = notes.length;
  // Sparks in the order they went up, so a new one never moves the others.
  const lit = useMemo(() => {
    const byId = new Map(notes.map((p) => [p.id, p]));
    return [...opened].map((id) => byId.get(id)).filter((p): p is Piece => !!p);
  }, [notes, opened]);
  const [flying, setFlying] = useState<string | null>(null);
  const finaleDone = useRef(false);
  const sparks = [colors.primary, colors.accent, "#FFF4D6", colors.mix(colors.primary, colors.accent, 0.5)];

  // Rockets per ledge: as many as fit.
  const roofRef = useRef<HTMLDivElement | null>(null);
  const [rw, setRw] = useState(358);
  useEffect(() => {
    const el = roofRef.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(([e]) => e && setRw(Math.round(e.contentRect.width)));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const per = Math.max(4, Math.min(12, Math.floor(rw / 64)));
  const ledges = useMemo(() => {
    const out: Piece[][] = [];
    for (let i = 0; i < notes.length; i += per) out.push(notes.slice(i, i + per));
    return out;
  }, [notes, per]);

  function launch(p: Piece, e: React.MouseEvent<HTMLElement>) {
    if (flying) return;
    const quiet = p.sealed || isLocked(p);
    const first = !opened.has(p.id);
    const host = body.hostRef.current;
    const r = e.currentTarget.getBoundingClientRect();
    const x = r.left + r.width / 2;
    const y0 = r.top + r.height * 0.3;
    // Burst high above the rocket, but always on screen.
    const y1 = Math.max(70, y0 - Math.min(320, window.innerHeight * 0.42));
    if (!first || reduce || quiet) {
      if (first) open(p.id);
      if (quiet && !reduce) buzz(6);
      body.read(p);
      return;
    }
    setFlying(p.id);
    foley("fizz");
    buzz(8);
    fly(host, x, y0, y1, colors.primary);
    window.setTimeout(() => {
      foley("crack");
      buzz([10, 30, 14]);
      burst(host, x, y1, { shape: "sparkles", colors: sparks, count: 26, spread: 1.7 });
      ring(host, x, y1, colors.primary);
      open(p.id);
    }, 720);
    window.setTimeout(() => {
      setFlying(null);
      body.read(p);
    }, 1080);
  }

  // Every rocket has gone up: once the last note is closed, the finale.
  const allLit = total > 0 && lit.length === total;
  useEffect(() => {
    if (!allLit || body.reading || flying || opened.has(FINALE) || finaleDone.current) return;
    finaleDone.current = true;
    open(FINALE);
    if (reduce) return;
    const host = body.hostRef.current;
    chime("tada");
    const w = window.innerWidth;
    const h = window.innerHeight;
    for (let i = 0; i < 6; i++)
      window.setTimeout(() => {
        const x = w * (0.18 + seed(`fx${i}`) * 0.64);
        const y = h * (0.14 + seed(`fy${i}`) * 0.3);
        burst(host, x, y, { shape: "sparkles", colors: sparks, count: 22, spread: 1.6 });
        ring(host, x, y, sparks[i % sparks.length]!);
        if (i % 2 === 0) foley("crack");
      }, 300 + i * 260);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allLit, body.reading, flying, opened]);

  const skyH = skyFor(lit.length);

  return (
    <BodyRoot
      body={body}
      className="rt-root"
      style={
        {
          "--rt-night": colors.dark ? colors.mix(colors.bg, "#000000", 0.25) : colors.mix("#141A38", colors.primary, 0.08),
          "--rt-sky": colors.dark ? colors.bg : colors.mix("#1B2350", colors.primary, 0.1),
          "--rt-city": colors.dark ? colors.mix(colors.bg, "#000000", 0.45) : "#0E1230",
          "--rt-city-far": colors.dark ? colors.mix(colors.bg, colors.accent, 0.12) : "#262E5E",
          "--rt-gold": colors.primary,
          "--rt-violet": colors.accent,
          "--rt-brick": colors.mix("#5A3A35", colors.bg, 0.3),
          "--rt-brick-deep": colors.mix("#3A2421", colors.bg, 0.35),
          "--rt-stone": colors.mix("#B9B2AA", colors.bg, 0.25),
          "--rt-skyH": `${skyH}px`,
          // It's always night up here: light palettes get a deep blue sky of their own.
          ...(colors.dark ? {} : { background: colors.mix("#141A3C", colors.primary, 0.08), color: "#F4F1FF" }),
        } as React.CSSProperties
      }
    >
      <div className="rt-night" aria-hidden="true">
        <Stars />
      </div>
      <div className="relative mx-auto max-w-[1080px] px-4 pt-[clamp(26px,7vh,64px)]">
        <header className="rt-head">
          <Clock date={data.countdownDate} headingFont={fonts.heading} />
          <p className="rt-kicker">{t("rooftop.kicker")}</p>
          <h1 className="rt-name" style={{ fontFamily: fonts.heading }}>
            {data.named ? <SampleText on={data.nameIsSample}>{data.name}</SampleText> : body.heading}
          </h1>
          {data.named ? <p className="rt-heading">{body.heading}</p> : null}
          <p className="rt-intro">{body.intro || body.voice.intro(data.named ? data.name : "")}</p>
        </header>

        {/* The sky over the city: a spark for every note that went up */}
        <div className="rt-sky" aria-label={t("rooftop.progress", { n: lit.length, total })} role="group">
          <div className="rt-sky-field">
          <span className="rt-moon" aria-hidden="true" />
          {lit.length === 0 && total ? <p className="rt-sky-hint">{t("rooftop.skyHint")}</p> : null}
          {lit.map((p, k) => {
            const i = notes.indexOf(p);
            const sx = 6 + seed(`${p.id}x`) * 88;
            const sy = 14 + seed(`${p.id}y`) * (skyFor(k + 1) - 66);
            return (
              <button
                key={p.id}
                type="button"
                className="rt-spark"
                tabIndex={-1}
                style={{ left: `${sx}%`, bottom: `${sy.toFixed(0)}px`, "--sc": sparks[i % sparks.length], "--tw": `${(2.4 + seed(p.id) * 2.4).toFixed(2)}s`, "--td": `${(-seed(p.id) * 3).toFixed(2)}s` } as React.CSSProperties}
                onClick={() => body.read(p)}
                aria-label={pieceLabel(p)}
              >
                <span className="rt-spark-star" />
                <span className="rt-spark-name">{p.author || t("rooftop.surprise")}</span>
              </button>
            );
          })}
          </div>
          <Skyline />
        </div>
      </div>

      {/* The roof: ledges of rockets */}
      <section className="rt-roof" aria-label={total ? t("rooftop.count", { n: total }) : t("rooftop.what")}>
        <div ref={roofRef} className="mx-auto max-w-[1080px] px-4">
          <p className="rt-status" role="status" aria-live="polite">
            {total === 0 ? body.voice.empty(t("rooftop.what")) : allLit ? t("rooftop.allLit") : lit.length ? t("rooftop.progress", { n: lit.length, total }) : t("rooftop.hint")}
          </p>
        </div>
        {(ledges.length ? ledges : [[]]).map((row, k) => (
          <div key={k} className={`rt-ledge ${k % 2 ? "is-odd" : ""}`} style={{ "--per": per } as React.CSSProperties}>
            <ul className="rt-rockets mx-auto max-w-[1080px] px-4">
              {row.map((p, i) => (
                <li key={p.id}>
                  <Rocket piece={p} index={k * per + i} gone={opened.has(p.id)} flying={flying === p.id} onLaunch={(e) => launch(p, e)} />
                </li>
              ))}
            </ul>
            <div className="rt-coping" aria-hidden="true" />
            <div className="rt-wall">
              <ul className="rt-tags mx-auto max-w-[1080px] px-4" aria-hidden="true">
                {row.map((p) => (
                  <li key={p.id} className={opened.has(p.id) ? "is-lit" : ""}>
                    <span className="rt-tag">{p.author || t("rooftop.surprise")}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        ))}
        <div className="rt-roof-floor">
          <div className="mx-auto max-w-[1080px] px-4 pb-20">
            {data.words.length ? (
              <section className="rt-words" aria-label={t("rooftop.wordsTitle")}>
                <p className="rt-words-title" style={{ fontFamily: fonts.heading }}>
                  {t("rooftop.wordsTitle")}
                </p>
                <p className="rt-words-list" style={{ fontFamily: fonts.heading }}>
                  {data.words.map((w, i) => (
                    <span key={w.id} style={{ "--wc": sparks[i % sparks.length], "--wd": `${(-seed(w.id) * 4).toFixed(2)}s` } as React.CSSProperties}>
                      {w.text}
                    </span>
                  ))}
                </p>
              </section>
            ) : null}
            <BodyFooter body={body} className="rt-footer" buttonStyle={{ background: colors.primary, color: colors.onPrimary }} />
          </div>
        </div>
      </section>

      {body.reading ? (
        <Reader piece={body.reading} onClose={body.closeReader} accent={colors.mix(colors.accent, "#FFFFFF", 0.35)} className="rt-reader">
          <span className="rt-reader-sky" aria-hidden="true">
            <span className="rt-reader-burst" />
          </span>
          {data.named && !body.reading.sealed && !isLocked(body.reading) ? (
            <p className="rt-reader-for" style={{ fontFamily: fonts.heading }}>
              {t("rooftop.for", { name: data.name })}
            </p>
          ) : null}
        </Reader>
      ) : null}
    </BodyRoot>
  );
}

/* ---------- the clock ---------- */

function Clock({ date, headingFont }: { date: string | null; headingFont: string }) {
  const c = useCountdown(date);
  const pad = (n: number) => String(n).padStart(2, "0");
  const parts = c ? [
    { v: c.days > 99 ? String(c.days) : pad(c.days), l: t("rooftop.days") },
    { v: pad(c.hours), l: t("rooftop.hours") },
    { v: pad(c.mins), l: t("rooftop.mins") },
    { v: pad(c.secs), l: t("rooftop.secs") },
  ] : null;
  return (
    <div className={`rt-clock ${c?.done ? "is-done" : ""}`}>
      {parts && !c?.done ? (
        <>
          <p className="rt-clock-label">{t("rooftop.until")}</p>
          <p className="rt-clock-face" role="timer" aria-label={t("body.countdown.left", { days: c!.days, hours: c!.hours, mins: c!.mins })} style={{ fontFamily: headingFont }}>
            {parts.map((p, i) => (
              <span key={i} className="rt-clock-group">
                {i ? <span className="rt-clock-colon" aria-hidden="true">:</span> : null}
                <span className="rt-clock-unit">
                  <span className="rt-clock-num">{p.v}</span>
                  <span className="rt-clock-unit-label">{p.l}</span>
                </span>
              </span>
            ))}
          </p>
        </>
      ) : (
        <p className="rt-clock-face is-midnight" style={{ fontFamily: headingFont }}>
          <span className="rt-clock-num">00</span>
          <span className="rt-clock-colon" aria-hidden="true">:</span>
          <span className="rt-clock-num">00</span>
          {c?.done ? <span className="sr-only">{t("body.countdown.done")}</span> : null}
        </p>
      )}
    </div>
  );
}

/* ---------- a rocket on the ledge ---------- */

function Rocket({ piece, index, gone, flying, onLaunch }: { piece: Piece; index: number; gone: boolean; flying: boolean; onLaunch: (e: React.MouseEvent<HTMLElement>) => void }) {
  const r = seed(piece.id);
  const locked = isLocked(piece);
  // A roof full of different fireworks: rockets on sticks, fountains, roman candles, cakes of tubes.
  const kind = KINDS[(index + Math.floor(seed(`${piece.id}k`) * KINDS.length)) % KINDS.length]!;
  const Icon = piece.sealed || locked ? Lock : piece.kind === "song" ? Music2 : piece.kind === "voice" ? Mic : piece.kind === "ornament" ? Star : null;
  return (
    <button
      type="button"
      className={`rt-rocket rt-k-${kind} is-c${(index + (index >> 2)) % 4} ${gone ? "is-gone" : ""} ${flying ? "is-flying" : ""} ${piece.sealed || locked ? "is-quiet" : ""}`}
      style={{ "--h": `${(0.82 + r * 0.3).toFixed(2)}`, "--lean": `${((seed(`${piece.id}l`) - 0.5) * 6).toFixed(1)}deg` } as React.CSSProperties}
      onClick={onLaunch}
      aria-label={`${pieceLabel(piece)}${locked ? `. ${t("body.opensOn", { day: formatDay(piece.date!) })}` : ""}`}
      title={pieceWhat(piece)}
    >
      {kind === "rocket" ? <span className="rt-stick" /> : null}
      <span className="rt-ship">
        {kind === "rocket" ? <span className="rt-cone" /> : null}
        {kind === "cake" ? <span className="rt-cake-top" /> : null}
        {kind === "fountain" ? <span className="rt-cap" /> : null}
        <span className="rt-tube">{Icon ? <Icon className="rt-tube-icon" /> : null}</span>
        {kind === "rocket" ? (
          <>
            <span className="rt-fin is-l" />
            <span className="rt-fin is-r" />
          </>
        ) : null}
        {kind === "candle" ? <span className="rt-base" /> : null}
        <span className="rt-fuse" />
      </span>
      {gone ? <span className="rt-wisp" /> : null}
    </button>
  );
}

/* ---------- the night ---------- */

function Stars() {
  const stars = useMemo(
    () =>
      Array.from({ length: 46 }, (_, i) => ({
        x: seed(`sx${i}`) * 100,
        y: seed(`sy${i}`) * 100,
        s: 1 + seed(`ss${i}`) * 1.8,
        d: -seed(`sd${i}`) * 5,
      })),
    [],
  );
  return (
    <>
      {stars.map((s, i) => (
        <span key={i} className="rt-star" style={{ left: `${s.x}%`, top: `${s.y}%`, width: s.s, height: s.s, animationDelay: `${s.d}s` }} />
      ))}
    </>
  );
}

/** Two rows of buildings, the far row hazier, windows lit and a few blinking. */
function Skyline() {
  const city = useMemo(() => {
    let k = 0;
    const r = () => seed(`city${k++}`);
    const row = (base: number, hMin: number, hMax: number, wMin: number, wMax: number) => {
      const out: { x: number; w: number; h: number; spire: boolean }[] = [];
      let x = -10;
      while (x < 1210) {
        const w = wMin + r() * (wMax - wMin);
        out.push({ x, w, h: hMin + r() * (hMax - hMin), spire: r() > 0.86 });
        x += w + (r() > 0.7 ? 2 : 0);
      }
      return out.map((b) => ({ ...b, y: base - b.h }));
    };
    const back = row(140, 50, 118, 16, 34);
    const front = row(140, 22, 74, 14, 30);
    const windows: { x: number; y: number; blink: boolean; d: number }[] = [];
    for (const b of front)
      for (let wy = b.y + 6; wy < 134; wy += 7)
        for (let wx = b.x + 3; wx < b.x + b.w - 4; wx += 5) if (r() < 0.3) windows.push({ x: wx, y: wy, blink: r() < 0.1, d: -r() * 7 });
    return { back, front, windows };
  }, []);
  const shape = (b: { x: number; y: number; w: number; spire: boolean }) =>
    `M${b.x.toFixed(1)} 141V${b.y.toFixed(1)}h${b.w.toFixed(1)}V141z` + (b.spire ? `M${(b.x + b.w / 2 - 1).toFixed(1)} ${b.y.toFixed(1)}v-14h2v14z` : "");
  return (
    <svg className="rt-skyline" viewBox="0 0 1200 140" preserveAspectRatio="xMidYMax slice" aria-hidden="true">
      <path d={city.back.map(shape).join("")} fill="var(--rt-city-far)" />
      <path d={city.front.map(shape).join("")} fill="var(--rt-city)" />
      {city.windows.map((w, i) => (
        <rect key={i} x={w.x} y={w.y} width="2.2" height="3" rx=".4" className={w.blink ? "rt-window is-blink" : "rt-window"} style={w.blink ? { animationDelay: `${w.d}s` } : undefined} />
      ))}
    </svg>
  );
}

/* ---------- effects (DOM only, cleaned up after) ---------- */

/** A rocket's glowing head and trail, from the ledge up to where it bursts. */
function fly(host: HTMLElement | null, x: number, y0: number, y1: number, color: string) {
  if (!host) return;
  const rect = host.getBoundingClientRect();
  const scale = host.offsetWidth ? rect.width / host.offsetWidth : 1;
  const el = document.createElement("span");
  el.className = "rt-flight";
  el.style.left = `${(x - rect.left) / scale}px`;
  el.style.top = `${(y0 - rect.top) / scale}px`;
  el.style.setProperty("--fc", color);
  host.appendChild(el);
  const dy = (y1 - y0) / scale;
  const a = el.animate(
    [
      { transform: "translate(-50%, 0) scaleY(.6)", opacity: 0 },
      { transform: `translate(-50%, ${dy * 0.15}px) scaleY(1)`, opacity: 1, offset: 0.12 },
      { transform: `translate(calc(-50% + 6px), ${dy}px) scaleY(.7)`, opacity: 1 },
    ],
    { duration: 720, easing: "cubic-bezier(.3,.7,.4,1)", fill: "forwards" },
  );
  a.onfinish = () => el.remove();
}

/** A soft ring of light where a firework bursts. */
function ring(host: HTMLElement | null, x: number, y: number, color: string) {
  if (!host) return;
  const rect = host.getBoundingClientRect();
  const scale = host.offsetWidth ? rect.width / host.offsetWidth : 1;
  const el = document.createElement("span");
  el.className = "rt-ring";
  el.style.left = `${(x - rect.left) / scale}px`;
  el.style.top = `${(y - rect.top) / scale}px`;
  el.style.setProperty("--fc", color);
  host.appendChild(el);
  const a = el.animate(
    [
      { transform: "translate(-50%, -50%) scale(.2)", opacity: 1 },
      { transform: "translate(-50%, -50%) scale(1)", opacity: 0 },
    ],
    { duration: 900, easing: "cubic-bezier(.2,.7,.3,1)", fill: "forwards" },
  );
  a.onfinish = () => el.remove();
}
