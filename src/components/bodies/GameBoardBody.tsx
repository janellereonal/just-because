/**
 * Board Game's body: a real game board on the table.
 *
 * The opening's board (a ring of coloured squares around a navy middle with the
 * greeting) becomes the box lid at the top. Under it, the board itself: a winding
 * track that snakes down the table, one square per note, each with the friend's
 * initial on a coloured space. Press Roll and two CSS dice tumble; the token hops
 * square by square to the next unopened note and its note card opens. Any square
 * can be tapped too, and the token jumps there. Opened squares get a peg and stay
 * that way on this device.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Check, Lock, Mic, Music2, Star } from "lucide-react";
import { t } from "@/i18n";
import { SampleText } from "@/components/SampleMark";
import { burst, buzz, chime, foley } from "@/lib/play";
import { isDark, readableInk } from "@/lib/palettes";
import { formatDay } from "@/lib/time";
import {
  BodyFooter,
  BodyRoot,
  CountdownLine,
  PhotoFace,
  Reader,
  initial,
  isLocked,
  pieceLabel,
  pieceWhat,
  seed,
  useBody,
  useOpened,
  type BodyProps,
  type Piece,
} from "@/components/bodies/kit";

/** A row of squares plus the bend down to the next row, in squares. */
const ROW = 1.36;
/** Little prints on the board between the rows. */
const PRINTS = ["★", "♥", "✦", "●", "◆"];
/** Where each face's pips sit, on a 3x3 grid. */
const PIPS: Record<number, number[]> = { 1: [4], 2: [0, 8], 3: [0, 4, 8], 4: [0, 2, 6, 8], 5: [0, 2, 4, 6, 8], 6: [0, 2, 3, 5, 6, 8] };
/** The cube turn [x, y] that brings each face to the front. */
const FACE_TURN: Record<number, [number, number]> = { 1: [0, 0], 6: [0, 180], 2: [0, -90], 5: [0, 90], 3: [-90, 0], 4: [90, 0] };
/** Word tile points, like the letter tiles in a word game. */
const POINTS: Record<string, number> = { a: 1, e: 1, i: 1, o: 1, u: 1, l: 1, n: 1, s: 1, t: 1, r: 1, d: 2, g: 2, b: 3, c: 3, m: 3, p: 3, f: 4, h: 4, v: 4, w: 4, y: 4, k: 5, j: 8, x: 8, q: 10, z: 10 };

type Phase = "idle" | "rolling" | "moving";

/** Square i on a board `cols` wide, snaking: left to right, then right to left. */
function place(i: number, cols: number) {
  const r = Math.floor(i / cols);
  const k = i % cols;
  return { r, c: r % 2 ? cols - 1 - k : k };
}

/** Two dice that add up to `d` (the real number of squares to hop), or one die for a single step. */
function facesFor(d: number): [number, number | null] {
  if (d <= 1) return [1, null];
  if (d >= 12) return [6, 6];
  const lo = Math.max(1, d - 6);
  const hi = Math.min(6, d - 1);
  const a = lo + Math.floor(Math.random() * (hi - lo + 1));
  return [a, d - a];
}

