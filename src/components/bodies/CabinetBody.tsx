/**
 * Arcade's body: an arcade cabinet with a CRT screen.
 *
 * The opening's little console grows up into a full cabinet. Its lit marquee
 * carries the name; the screen (scanlines, glow, a slightly curved glass) shows a
 * pixel-art level-select map. Every note is a level, eight to a world, and each
 * world has its own terrain. Move with the stick or tap a level; press A and the
 * screen flashes LEVEL CLEAR before the note opens in a pixel dialog box. A high
 * score table lists the friends, and the words are power-ups.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { t } from "@/i18n";
import { SampleText } from "@/components/SampleMark";
import { burst, buzz, chime, foley } from "@/lib/play";
import { loadPairingFonts } from "@/lib/gift";
import { isDark } from "@/lib/palettes";
import { useCountdown } from "@/lib/giftPieces";
import {
  BodyFooter,
  BodyRoot,
  Reader,
  initial,
  isLocked,
  pieceLabel,
  pieceWhat,
  useBody,
  useOpened,
  type BodyProps,
  type Piece,
} from "@/components/bodies/kit";

const PIXEL = "'Pixelify Sans', ui-monospace, 'SFMono-Regular', Menlo, monospace";
const PER_WORLD = 8;
/** Level spots on a world map (128 x 112 pixels), in play order, bottom left to the top. */
const SPOTS: [number, number][] = [
  [14, 94], [38, 94], [62, 86], [94, 90], [112, 62], [80, 56], [46, 58], [62, 26],
];
/** Free ground for scenery (centres), clear of the path. */
const SCENERY: [number, number][] = [
  [14, 14], [30, 38], [10, 70], [28, 74], [82, 74], [116, 102], [88, 104], [80, 10], [116, 38], [56, 104], [104, 10], [6, 44],
];
const HEART = [".XX.XX.", "XXXXXXX", "XXXXXXX", ".XXXXX.", "..XXX..", "...X..."];

