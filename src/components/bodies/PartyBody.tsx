/**
 * Cake's body: a party table seen from above.
 *
 * The birthday cake from the opening sits at the head of a long table, one lit
 * candle per note still to open (capped, so 60 notes still fit). Down the table,
 * every friend has a place setting: a plate with a treat on it and a folded place
 * card with their name. Tap the card, it unfolds and the note comes up close; the
 * treat gets a bite taken out of it and a candle goes out. Photos hang as
 * polaroids pegged to bunting above the table. When the last note is read the
 * last candle puffs out and the party goes off.
 */
// Its styles load with it, not with every page.
import "@/styles/bodies/party.css";
import { useEffect, useMemo, useRef, useState } from "react";
import { Lock, Mic, Music2 } from "lucide-react";
import { t } from "@/i18n";
import { SampleText } from "@/components/SampleMark";
import { burst, buzz, chime, foley } from "@/lib/play";
import { formatDay } from "@/lib/time";
import {
  BodyFooter,
  BodyRoot,
  CountdownLine,
  PhotoFace,
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

/** "Oct 20": short enough for a small card. */
const SHORT_DAY: Intl.DateTimeFormatOptions = { day: "numeric", month: "short" };

/** Most candles drawn on the cake; more notes than this share candles. */
const MAX_CANDLES = 14;
const CHEER = "party-cheer";

type Body = ReturnType<typeof useBody>;

export function PartyBody(props: BodyProps) {
  const body = useBody(props);
  const { data, colors, fonts, reduce } = body;
  const { opened, open } = useOpened("party", body.site.id, body.sample);
  const notes = data.notes;
  const photos = notes.filter((p) => p.kind === "photo" && !p.sealed);
  const seats = notes.filter((p) => !(p.kind === "photo" && !p.sealed));
  const total = notes.length;
  const openedCount = notes.filter((p) => opened.has(p.id)).length;
  const drawn = Math.min(total, MAX_CANDLES);
  const [cheer, setCheer] = useState(false);
  const [flipping, setFlipping] = useState<string | null>(null);
  const [puffs, setPuffs] = useState<Record<number, number>>({});
  const cakeRef = useRef<HTMLDivElement | null>(null);
  const cheering = useRef(false);
  const done = cheer || opened.has(CHEER);

  /** Candles still burning after `n` notes are open. The last one waits for the cheer. */
  const litFor = (n: number, finished: boolean) => {
    if (!total) return 0;
    const l = Math.ceil(((total - n) / total) * drawn);
    return l === 0 && !finished ? 1 : l;
  };
  const lit = litFor(openedCount, done);
  const allOpen = total > 0 && openedCount === total;

  // The last note was read: once its reader closes, bring the cake into view and blow out the last candle.
  useEffect(() => {
    if (!allOpen || body.reading || flipping || opened.has(CHEER) || cheering.current) return;
    cheering.current = true;
    const el = cakeRef.current;
    el?.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "center" });
    window.setTimeout(
      () => {
        setPuffs((p) => ({ ...p, 0: Date.now() }));
        setCheer(true);
        open(CHEER);
        foley("breath");
        buzz([12, 50, 12]);
        window.setTimeout(
          () => {
            const r = el?.getBoundingClientRect();
            if (r) {
              const conf = [colors.primary, colors.accent, "#FFD166", "#8DE3C6", "#FFFFFF"];
              burst(body.hostRef.current, r.left + r.width * 0.3, r.top + r.height * 0.35, {
                shape: "confetti",
                colors: conf,
                count: 28,
                spread: 1.8,
                up: true,
              });
              burst(body.hostRef.current, r.left + r.width * 0.7, r.top + r.height * 0.35, {
                shape: "confetti",
                colors: conf,
                count: 28,
                spread: 1.8,
                up: true,
              });
            }
            chime("tada");
          },
          reduce ? 0 : 420,
        );
      },
      reduce ? 60 : 750,
    );
  }, [allOpen, body.reading, flipping, opened, open, reduce, colors, body.hostRef]);

  function read(p: Piece, e: React.MouseEvent<HTMLElement>) {
    if (!opened.has(p.id)) {
      const before = litFor(openedCount, done);
      const after = litFor(openedCount + 1, done);
      if (after < before) {
        const now = Date.now();
        setPuffs((prev) => {
          const next = { ...prev };
          for (let i = after; i < before; i++) next[i] = now;
          return next;
        });
      }
      open(p.id);
      foley("paper");
      buzz(6);
    }
    setFlipping(p.id);
    const r = e.currentTarget.getBoundingClientRect();
    const x = r.left + r.width / 2;
    const y = r.top + r.height * 0.4;
    window.setTimeout(
      () => {
        setFlipping(null);
        body.read(p);
        if (!reduce && !p.sealed && !isLocked(p))
          burst(body.hostRef.current, x, y, {
            shape: "confetti",
            colors: [colors.primary, colors.accent, "#FFD166"],
            count: 10,
            spread: 0.8,
            up: true,
          });
      },
      reduce ? 0 : 380,
    );
  }

  // The bunting is laid out for the room it has: how many polaroids fit on a string, flags in the gaps.
  const buntRef = useRef<HTMLDivElement | null>(null);
  const [bw, setBw] = useState(366);
  useEffect(() => {
    const el = buntRef.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(
      ([e]) => e && setBw(Math.max(200, Math.round(e.contentRect.width))),
    );
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const pw = Math.round(Math.min(150, Math.max(92, bw * 0.27)));
  const per = Math.max(1, Math.floor((bw - 20) / (pw + 54)));
  // On a phone a lot of photos go on one long string you swipe along, so the cake isn't pushed far down.
  const scroll = per <= 2 && photos.length > 4;
  const strings = useMemo(() => {
    if (scroll) return [photos];
    const out: Piece[][] = [];
    for (let i = 0; i < photos.length; i += per) out.push(photos.slice(i, i + per));
    return out;
  }, [photos, per, scroll]);
  const stringWidth = scroll ? photos.length * (pw + 48) + 48 : bw;

  const decos = Math.max(1, Math.floor(seats.length / 5));
  const flags = [
    colors.primary,
    colors.accent,
    colors.mix(colors.primary, "#FFFFFF", 0.55),
    colors.mix(colors.accent, "#FFFFFF", 0.6),
  ];

  return (
    <BodyRoot
      body={body}
      className="pt-root"
      style={
        {
          "--pt-cloth": colors.mix("#FFFDF8", colors.primary, 0.035),
          "--pt-check": colors.mix(colors.primary, "#FFFFFF", 0.1),
          "--pt-runner": colors.mix(colors.accent, "#FFFFFF", 0.78),
          "--pt-frost": colors.mix("#FFF9F0", colors.primary, 0.07),
          "--pt-cake": colors.mix(colors.primary, "#FFFFFF", 0.28),
          "--pt-cake-deep": colors.mix(colors.primary, "#2B1020", 0.3),
          "--pt-pipe": colors.mix(colors.primary, "#FFFFFF", 0.6),
          "--pt-deep": colors.mix(colors.primary, "#2B1A20", 0.35),
          "--pt-acc": colors.accent,
          "--pt-acc-soft": colors.mix(colors.accent, "#FFFFFF", 0.55),
          "--pt-pri-soft": colors.mix(colors.primary, "#FFFFFF", 0.55),
          "--pt-card": colors.mix("#FFFDF7", colors.primary, 0.03),
          // The name is in the gift's own colour, pulled toward the page's ink until it reads on any background.
          "--pt-name": colors.dark
            ? colors.mix(colors.ink, colors.primary, 0.22)
            : colors.mix(colors.primary, colors.ink, 0.38),
          "--pt-name-shadow": colors.dark
            ? colors.mix(colors.primary, colors.bg, 0.3)
            : colors.mix(colors.accent, colors.bg, 0.7),
          "--pt-wall-dot": colors.dark
            ? "rgba(255,255,255,.05)"
            : colors.mix(colors.bg, colors.primary, 0.12),
        } as React.CSSProperties
      }
    >
      <div className="pt-wall" aria-hidden="true" />
      <div className="relative mx-auto max-w-[1120px] px-3 pt-[clamp(30px,8vh,76px)] pb-20">
        <header className="pt-head">
          <p className="pt-kicker">{t("party.kicker")}</p>
          <h1 className="pt-name" style={{ fontFamily: fonts.heading }}>
            {data.named ? (
              <SampleText on={data.nameIsSample}>{data.name}</SampleText>
            ) : (
              body.heading
            )}
          </h1>
          {data.named ? <p className="pt-heading">{body.heading}</p> : null}
          <p className="pt-intro">{body.intro || body.voice.intro(data.named ? data.name : "")}</p>
          <CountdownLine date={data.countdownDate} className="pt-countdown" />
        </header>

        <div
          ref={buntRef}
          className={`pt-bunting ${scroll ? "is-scroll" : ""}`}
          role={strings.length ? "region" : undefined}
          aria-label={strings.length ? t("party.bunting") : undefined}
          style={{ "--pw": `${pw}px` } as React.CSSProperties}
        >
          {(strings.length ? strings : [[]]).map((row, k) => (
            <Garland
              key={k}
              row={row}
              index={k}
              width={stringWidth}
              pw={pw}
              flags={flags}
              opened={opened}
              onOpen={read}
              accent={colors.primary}
            />
          ))}
        </div>

        <section className="pt-table" aria-label={t("party.table")}>
          <span className="pt-runner" aria-hidden="true" />
          <div className="pt-head-of-table">
            <Cake
              innerRef={cakeRef}
              count={drawn}
              lit={lit}
              puffs={puffs}
              cheer={cheer}
              name={data.named ? data.name : ""}
              headingFont={fonts.heading}
            />
            <p className="pt-status" role="status" aria-live="polite">
              {total === 0
                ? body.voice.empty(t("party.what"))
                : allOpen || done
                  ? t("party.allOut")
                  : total - openedCount === 1
                    ? t("party.leftOne")
                    : t("party.left", { n: total - openedCount })}
            </p>
          </div>
          {seats.length ? (
            <div className="pt-seats-wrap">
              {Array.from({ length: decos }, (_, i) => (
                <span
                  key={i}
                  className={`pt-deco is-d${i % 4}`}
                  style={{ top: `${((i + 0.5) / decos) * 100}%` }}
                  aria-hidden="true"
                />
              ))}
              {[0, 1].map((side) => (
                <ul key={side} className={`pt-seats ${side ? "is-right" : "is-left"}`}>
                  {seats.map((p, i) =>
                    i % 2 === side ? (
                      <li key={p.id}>
                        <Setting
                          piece={p}
                          open={opened.has(p.id)}
                          flipping={flipping === p.id}
                          onOpen={(e) => read(p, e)}
                        />
                      </li>
                    ) : null,
                  )}
                </ul>
              ))}
            </div>
          ) : null}
        </section>

        {data.words.length ? <Balloons body={body} /> : null}

        <BodyFooter
          body={body}
          className="pt-footer"
          buttonStyle={{ background: colors.primary, color: colors.onPrimary }}
        />
      </div>

      {body.reading ? (
        <Reader
          piece={body.reading}
          onClose={body.closeReader}
          accent={colors.mix(colors.primary, "#2B1A20", 0.2)}
          className="pt-reader"
        >
          <span className="pt-reader-fold" aria-hidden="true" />
          <span className="pt-reader-band" aria-hidden="true">
            <span className="pt-reader-dots" />
            {body.reading.author ? (
              <span className="pt-reader-name" style={{ fontFamily: fonts.heading }}>
                {body.reading.author}
              </span>
            ) : null}
          </span>
          {data.named && !body.reading.sealed && !isLocked(body.reading) ? (
            <p className="pt-reader-for" style={{ fontFamily: fonts.heading }}>
              {t("party.for", { name: data.name })}
            </p>
          ) : null}
        </Reader>
      ) : null}
    </BodyRoot>
  );
}

/* ---------- the cake ---------- */

/** Candle spots on the cake's top: an outer ring, then an inner one. In 0..100 of the top's box. */
function candleSpots(n: number) {
  const spots: { x: number; y: number; rank: number }[] = [];
  const at = (a: number, r: number) =>
    spots.push({ x: 50 + Math.cos(a) * r * 50, y: 50 + Math.sin(a) * r * 50, rank: 0 });
  // Along the back of the cake, so the name piped on the front stays clear.
  const back = (count: number, r: number) => {
    for (let i = 0; i < count; i++) at(Math.PI + ((i + 1) / (count + 1)) * Math.PI, r);
  };
  if (n <= 5) back(n, 0.6);
  else {
    const outer = Math.min(n, 10);
    for (let i = 0; i < outer; i++)
      at(-Math.PI / 2 + Math.PI / outer + (i / outer) * Math.PI * 2, 0.75);
    back(n - outer, 0.42);
  }
  // Which candle goes out when: spread around the cake, not in a circle.
  const order = spots.map((_, i) => i).sort((a, b) => seed(`c${a}`) - seed(`c${b}`));
  order.forEach((idx, rank) => (spots[idx]!.rank = rank));
  return spots;
}

function Cake({
  innerRef,
  count,
  lit,
  puffs,
  cheer,
  name,
  headingFont,
}: {
  innerRef: React.RefObject<HTMLDivElement | null>;
  count: number;
  lit: number;
  puffs: Record<number, number>;
  cheer: boolean;
  name: string;
  headingFont: string;
}) {
  const spots = useMemo(() => candleSpots(count), [count]);
  const beads = 26;
  const sprinkles = useMemo(
    () =>
      Array.from({ length: 22 }, (_, i) => {
        const a = seed(`sa${i}`) * Math.PI * 2;
        const r = 0.15 + seed(`sr${i}`) * 0.7;
        return {
          x: 50 + Math.cos(a) * r * 50,
          y: 50 + Math.sin(a) * r * 50,
          rot: seed(`so${i}`) * 180,
          c: i % 4,
        };
      }),
    [],
  );
  const glow = count ? lit / count : 0;
  return (
    <div
      ref={innerRef}
      className={`pt-cake ${cheer ? "is-cheer" : ""}`}
      aria-hidden="true"
      style={{ "--glow": glow } as React.CSSProperties}
    >
      <span className="pt-cake-plate" />
      <span className="pt-cake-side">
        <svg viewBox="0 0 100 30" preserveAspectRatio="none" className="pt-cake-drip">
          <path d="M0 0h100v9c-3 0-3 8-6 8s-3-5-6-5-3 10-7 10-3-7-6-7-3 5-6 5-3-9-7-9-3 6-6 6-3-8-6-8-3 11-7 11-3-8-6-8-4 4-7 4-3-6-6-6-3 9-6 9-3-7-6-7-3 5-6 5V0z" />
        </svg>
        <span className="pt-cake-dots" />
      </span>
      <span className="pt-cake-top">
        <span className="pt-cake-light" />
        {sprinkles.map((s, i) => (
          <span
            key={i}
            className={`pt-sprinkle is-c${s.c}`}
            style={{ left: `${s.x}%`, top: `${s.y}%`, rotate: `${s.rot}deg` }}
          />
        ))}
        {Array.from({ length: beads }, (_, i) => {
          const a = (i / beads) * Math.PI * 2;
          return (
            <span
              key={i}
              className="pt-bead"
              style={{
                left: `${50 + Math.cos(a) * 47}%`,
                top: `${50 + Math.sin(a) * 45}%`,
                zIndex: Math.round(50 + Math.sin(a) * 45),
              }}
            />
          );
        })}
        {name ? (
          <span className="pt-cake-name" style={{ fontFamily: headingFont }}>
            {name}
          </span>
        ) : null}
        {spots.map((s, i) => {
          const on = s.rank < lit;
          const puff = puffs[s.rank];
          return (
            <span
              key={i}
              className={`pt-candle ${on ? "is-lit" : "is-out"} ${i % 3 === 1 ? "is-b" : i % 3 === 2 ? "is-c" : ""}`}
              style={{ left: `${s.x}%`, top: `${s.y}%`, zIndex: Math.round(s.y) + 100 }}
            >
              <span className="pt-candle-stick" />
              <span className="pt-flame" style={{ animationDelay: `${-seed(`f${i}`) * 1.2}s` }} />
              {puff && !on ? <span key={puff} className="pt-smoke" /> : null}
            </span>
          );
        })}
      </span>
    </div>
  );
}

/* ---------- a place setting ---------- */

function Setting({
  piece,
  open,
  flipping,
  onOpen,
}: {
  piece: Piece;
  open: boolean;
  flipping: boolean;
  onOpen: (e: React.MouseEvent<HTMLElement>) => void;
}) {
  const r = seed(piece.id);
  const locked = isLocked(piece);
  const favour = Math.floor(r * 3);
  const name = piece.author || t("party.surprise");
  const sub = piece.sealed
    ? pieceWhat(piece)
    : locked
      ? t("body.opensOn", { day: formatDay(piece.date!, SHORT_DAY) })
      : pieceWhat(piece);
  return (
    <button
      type="button"
      className={`pt-setting ${open ? "is-open" : ""} ${flipping ? "is-flip" : ""}`}
      onClick={onOpen}
      aria-label={pieceLabel(piece)}
      style={
        {
          "--tilt": `${((r - 0.5) * 8).toFixed(1)}deg`,
          "--fav": `${(seed(`${piece.id}f`) * 70 - 35).toFixed(0)}deg`,
        } as React.CSSProperties
      }
    >
      <span className="pt-napkin" />
      <span className="pt-cutlery">
        <span className="pt-fork" />
        <span className="pt-knife" />
      </span>
      <span className={`pt-favour is-f${favour}`} />
      <span className="pt-plate">
        <Treat piece={piece} locked={locked} />
      </span>
      <span className="pt-card">
        <span className="pt-card-in">
          <span className="pt-card-heart">{open ? t("party.opened") : ""}</span>
        </span>
        <span className="pt-card-front">
          <span className="pt-card-name">{name}</span>
          <span className="pt-card-sub">
            {piece.sealed || locked ? <Lock className="size-2.5" /> : null}
            {sub}
          </span>
        </span>
      </span>
    </button>
  );
}

/** What's on the plate: a slice for a note, a cookie for a song or voice note, a star for a wish, a box for a surprise. */
function Treat({ piece, locked }: { piece: Piece; locked: boolean }) {
  if (piece.sealed)
    return (
      <span className="pt-bite">
        <span className="pt-cloche">
          <Lock className="size-3.5" />
        </span>
      </span>
    );
  if (piece.kind === "calendar" || locked)
    return (
      <span className="pt-bite is-box">
        <span className="pt-box">
          <span className="pt-box-bow" />
        </span>
      </span>
    );
  if (piece.kind === "song" || piece.kind === "voice") {
    const Icon = piece.kind === "song" ? Music2 : Mic;
    return (
      <span className="pt-bite">
        <span className="pt-cookie">
          <Icon className="size-4" />
        </span>
        <span className="pt-crumbs" />
      </span>
    );
  }
  if (piece.kind === "ornament")
    return (
      <span className="pt-bite">
        <span className="pt-star" />
        <span className="pt-crumbs" />
      </span>
    );
  return (
    <span className="pt-bite">
      <span className="pt-slice">
        <span className="pt-slice-berry" />
      </span>
      <span className="pt-crumbs" />
    </span>
  );
}

/* ---------- bunting ---------- */

function Garland({
  row,
  index,
  width,
  pw,
  flags,
  opened,
  onOpen,
  accent,
}: {
  row: Piece[];
  index: number;
  width: number;
  pw: number;
  flags: string[];
  opened: Set<string>;
  onOpen: (p: Piece, e: React.MouseEvent<HTMLElement>) => void;
  accent: string;
}) {
  // Polaroids spaced evenly, flags filling the gaps between them (a string of just flags when there are no photos).
  const slots: ({ at: number; flag: number } | { at: number; photo: Piece })[] = [];
  let f = index * 3;
  const n = row.length;
  const gap = (width - n * pw) / (n + 1);
  const perGap = Math.max(1, Math.floor((gap - 4) / 30));
  for (let g = 0; g <= n; g++) {
    const start = g * (gap + pw);
    for (let k = 0; k < perGap; k++)
      slots.push({ at: (start + ((k + 0.5) / perGap) * gap) / width, flag: f++ });
    const p = row[g];
    if (p) slots.push({ at: (start + gap + pw / 2) / width, photo: p });
  }
  return (
    <div className={`pt-garland ${n ? "" : "is-plain"}`} style={{ width: `${width}px` }}>
      <span className="pt-line">
        <svg
          className="pt-string"
          viewBox="0 0 100 40"
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          <path d="M-2 4 Q50 36 102 4" />
        </svg>
        {slots.map((s, i) => {
          const tt = s.at;
          const sag = 4 + 64 * tt * (1 - tt) * (1 - 0.08);
          const style = {
            left: `${tt * 100}%`,
            top: `${(sag / 40) * 100}%`,
            "--rot": `${((0.5 - tt) * -24).toFixed(1)}deg`,
          } as React.CSSProperties;
          if ("flag" in s)
            return (
              <span
                key={i}
                className="pt-flag"
                style={
                  {
                    ...style,
                    "--flag": flags[s.flag % flags.length],
                    "--fd": `${(-seed(`fl${i}`) * 3).toFixed(2)}s`,
                  } as React.CSSProperties
                }
                aria-hidden="true"
              />
            );
          const p = s.photo;
          return (
            <button
              key={p.id}
              type="button"
              className={`pt-polaroid ${opened.has(p.id) ? "is-seen" : ""}`}
              style={
                {
                  ...style,
                  "--sw": `${(2.6 + seed(p.id) * 1.8).toFixed(2)}s`,
                  "--sd": `${(-seed(p.id) * 3).toFixed(2)}s`,
                  "--lean": `${((seed(`${p.id}l`) - 0.5) * 8).toFixed(1)}deg`,
                } as React.CSSProperties
              }
              onClick={(e) => onOpen(p, e)}
              aria-label={pieceLabel(p)}
            >
              <span className="pt-peg" aria-hidden="true" />
              <span className="pt-polaroid-pic">
                <PhotoFace piece={p} tint={accent} sizes="160px" />
              </span>
              <span className="pt-polaroid-cap">{p.author}</span>
            </button>
          );
        })}
      </span>
    </div>
  );
}

/* ---------- words as balloons ---------- */

function Balloons({ body }: { body: Body }) {
  const { data, colors, fonts } = body;
  const tints = [
    colors.primary,
    colors.accent,
    colors.mix(colors.primary, "#FFFFFF", 0.45),
    colors.mix(colors.accent, "#FFFFFF", 0.45),
    "#FFD166",
  ];
  return (
    <section className="pt-words" aria-label={t("party.wordsTitle")}>
      <p className="pt-words-title" style={{ fontFamily: fonts.heading }}>
        {t("party.wordsTitle")}
      </p>
      <ul className="pt-balloons">
        {data.words.map((w, i) => {
          const c = tints[i % tints.length]!;
          return (
            <li
              key={w.id}
              className="pt-balloon"
              style={
                {
                  "--bc": c,
                  "--bd": `${(-seed(w.id) * 4).toFixed(2)}s`,
                  "--bt": `${((seed(`${w.id}t`) - 0.5) * 10).toFixed(1)}deg`,
                } as React.CSSProperties
              }
            >
              <span className="pt-balloon-body">
                <span className="pt-balloon-word" style={{ color: readable(c) }}>
                  {w.text}
                </span>
              </span>
              <span className="pt-balloon-string" />
            </li>
          );
        })}
      </ul>
    </section>
  );
}

/** Dark or light ink for a word on a balloon of this color. */
function readable(hexColor: string) {
  const m = /^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(hexColor);
  if (!m) return "#2B2522";
  const [r, g, b] = [m[1], m[2], m[3]].map((h) => parseInt(h!, 16) / 255);
  const lum = 0.2126 * r! + 0.7152 * g! + 0.0722 * b!;
  return lum > 0.6 ? "#2B2522" : "#FFFFFF";
}