export function GameBoardBody(props: BodyProps) {
  const body = useBody(props);
  const { data, colors, fonts, reduce } = body;
  const { opened, open } = useOpened("board", body.site.id, body.sample);
  const notes = data.notes;
  const total = notes.length + 2; // Start, the notes, Finish
  const finish = total - 1;

  // The spaces: the palette's accent, a butter yellow, a mint and the primary softened, all leaning to the palette.
  const spaces = useMemo(
    () => [
      colors.accent,
      colors.mix("#FFD34E", colors.accent, 0.08),
      colors.mix("#3BB98A", colors.primary, 0.14),
      colors.mix(colors.primary, "#FFFFFF", colors.dark ? 0.5 : 0.38),
    ],
    [colors],
  );
  const butter = colors.mix("#FFD34E", colors.accent, 0.08);
  const panel = colors.primary;
  const panelLight = !isDark(panel);

  const boardRef = useRef<HTMLDivElement | null>(null);
  const squareRefs = useRef<(HTMLElement | null)[]>([]);
  const [cols, setCols] = useState(4);
  // Locked days depend on the viewer's own date, so they're worked out after the first paint (the server can't know it).
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  useEffect(() => {
    const el = boardRef.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(([e]) => {
      const w = e?.contentRect.width ?? 0;
      setCols(w < 470 ? 4 : w < 760 ? 6 : 8);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const rows = Math.ceil(total / cols);
  const H = (rows - 1) * ROW + 1;

  const [at, setAt] = useState(0);
  const [glide, setGlide] = useState(false);
  const [phase, setPhase] = useState<Phase>("idle");
  const [faces, setFaces] = useState<[number, number | null]>([3, 4]);
  const [spin, setSpin] = useState(0);
  const [landed, setLanded] = useState<number | null>(null);
  const timers = useRef<number[]>([]);
  useEffect(() => () => timers.current.forEach((x) => window.clearTimeout(x)), []);
  const later = (fn: () => void, ms: number) => {
    timers.current.push(window.setTimeout(fn, ms));
  };

  const count = notes.filter((p) => opened.has(p.id)).length;
  const rollable = useCallback((p: Piece) => !p.sealed && !isLocked(p) && !opened.has(p.id), [opened]);
  /** The next note to land on after square `from` (wrapping round), or -1 when every one is read. */
  const nextTarget = useCallback(
    (from: number) => {
      for (let i = from + 1; i <= notes.length; i++) if (rollable(notes[i - 1]!)) return i;
      for (let i = 1; i <= Math.min(from, notes.length); i++) if (rollable(notes[i - 1]!)) return i;
      return -1;
    },
    [notes, rollable],
  );
  const done = notes.length > 0 && nextTarget(at) === -1;

  function centerOf(i: number) {
    const r = squareRefs.current[i]?.getBoundingClientRect();
    return r ? { x: r.left + r.width / 2, y: r.top + r.height / 2 } : null;
  }

  function scrollTo(i: number) {
    squareRefs.current[i]?.scrollIntoView({ block: "center", behavior: reduce ? "auto" : "smooth" });
  }

  /** The token is on square i: open its note card. */
  function land(i: number) {
    setPhase("idle");
    setGlide(false);
    setLanded(i);
    later(() => setLanded(null), 700);
    if (i === finish) {
      const c = centerOf(i);
      chime("tada");
      buzz([10, 40, 10]);
      if (c) burst(body.hostRef.current, c.x, c.y, { shape: "confetti", colors: [...spaces, colors.primary], count: 34, spread: 1.6, up: true });
      return;
    }
    const p = notes[i - 1];
    if (!p) return;
    open(p.id);
    foley("thunk");
    buzz(8);
    const c = centerOf(i);
    if (c && !p.sealed && !isLocked(p)) burst(body.hostRef.current, c.x, c.y, { shape: "confetti", colors: [spaces[(i - 1) % 4]!, butter, colors.primary], count: 14, spread: 0.9, up: true });
    later(() => body.read(p), reduce ? 0 : 380);
  }

  /** Hop from square `from` to `to`, one square at a time. */
  function hop(from: number, to: number) {
    const steps = to - from;
    if (reduce || steps <= 0) {
      setAt(to);
      land(to);
      return;
    }
    setPhase("moving");
    const step = steps > 12 ? 80 : 190;
    for (let k = 1; k <= steps; k++)
      later(() => {
        setAt(from + k);
        if (k < steps) {
          chime("boop");
          buzz(3);
        }
      }, k * step);
    later(() => land(to), steps * step + 230);
  }

  function roll() {
    if (phase !== "idle") return;
    if (!notes.length) return;
    const target = nextTarget(at);
    // Every note read: walk to Finish, or back to Start for another go.
    const to = target === -1 ? (at === finish ? 0 : finish) : target;
    if (to === 0) {
      setGlide(true);
      setAt(0);
      scrollTo(0);
      later(() => setGlide(false), 650);
      chime("whoosh");
      return;
    }
    const behind = to <= at;
    const from = behind ? 0 : at;
    const d = to - from;
    setFaces(facesFor(d));
    setSpin((s) => s + 1);
    setPhase("rolling");
    foley("thunk");
    buzz([6, 30, 6]);
    later(() => foley("thunk"), reduce ? 0 : 420);
    scrollTo(to);
    if (behind) {
      setGlide(true);
      setAt(0);
    }
    later(() => {
      setGlide(false);
      chime("pop");
      hop(from, to);
    }, reduce ? 0 : 1000);
  }

  /** Tapping a square: the token jumps straight there. */
  function jump(i: number) {
    if (phase !== "idle") return;
    if (i === at || reduce) {
      setAt(i);
      land(i);
      return;
    }
    setPhase("moving");
    setGlide(true);
    setAt(i);
    chime("whoosh");
    later(() => land(i), 620);
  }

  const pos = place(at, cols);
  const status = notes.length === 0 ? "" : count === notes.length ? t("board.allRead") : t("board.progress", { n: count, total: notes.length });

  return (
    <BodyRoot
      body={body}
      className="gb-root"
      style={
        {
          "--gb-panel": panel,
          "--gb-panel-ink": colors.onPrimary,
          "--gb-name": panelLight ? colors.onPrimary : butter,
          "--gb-board": colors.mix(colors.dark ? "#F6EBD3" : "#FFF9EC", colors.bg, colors.dark ? 0.04 : 0.25),
          "--gb-board-deep": colors.mix("#E7D6B4", colors.primary, 0.08),
          "--gb-edge": colors.mix(colors.primary, "#000000", 0.25),
          "--gb-edge-deep": colors.mix(colors.primary, "#000000", 0.5),
          "--gb-road": colors.mix("#EADCC0", colors.primary, 0.1),
          "--gb-butter": butter,
          "--gb-s0": spaces[0],
          "--gb-s1": spaces[1],
          "--gb-s2": spaces[2],
          "--gb-s3": spaces[3],
          "--gb-pawn": colors.mix(colors.accent, "#000000", 0.05),
          "--gb-pawn-deep": colors.mix(colors.accent, "#000000", 0.45),
        } as React.CSSProperties
      }
    >
      <div className="gb-table" aria-hidden="true" />
      <div className="relative mx-auto max-w-[1040px] px-4 pt-[clamp(28px,6vh,64px)] pb-24">
        {/* The box lid: the opening's board, its ring of squares and the navy middle. */}
        <header className="gb-lid">
          <div className="gb-lid-panel">
            <p className="gb-lid-kicker">{data.named ? t("board.kicker") : ""}</p>
            <h1 className="gb-lid-name" style={{ fontFamily: fonts.heading }}>
              {data.named ? <SampleText on={data.nameIsSample}>{data.name}</SampleText> : body.heading}
            </h1>
            {data.named ? <p className="gb-lid-heading">{body.heading}</p> : null}
          </div>
        </header>

        {/* The rules leaflet, lying on the table */}
        <section className="gb-rules">
          <p className="gb-rules-title" style={{ fontFamily: fonts.heading }}>
            {t("board.rulesTitle")}
          </p>
          <p className="gb-rules-intro">{body.intro || body.voice.intro(data.named ? data.name : "")}</p>
          {notes.length ? <p className="gb-rules-how">{t("board.rules")}</p> : null}
          <div className="gb-rules-meta">
            <span className="gb-chip">{notes.length ? t("board.count", { n: notes.length }) : body.voice.empty(t("board.what"))}</span>
            <CountdownLine date={data.countdownDate} className="gb-chip is-timer" />
          </div>
        </section>

        {/* The board */}
        <section className="gb-board-wrap" aria-label={t("board.count", { n: notes.length })}>
          <div className="gb-board">
            <div className="gb-board-face">
              <div ref={boardRef} className="gb-track" style={{ aspectRatio: `${cols} / ${H}` }}>
                <Road total={total} cols={cols} H={H} />
                {Array.from({ length: Math.max(0, rows - 1) }, (_, r) =>
                  [0, 1].map((k) => {
                    // Two prints in each gap, never on the bend.
                    const free = cols - 1;
                    const slot = Math.floor(((r * 7 + k * 3 + 1) * 0.618 % 1) * free);
                    const c = (r % 2 ? slot + 1 : slot) + 0.5;
                    if (k === 1 && Math.abs(Math.floor(((r * 7 + 1) * 0.618 % 1) * free) - slot) < 1) return null;
                    return (
                      <span
                        key={`${r}-${k}`}
                        className="gb-print"
                        aria-hidden="true"
                        style={{ left: `${(c / cols) * 100}%`, top: `${((r * ROW + 1 + (ROW - 1) / 2) / H) * 100}%`, color: `var(--gb-s${(r + k) % 4})`, rotate: `${(r * 23 + k * 41) % 40 - 20}deg` }}
                      >
                        {PRINTS[(r * 2 + k) % PRINTS.length]}
                      </span>
                    );
                  }),
                )}
                {Array.from({ length: total }, (_, i) => {
                  const { r, c } = place(i, cols);
                  const style = {
                    left: `${(c / cols) * 100}%`,
                    top: `${((r * ROW) / H) * 100}%`,
                    width: `${100 / cols}%`,
                    height: `${(1 / H) * 100}%`,
                  } as React.CSSProperties;
                  if (i === 0)
                    return (
                      <div key="start" ref={(el) => void (squareRefs.current[0] = el)} className="gb-sq is-start" style={style}>
                        <span className="gb-tile">
                          <span className="gb-start-arrow" aria-hidden="true">
                            {r % 2 ? "←" : "→"}
                          </span>
                          <span className="gb-start-word" style={{ fontFamily: fonts.heading }}>
                            {t("board.start")}
                          </span>
                        </span>
                      </div>
                    );
                  if (i === finish)
                    return (
                      <div key="finish" ref={(el) => void (squareRefs.current[i] = el)} className={`gb-sq is-finish ${done ? "is-done" : ""} ${landed === i ? "is-landed" : ""}`} style={style}>
                        <span className="gb-tile">
                          <Star className="gb-finish-star" aria-hidden="true" />
                          <span className="gb-finish-word" style={{ fontFamily: fonts.heading }}>
                            {t("board.finish")}
                          </span>
                        </span>
                      </div>
                    );
                  const p = notes[i - 1]!;
                  return (
                    <Square
                      key={p.id}
                      ref={(el) => void (squareRefs.current[i] = el)}
                      piece={p}
                      n={i}
                      style={style}
                      tone={(i - 1) % 4}
                      tint={spaces[(i - 1) % 4]!}
                      open={opened.has(p.id)}
                      landed={landed === i}
                      onClick={() => jump(i)}
                      headingFont={fonts.heading}
                      mounted={mounted}
                    />
                  );
                })}
                {/* The token */}
                <span
                  className={`gb-token ${glide ? "is-glide" : ""}`}
                  style={{ left: `${((pos.c + 0.5) / cols) * 100}%`, top: `${((pos.r * ROW + 0.5) / H) * 100}%`, width: `${100 / cols}%` }}
                  aria-hidden="true"
                >
                  <span key={glide ? `g${at}` : at} className={`gb-pawn ${at > 0 || glide ? "is-hop" : ""}`}>
                    <span className="gb-pawn-shadow" />
                    <span className="gb-pawn-base" />
                    <span className="gb-pawn-body" />
                    <span className="gb-pawn-head" />
                  </span>
                </span>
              </div>
            </div>
          </div>

          {notes.length ? (
            <div className="gb-tray">
              <button type="button" className="gb-dice" onClick={roll} tabIndex={-1} aria-hidden="true" disabled={phase !== "idle"}>
                <Die value={faces[0]} spin={spin} dir={1} rolling={phase === "rolling"} />
                <Die value={faces[1] ?? 1} spin={spin} dir={-1} rolling={phase === "rolling"} out={faces[1] === null} />
              </button>
              <div className="gb-tray-text">
                <button type="button" className="gb-roll" onClick={roll} disabled={phase !== "idle"} aria-label={done && at === finish ? t("board.again") : t("board.rollAria")}>
                  {done && at === finish ? t("board.again") : t("board.roll")}
                </button>
                <p className="gb-tray-status" role="status" aria-live="polite">
                  {status}
                </p>
              </div>
            </div>
          ) : null}
        </section>

        {data.words.length ? (
          <section className="gb-words" aria-label={t("board.wordsTitle")}>
            <p className="gb-words-title" style={{ fontFamily: fonts.heading }}>
              {t("board.wordsTitle")}
            </p>
            <p className="gb-words-sub">{t("board.wordsSub")}</p>
            <ul className="gb-words-list">
              {data.words.map((w) => (
                <li key={w.id} className="gb-word" style={{ rotate: `${((seed(w.id) - 0.5) * 5).toFixed(2)}deg` }} aria-label={w.text ?? ""}>
                  {[...(w.text ?? "").trim()].slice(0, 14).map((ch, k) => (
                    <span key={k} className={`gb-letter ${ch === " " ? "is-space" : ""}`} aria-hidden="true">
                      {ch.toUpperCase()}
                      {ch !== " " ? <sub>{POINTS[ch.toLowerCase()] ?? 1}</sub> : null}
                    </span>
                  ))}
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        <BodyFooter body={body} className="gb-footer" buttonStyle={{ background: colors.primary, color: colors.onPrimary }} />
      </div>

      {body.reading ? <NoteCard body={body} piece={body.reading} spaces={spaces} index={notes.indexOf(body.reading)} /> : null}
    </BodyRoot>
  );
}

/** The road the squares sit on: one thick winding line through every square's middle. */
function Road({ total, cols, H }: { total: number; cols: number; H: number }) {
  const d = Array.from({ length: total }, (_, i) => {
    const { r, c } = place(i, cols);
    return `${i ? "L" : "M"}${(c + 0.5).toFixed(2)} ${(r * ROW + 0.5).toFixed(3)}`;
  }).join(" ");
  return (
    <svg className="gb-road" viewBox={`0 0 ${cols} ${H}`} preserveAspectRatio="none" aria-hidden="true">
      <path d={d} className="gb-road-edge" />
      <path d={d} className="gb-road-top" />
      <path d={d} className="gb-road-dash" />
    </svg>
  );
}

function Square({
  piece,
  n,
  style,
  tone,
  tint,
  open,
  landed,
  onClick,
  headingFont,
  mounted,
  ref,
}: {
  piece: Piece;
  n: number;
  style: React.CSSProperties;
  tone: number;
  tint: string;
  open: boolean;
  landed: boolean;
  onClick: () => void;
  headingFont: string;
  mounted: boolean;
  ref: (el: HTMLButtonElement | null) => void;
}) {
  const locked = mounted && isLocked(piece);
  const Icon = piece.sealed || locked ? Lock : piece.kind === "song" ? Music2 : piece.kind === "voice" ? Mic : null;
  const photo = piece.kind === "photo" && !piece.sealed && !locked;
  return (
    <button
      ref={ref}
      type="button"
      className={`gb-sq is-note ${open ? "is-open" : ""} ${landed ? "is-landed" : ""} ${photo ? "is-photo" : ""} ${locked ? "is-locked" : ""}`}
      style={{ ...style, "--sq": `var(--gb-s${tone})`, "--sq-ink": readableInk(tint), "--tilt": `${((seed(piece.id) - 0.5) * 4).toFixed(2)}deg` } as React.CSSProperties}
      onClick={onClick}
      aria-label={pieceLabel(piece)}
    >
      <span className="gb-tile">
        <span className="gb-num">{n}</span>
        {photo ? (
          <span className="gb-photo">
            <PhotoFace piece={piece} tint={tint} sizes="120px" />
          </span>
        ) : null}
        {locked ? (
          <span className="gb-lockday">{formatDay(piece.date!, { day: "numeric", month: "short" })}</span>
        ) : (
          <span className={`gb-init ${photo ? "is-chip" : ""}`} style={{ fontFamily: headingFont }}>
            {initial(piece.author || "♡")}
          </span>
        )}
        {Icon ? (
          <span className="gb-kind" aria-hidden="true">
            <Icon className="size-full" />
          </span>
        ) : null}
        {open ? (
          <span className="gb-peg" aria-hidden="true">
            <Check className="size-full" strokeWidth={3.2} />
          </span>
        ) : null}
      </span>
    </button>
  );
}

/** A CSS die: six faces, turned so `value` faces up, spinning a few extra turns per roll. */
function Die({ value, spin, dir, rolling, out = false }: { value: number; spin: number; dir: 1 | -1; rolling: boolean; out?: boolean }) {
  const [x, y] = FACE_TURN[value] ?? [0, 0];
  const turns = spin * 720 * dir;
  const face = (n: number, tf: string) => (
    <span className="gb-die-face" style={{ transform: `${tf} translateZ(calc(var(--die) / 2))` }}>
      {Array.from({ length: 9 }, (_, k) => (
        <span key={k} className={(PIPS[n] ?? []).includes(k) ? "is-pip" : ""} />
      ))}
    </span>
  );
  return (
    <span className={`gb-die ${dir < 0 ? "is-b" : ""} ${rolling ? "is-rolling" : ""} ${out ? "is-out" : ""}`}>
      <span className="gb-die-shadow" />
      <span className="gb-die-cube" style={{ transform: `rotateX(${x + turns}deg) rotateY(${y + turns * 0.75}deg)` }}>
        {face(1, "rotateY(0deg)")}
        {face(6, "rotateY(180deg)")}
        {face(2, "rotateY(90deg)")}
        {face(5, "rotateY(-90deg)")}
        {face(3, "rotateX(90deg)")}
        {face(4, "rotateX(-90deg)")}
      </span>
    </span>
  );
}

/** The note card: like the cards you draw in a board game, in the square's colour. */
function NoteCard({ body, piece, spaces, index }: { body: ReturnType<typeof useBody>; piece: Piece; spaces: string[]; index: number }) {
  const { colors, fonts } = body;
  const tint = spaces[Math.max(0, index) % 4]!;
  return (
    <Reader
      piece={piece}
      onClose={body.closeReader}
      accent={colors.mix(tint, "#000000", isDark(tint) ? 0 : 0.35)}
      className="gb-card"
      style={{ "--card": tint, "--card-ink": readableInk(tint) } as React.CSSProperties}
    >
      <div className="gb-card-head">
        <span className="gb-card-chip" style={{ fontFamily: fonts.heading }}>
          {initial(piece.author || "♡")}
        </span>
        <span className="min-w-0">
          <span className="gb-card-from" style={{ fontFamily: fonts.heading }}>
            {piece.author ? t("board.from", { name: piece.author }) : t("board.fromFriend")}
          </span>
          <span className="gb-card-meta">
            {index >= 0 ? `${t("board.square", { n: index + 1 })} · ` : ""}
            {pieceWhat(piece)}
          </span>
        </span>
      </div>
    </Reader>
  );
}