type Rect = [number, number, number, number, string];
/** Little sprites on a 12 x 12 grid. Colour keys are filled from the world's palette. */
const SPRITES: Record<string, Rect[]> = {
  tree: [[5, 8, 2, 4, "trunk"], [3, 1, 6, 1, "leaf"], [2, 2, 8, 6, "leaf"], [3, 8, 6, 1, "leafLo"], [3, 2, 2, 2, "leafHi"]],
  bush: [[2, 6, 8, 1, "leaf"], [1, 7, 10, 4, "leaf"], [1, 10, 10, 1, "leafLo"], [3, 7, 2, 1, "leafHi"]],
  flower: [[5, 6, 1, 5, "leafLo"], [4, 3, 3, 3, "pop"], [5, 4, 1, 1, "sun"], [6, 8, 2, 1, "leafLo"]],
  cactus: [[5, 2, 2, 10, "leaf"], [2, 5, 2, 4, "leaf"], [3, 8, 2, 1, "leaf"], [8, 4, 2, 4, "leaf"], [7, 7, 1, 1, "leaf"], [5, 2, 1, 10, "leafHi"]],
  rock: [[3, 7, 6, 1, "rock"], [2, 8, 8, 4, "rock"], [3, 8, 2, 1, "rockHi"], [2, 11, 8, 1, "leafLo"]],
  pine: [[5, 10, 2, 2, "trunk"], [4, 1, 4, 3, "leaf"], [3, 4, 6, 3, "leaf"], [2, 7, 8, 3, "leaf"], [4, 1, 4, 1, "snow"], [3, 4, 3, 1, "snow"], [2, 7, 3, 1, "snow"]],
  snowman: [[4, 6, 5, 5, "snow"], [5, 2, 3, 4, "snow"], [6, 3, 1, 1, "trunk"], [7, 4, 2, 1, "pop"], [4, 11, 5, 1, "leafLo"]],
  lolly: [[6, 6, 1, 6, "snow"], [3, 1, 7, 6, "pop"], [5, 3, 3, 2, "snow"], [4, 2, 1, 1, "snow"]],
  cupcake: [[3, 7, 6, 4, "trunk"], [2, 4, 8, 3, "snow"], [5, 2, 2, 2, "pop"], [4, 8, 1, 3, "leafLo"], [7, 8, 1, 3, "leafLo"]],
  star: [[5, 3, 1, 5, "sun"], [3, 5, 5, 1, "sun"], [5, 5, 1, 1, "snow"]],
  planet: [[4, 3, 5, 6, "pop"], [3, 4, 7, 4, "pop"], [1, 6, 11, 1, "sun"], [4, 4, 2, 1, "snow"]],
  moon: [[4, 2, 4, 1, "sun"], [3, 3, 3, 6, "sun"], [4, 9, 4, 1, "sun"], [6, 3, 1, 1, "sun"]],
};
/** One look per world, picked in turn. Ground colours lean towards the gift's palette. */
const WORLDS = [
  { ground: "#58B85A", dots: "#4AA34E", path: "#F6E7B0", water: "#4FA3E0", sprites: ["tree", "bush", "flower"], trunk: "#7A4A2A", leaf: "#2F8A3E", leafHi: "#7DD46F", leafLo: "#246B30", rock: "#9AA0A8", rockHi: "#C8CDD3" },
  { ground: "#E9C46A", dots: "#D9AE52", path: "#FFF4D6", water: "#4FB7C9", sprites: ["cactus", "rock", "cactus"], trunk: "#8A5A2E", leaf: "#3E9B57", leafHi: "#7BD18C", leafLo: "#B98E3E", rock: "#B07A4E", rockHi: "#D9A272" },
  { ground: "#DCEBF7", dots: "#C6DCEE", path: "#FFFFFF", water: "#7FB4E6", sprites: ["pine", "snowman", "pine"], trunk: "#6B4A33", leaf: "#2E7D5B", leafHi: "#59A883", leafLo: "#A9C4DA", rock: "#8E9DB0", rockHi: "#C9D6E4" },
  { ground: "#F7B6D2", dots: "#EE9EC1", path: "#FFF1F7", water: "#B9A3FF", sprites: ["lolly", "cupcake", "lolly"], trunk: "#C9845A", leaf: "#E06AA0", leafHi: "#FFC6E0", leafLo: "#D88AB0", rock: "#FFFFFF", rockHi: "#FFFFFF" },
  { ground: "#2B2560", dots: "#352E74", path: "#9C94E8", water: "#14113A", sprites: ["star", "planet", "moon"], trunk: "#5B4AA8", leaf: "#7A5CFF", leafHi: "#B8A6FF", leafLo: "#1E1A48", rock: "#4A4290", rockHi: "#6A60C0" },
];
const KIND_TINT: Record<string, string> = { letter: "#FFFFFF", photo: "#7FD3FF", song: "#FF9AD0", voice: "#C8B4FF", ornament: "#FFE45C", calendar: "#9CF5C9" };

export function CabinetBody(props: BodyProps) {
  const body = useBody(props);
  const { data, colors, reduce } = body;
  const { opened, open } = useOpened("arcade", body.site.id, body.sample);
  const notes = data.notes;
  const worlds = Math.max(1, Math.ceil(notes.length / PER_WORLD));
  const [sel, setSel] = useState(0);
  const [banner, setBanner] = useState<"clear" | "locked" | null>(null);
  const [stick, setStick] = useState<"l" | "r" | "u" | "d" | null>(null);
  const [pressed, setPressed] = useState<"a" | "b" | null>(null);
  const [mounted, setMounted] = useState(false);
  // The map wipes in only when switching worlds, never on first paint (the page remounts after the opening).
  const [switched, setSwitched] = useState(false);
  const nodeRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const timers = useRef<number[]>([]);
  const busy = useRef(false);
  useEffect(() => {
    setMounted(true);
    loadPairingFonts("pixel");
    return () => timers.current.forEach((x) => window.clearTimeout(x));
  }, []);
  const later = (fn: () => void, ms: number) => void timers.current.push(window.setTimeout(fn, ms));

  const world = Math.floor(sel / PER_WORLD);
  const cleared = notes.filter((p) => opened.has(p.id)).length;
  const glow = isDark(colors.primary) ? colors.mix(colors.primary, "#FFFFFF", 0.5) : colors.primary;
  const pop = isDark(colors.accent) ? colors.mix(colors.accent, "#FFFFFF", 0.4) : colors.accent;

  const scores = useMemo(() => {
    const m = new Map<string, number>();
    for (const p of notes) if (p.author) m.set(p.author, (m.get(p.author) ?? 0) + 1);
    return [...m.entries()].sort((a, b) => b[1] - a[1]);
  }, [notes]);

  function move(to: number, focus = false) {
    if (!notes.length) return;
    const next = Math.max(0, Math.min(notes.length - 1, to));
    if (next === sel) return;
    if (Math.floor(next / PER_WORLD) !== Math.floor(sel / PER_WORLD)) setSwitched(true);
    setSel(next);
    chime("boop");
    buzz(3);
    if (focus) later(() => nodeRefs.current[next]?.focus({ preventScroll: true }), 30);
  }

  function nudge(dir: "l" | "r" | "u" | "d") {
    setStick(dir);
    later(() => setStick(null), 180);
    if (dir === "l") move(sel - 1);
    if (dir === "r") move(sel + 1);
    if (dir === "u") move(Math.min(notes.length - 1, (world + 1) * PER_WORLD));
    if (dir === "d") move(Math.max(0, (world - 1) * PER_WORLD));
  }

  function press(which: "a" | "b") {
    setPressed(which);
    later(() => setPressed(null), 150);
  }

  /** Play a level: LEVEL CLEAR on the screen, then the note in a dialog box. */
  function play(i: number, e?: { clientX: number; clientY: number }) {
    const p = notes[i];
    if (!p || busy.current) return;
    busy.current = true;
    setSel(i);
    const blocked = p.sealed || (mounted && isLocked(p));
    setBanner(blocked ? "locked" : "clear");
    if (!blocked && !opened.has(p.id)) {
      open(p.id);
      chime("tada");
      buzz([8, 40, 8]);
      const r = nodeRefs.current[i]?.getBoundingClientRect();
      const x = e?.clientX || (r ? r.left + r.width / 2 : 0);
      const y = e?.clientY || (r ? r.top + r.height / 2 : 0);
      if (x && !reduce) burst(body.hostRef.current, x, y, { shape: "stars", colors: [glow, pop, "#FFE45C"], count: 16, spread: 1.1, up: true });
    } else {
      chime(blocked ? "boop" : "pop");
      foley("thunk");
    }
    later(
      () => {
        setBanner(null);
        busy.current = false;
        body.read(p);
      },
      reduce ? 0 : blocked ? 650 : 1000,
    );
  }

  function nextNew() {
    press("b");
    for (let k = 1; k <= notes.length; k++) {
      const i = (sel + k) % notes.length;
      const p = notes[i]!;
      if (!opened.has(p.id) && !p.sealed && !(mounted && isLocked(p))) return move(i, true);
    }
    chime("boop");
  }

  function onKey(e: React.KeyboardEvent) {
    const map: Record<string, "l" | "r" | "u" | "d"> = { ArrowLeft: "l", ArrowRight: "r", ArrowUp: "u", ArrowDown: "d" };
    const dir = map[e.key];
    if (!dir) return;
    e.preventDefault();
    setStick(dir);
    later(() => setStick(null), 180);
    const to = dir === "l" ? sel - 1 : dir === "r" ? sel + 1 : dir === "u" ? (world + 1) * PER_WORLD : (world - 1) * PER_WORLD;
    move(Math.max(0, Math.min(notes.length - 1, to)), true);
  }

  const current = notes[sel];
  const W = WORLDS[world % WORLDS.length]!;
  const inWorld = notes.slice(world * PER_WORLD, world * PER_WORLD + PER_WORLD);
  const flip = world % 2 === 1;
  const spot = (k: number): [number, number] => {
    const [x, y] = SPOTS[k]!;
    return [flip ? 128 - x : x, y];
  };
  const levelTag = (i: number) => t("arcade.level", { w: Math.floor(i / PER_WORLD) + 1, n: (i % PER_WORLD) + 1 });
  const cur = current ? spot(sel % PER_WORLD) : null;

  return (
    <BodyRoot
      body={body}
      className="ac-root"
      style={
        {
          "--ac-pixel": PIXEL,
          "--ac-glow": glow,
          "--ac-pop": pop,
          "--ac-cab": colors.mix(colors.accent, "#2E2275", 0.62),
          "--ac-cab-hi": colors.mix(colors.mix(colors.accent, "#2E2275", 0.62), "#FFFFFF", 0.18),
          "--ac-cab-deep": colors.mix(colors.mix(colors.accent, "#2E2275", 0.62), "#000000", 0.45),
          "--ac-screen": colors.mix("#0B0A22", colors.bg, colors.dark ? 0.12 : 0.04),
          "--ac-room-glow": colors.dark ? `${glow}33` : `${colors.accent}2e`,
        } as React.CSSProperties
      }
    >
      <div className="ac-room" aria-hidden="true">
        <div className="ac-floor" />
      </div>
      <div className="relative mx-auto max-w-[1120px] px-4 pt-[clamp(24px,5vh,56px)] pb-20">
        <div className="ac-layout">
          <div className="ac-cabinet">
            {/* The lit marquee */}
            <header className="ac-marquee">
              <span className="ac-bulbs" aria-hidden="true" />
              <p className="ac-marquee-kicker">{t("arcade.player")}</p>
              <h1 className="ac-marquee-name" style={{ fontFamily: PIXEL }}>
                {data.named ? <SampleText on={data.nameIsSample}>{data.name}</SampleText> : body.heading}
              </h1>
              {data.named ? <p className="ac-marquee-heading">{body.heading}</p> : null}
            </header>

            {/* The screen */}
            <div className="ac-hood">
              <div className="ac-bezel">
                <div className="ac-screen" onKeyDown={onKey}>
                  <div className="ac-hud">
                    {worlds > 1 ? (
                      <div className="ac-worlds" role="group" aria-label={t("arcade.world", { n: world + 1 })}>
                        {Array.from({ length: worlds }, (_, w) => {
                          const all = notes.slice(w * PER_WORLD, (w + 1) * PER_WORLD).every((p) => opened.has(p.id));
                          return (
                            <button
                              key={w}
                              type="button"
                              className={`ac-world ${w === world ? "is-on" : ""} ${all ? "is-done" : ""}`}
                              onClick={() => move(w * PER_WORLD)}
                              aria-label={t("arcade.worldAria", { n: w + 1 })}
                              aria-pressed={w === world}
                            >
                              {w + 1}
                            </button>
                          );
                        })}
                      </div>
                    ) : (
                      <span className="ac-hud-label">{t("arcade.world", { n: 1 })}</span>
                    )}
                    <span className="ac-score" aria-label={t("arcade.progress", { n: cleared, total: notes.length })}>
                      {String(cleared * 1000).padStart(6, "0")}
                    </span>
                  </div>

                  <div key={world} className={`ac-map ${switched ? "is-in" : ""}`}>
                    <WorldMap look={W} flip={flip} count={inWorld.length} lastWorld={world === worlds - 1} seedN={world} />
                    {inWorld.map((p, k) => {
                      const i = world * PER_WORLD + k;
                      const [x, y] = spot(k);
                      const done = opened.has(p.id);
                      const locked = p.sealed || (mounted && isLocked(p));
                      return (
                        <button
                          key={p.id}
                          ref={(el) => void (nodeRefs.current[i] = el)}
                          type="button"
                          className={`ac-node ${done ? "is-done" : ""} ${locked ? "is-locked" : ""} ${i === sel ? "is-sel" : ""}`}
                          style={{ left: `${(x / 128) * 100}%`, top: `${(y / 112) * 100}%`, "--tint": KIND_TINT[p.kind] ?? "#fff" } as React.CSSProperties}
                          onClick={(e) => play(i, e)}
                          onFocus={() => setSel(i)}
                          aria-label={`${levelTag(i)}. ${pieceLabel(p)}`}
                        >
                          <span className="ac-node-face" style={{ fontFamily: PIXEL }}>
                            {done ? "★" : locked ? <PixelLock /> : initial(p.author || "♥")}
                          </span>
                        </button>
                      );
                    })}
                    {cur ? (
                      <span className="ac-cursor" style={{ left: `${(cur[0] / 128) * 100}%`, top: `${(cur[1] / 112) * 100}%` }} aria-hidden="true">
                        <PixelHeart />
                      </span>
                    ) : null}
                    {!notes.length ? (
                      <div className="ac-empty">
                        <p style={{ fontFamily: PIXEL }}>{t("arcade.empty")}</p>
                        <p className="ac-empty-sub">{body.voice.empty(t("arcade.what"))}</p>
                      </div>
                    ) : null}
                  </div>

                  <div className="ac-info" style={{ fontFamily: PIXEL }} aria-live="polite">
                    {current ? (
                      <>
                        <span className="ac-info-level">{levelTag(sel)}</span>
                        <span className="ac-info-name">{(current.author || t("arcade.friend")).toUpperCase()}</span>
                        <span className={`ac-info-cta ${opened.has(current.id) ? "is-done" : ""}`}>{opened.has(current.id) ? `★ ${t("arcade.cleared")}` : t("arcade.press")}</span>
                      </>
                    ) : (
                      <span className="ac-info-level">{t("arcade.insert")}</span>
                    )}
                  </div>

                  {banner ? (
                    <div className={`ac-banner ${banner === "locked" ? "is-locked" : ""}`} aria-hidden="true">
                      <span style={{ fontFamily: PIXEL }}>{banner === "clear" ? t("arcade.clear") : t("arcade.notYet")}</span>
                    </div>
                  ) : null}
                  <span className="ac-scan" aria-hidden="true" />
                  <span className="ac-glass" aria-hidden="true" />
                </div>
              </div>
            </div>

            {/* The control panel */}
            <div className="ac-panel">
              <div className={`ac-stick is-${stick ?? "rest"}`}>
                <span className="ac-stick-base" aria-hidden="true" />
                <span className="ac-stick-shaft" aria-hidden="true">
                  <span className="ac-stick-ball" />
                </span>
                <button type="button" className="ac-dir is-l" onClick={() => nudge("l")} disabled={!notes.length} aria-label={t("arcade.prev")} />
                <button type="button" className="ac-dir is-r" onClick={() => nudge("r")} disabled={!notes.length} aria-label={t("arcade.next")} />
                <button type="button" className="ac-dir is-u" onClick={() => nudge("u")} disabled={worlds < 2} aria-label={t("arcade.worldUp")} />
                <button type="button" className="ac-dir is-d" onClick={() => nudge("d")} disabled={worlds < 2} aria-label={t("arcade.worldDown")} />
              </div>
              <div className="ac-buttons">
                <span className="ac-btn-wrap">
                  <button type="button" className={`ac-btn is-b ${pressed === "b" ? "is-down" : ""}`} onClick={nextNew} disabled={!notes.length} aria-label={t("arcade.start")}>
                    B
                  </button>
                  <span className="ac-btn-label">{t("arcade.newLevel")}</span>
                </span>
                <span className="ac-btn-wrap">
                  <button
                    type="button"
                    className={`ac-btn is-a ${pressed === "a" ? "is-down" : ""}`}
                    onClick={(e) => {
                      press("a");
                      play(sel, e);
                    }}
                    disabled={!notes.length}
                    aria-label={current ? `${t("arcade.play")}: ${pieceLabel(current)}` : t("arcade.play")}
                  >
                    A
                  </button>
                  <span className="ac-btn-label">{t("arcade.playLabel")}</span>
                </span>
              </div>
            </div>

            {/* The lower cabinet: instructions card and coin door */}
            <div className="ac-lower">
              <section className="ac-card">
                <p className="ac-card-title" style={{ fontFamily: PIXEL }}>
                  {t("arcade.howTo")}
                </p>
                <p className="ac-card-intro">{body.intro || body.voice.intro(data.named ? data.name : "")}</p>
                {notes.length ? <p className="ac-card-rules">{t("arcade.rules")}</p> : null}
                <p className="ac-card-count" style={{ fontFamily: PIXEL }}>
                  {notes.length ? t("arcade.count", { n: notes.length }) : body.voice.empty(t("arcade.what"))}
                </p>
              </section>
              <div className="ac-door">
                <Timer date={data.countdownDate} />
                <div className="ac-slots" aria-hidden="true">
                  {[0, 1].map((k) => (
                    <span key={k} className="ac-slot">
                      <span className="ac-slot-mouth" />
                      <span className="ac-slot-label" style={{ fontFamily: PIXEL }}>
                        {t("arcade.insert")}
                      </span>
                    </span>
                  ))}
                </div>
              </div>
            </div>
            <span className="ac-feet" aria-hidden="true" />
          </div>

          {/* High scores and power-ups */}
          <aside className="ac-side">
            {scores.length ? (
              <section className="ac-scores" aria-label={t("arcade.scores")}>
                <p className="ac-side-title" style={{ fontFamily: PIXEL }}>
                  {t("arcade.scores")}
                </p>
                <ol className="ac-table" style={{ fontFamily: PIXEL }}>
                  {scores.slice(0, 10).map(([name, n], k) => (
                    <li key={name} className={`ac-row ${k === 0 ? "is-top" : ""}`} style={{ "--row": ["#FFE45C", "#3DF2B0", "#FF5DA2", "#7FD3FF", "#C8B4FF"][k % 5] } as React.CSSProperties}>
                      <span className="ac-rank">{String(k + 1).padStart(2, "0")}</span>
                      <span className="ac-name">{name.toUpperCase()}</span>
                      <span className="ac-dots" aria-hidden="true" />
                      <span className="ac-pts" aria-label={n === 1 ? t("arcade.scoreOne") : t("arcade.score", { n })}>
                        {String(n * 1000).padStart(5, "0")}
                      </span>
                    </li>
                  ))}
                </ol>
                {scores.length > 10 ? <p className="ac-more">{t("arcade.more", { n: scores.length - 10 })}</p> : null}
              </section>
            ) : null}
            {data.words.length ? (
              <section className="ac-power" aria-label={t("arcade.powerups")}>
                <p className="ac-side-title" style={{ fontFamily: PIXEL }}>
                  {t("arcade.powerups")}
                </p>
                <p className="ac-side-sub">{t("arcade.powerupsSub")}</p>
                <ul className="ac-power-list">
                  {data.words.map((w, k) => (
                    <li key={w.id} className="ac-power-item" style={{ fontFamily: PIXEL, "--pw": ["#FFE45C", "#3DF2B0", "#FF5DA2", "#7FD3FF", "#C8B4FF"][k % 5] } as React.CSSProperties}>
                      <span className="ac-coin" aria-hidden="true" />
                      {w.text}
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}
          </aside>
        </div>

        <BodyFooter body={body} className="ac-footer" buttonStyle={{ background: glow, color: colors.mix(glow, "#000000", 0.82), fontFamily: PIXEL }} />
      </div>

      {body.reading ? (
        <Reader piece={body.reading} onClose={body.closeReader} accent={pop} className="ac-dialog">
          <div className="ac-tag" style={{ fontFamily: PIXEL }}>
            <span className="ac-tag-name">{(body.reading.author || t("arcade.friend")).toUpperCase()}</span>
            <span className="ac-tag-level">
              {notes.indexOf(body.reading) >= 0 ? `${levelTag(notes.indexOf(body.reading))} · ` : ""}
              {pieceWhat(body.reading)}
            </span>
          </div>
        </Reader>
      ) : null}
    </BodyRoot>
  );
}

/** The countdown as an LED readout on the coin door. */
function Timer({ date }: { date: string | null }) {
  const c = useCountdown(date);
  if (!c) return null;
  return (
    <div className="ac-timer" role="timer">
      <span className="ac-timer-label" style={{ fontFamily: PIXEL }}>
        {t("arcade.timerLabel")}
      </span>
      <span className="ac-timer-led" style={{ fontFamily: PIXEL }}>
        {c.done ? t("body.countdown.done") : t("arcade.timer", { days: c.days, hours: String(c.hours).padStart(2, "0"), mins: String(c.mins).padStart(2, "0") })}
      </span>
    </div>
  );
}

/** One world's terrain: ground, a pond, scenery sprites, the dotted path and a castle at the end. */
function WorldMap({ look, flip, count, lastWorld, seedN }: { look: (typeof WORLDS)[number]; flip: boolean; count: number; lastWorld: boolean; seedN: number }) {
  const fx = (x: number, w = 0) => (flip ? 128 - x - w : x);
  const colorOf = (k: string) => (look as Record<string, unknown>)[k] as string | undefined;
  const pts = SPOTS.slice(0, count).map(([x, y]) => [fx(x), y] as [number, number]);
  // Path dots: across, then up or down, between each pair of levels.
  const dots: [number, number][] = [];
  for (let k = 1; k < pts.length; k++) {
    const [x0, y0] = pts[k - 1]!;
    const [x1, y1] = pts[k]!;
    const sx = Math.sign(x1 - x0);
    const sy = Math.sign(y1 - y0);
    for (let x = x0; sx && (sx > 0 ? x < x1 : x > x1); x += sx * 4) dots.push([x, y0]);
    for (let y = y0; sy && (sy > 0 ? y < y1 : y > y1); y += sy * 4) dots.push([x1, y]);
  }
  const sprites = look.sprites;
  return (
    <svg className="ac-map-svg" viewBox="0 0 128 112" shapeRendering="crispEdges" aria-hidden="true">
      <rect width="128" height="112" fill={look.ground} />
      {/* dithered ground */}
      <pattern id={`ac-dith-${seedN}`} width="4" height="4" patternUnits="userSpaceOnUse">
        <rect width="1" height="1" fill={look.dots} />
        <rect x="2" y="2" width="1" height="1" fill={look.dots} />
      </pattern>
      <rect width="128" height="112" fill={`url(#ac-dith-${seedN})`} opacity=".7" />
      {/* a pond */}
      <g fill={look.water}>
        <rect x={fx(84, 30)} y="66" width="30" height="10" />
        <rect x={fx(88, 22)} y="63" width="22" height="16" />
        <rect x={fx(92, 14)} y="61" width="14" height="20" />
      </g>
      <rect x={fx(92, 6)} y="65" width="6" height="2" fill="#FFFFFF" opacity=".55" />
      {/* scenery */}
      {SCENERY.map(([cx, cy], k) => {
        const kind = sprites[(k + seedN) % sprites.length]!;
        const ox = fx(cx - 6, 12);
        const oy = cy - 6;
        return (
          <g key={k} transform={`translate(${ox} ${oy})`}>
            {SPRITES[kind]!.map(([x, y, w, h, c], j) => (
              <rect key={j} x={flip ? 12 - x - w : x} y={y} width={w} height={h} fill={colorOf(c) ?? (c === "snow" ? "#FFFFFF" : c === "sun" ? "#FFE45C" : c === "pop" ? "#FF5DA2" : "#000")} />
            ))}
          </g>
        );
      })}
      {/* path */}
      {dots.map(([x, y], k) => (
        <rect key={k} x={x - 1} y={y - 1} width="2" height="2" fill={look.path} />
      ))}
      {/* the castle at the end of the world (a flag on the last one) */}
      {count === PER_WORLD || lastWorld ? (
        <g transform={`translate(${fx(88, 24)} 8)`}>
          <rect x="2" y="8" width="20" height="14" fill="#B9B4CC" />
          <rect x="0" y="4" width="6" height="18" fill="#D6D2E6" />
          <rect x="18" y="4" width="6" height="18" fill="#D6D2E6" />
          <rect x="0" y="2" width="2" height="2" fill="#D6D2E6" />
          <rect x="4" y="2" width="2" height="2" fill="#D6D2E6" />
          <rect x="18" y="2" width="2" height="2" fill="#D6D2E6" />
          <rect x="22" y="2" width="2" height="2" fill="#D6D2E6" />
          <rect x="9" y="14" width="6" height="8" fill="#3A2D5C" />
          <rect x="11" y="-6" width="1" height="14" fill="#3A2D5C" />
          <rect x="12" y="-6" width="6" height="4" fill={lastWorld ? "#FFE45C" : "#FF5DA2"} />
          <rect x="2" y="21" width="20" height="1" fill="#000" opacity=".2" />
        </g>
      ) : null}
    </svg>
  );
}

function PixelHeart() {
  return (
    <svg viewBox="0 0 7 6" shapeRendering="crispEdges" className="block size-full">
      {HEART.flatMap((row, y) => [...row].map((ch, x) => (ch === "X" ? <rect key={`${x}-${y}`} x={x} y={y} width="1.02" height="1.02" fill="currentColor" /> : null)))}
      <rect x="1" y="1" width="1" height="1" fill="#FFFFFF" opacity=".8" />
    </svg>
  );
}

function PixelLock() {
  return (
    <svg viewBox="0 0 7 8" shapeRendering="crispEdges" className="ac-lock" aria-hidden="true">
      <rect x="2" y="0" width="3" height="1" fill="currentColor" />
      <rect x="1" y="1" width="1" height="3" fill="currentColor" />
      <rect x="5" y="1" width="1" height="3" fill="currentColor" />
      <rect x="0" y="3" width="7" height="5" fill="currentColor" />
      <rect x="3" y="5" width="1" height="2" fill="#000" opacity=".5" />
    </svg>
  );
}
