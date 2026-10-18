import { giftVoice } from "@/lib/giftVoice";
import { shareGift } from "@/lib/track";
import { SampleText } from "@/components/SampleMark";
import { giftHeading } from "@/lib/themeKind";
import { useEffect, useMemo, useRef, useState } from "react";
import { FONT_PAIRINGS } from "@/lib/gift";
import { usePieces, useReducedMotion, type Piece } from "@/lib/giftPieces";
import type { FormatViewProps } from "@/components/formats/FormatView";
import { PieceSheet, seed } from "@/components/formats/PieceSheet";
import { burst, buzz } from "@/lib/play";
import { heartComplete, lineDrawn, starAgain, starFound } from "@/lib/nightsky/sound";
import { NightSky } from "@/components/formats/NightSky";

/**
 * Points on a heart curve, spaced evenly along its outline (not by angle, which bunches
 * stars at the top dip and the tip), so the finished constellation draws a clean heart.
 */
function heartPoints(n: number) {
  const curve = (t: number) => ({
    x: 16 * Math.sin(t) ** 3,
    y: 13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t),
  });
  const N = 720;
  // Start at the top notch (t = 0) and leave a gap either side of it, so the two stars
  // next to the notch aren't on top of each other.
  const dense = Array.from({ length: N + 1 }, (_, i) => curve(Math.PI * 2 * (i / N)));
  const acc = [0];
  for (let i = 1; i <= N; i++)
    acc.push(
      acc[i - 1]! + Math.hypot(dense[i]!.x - dense[i - 1]!.x, dense[i]!.y - dense[i - 1]!.y),
    );
  const total = acc[N]!;
  // Both sides of the notch rise almost together, so skip along until they've spread
  // at least most of a star's spacing apart.
  const spacing = total / Math.max(1, n);
  let g = 0;
  while (g < N / 4 && Math.abs(dense[g]!.x) * 2 < spacing * 0.9) g++;
  const gap = Math.min(acc[g]!, total * 0.12);
  const pts: { x: number; y: number }[] = [];
  let j = 0;
  for (let i = 0; i < n; i++) {
    const target = gap + (n > 1 ? (i / (n - 1)) * (total - 2 * gap) : total / 2);
    while (j < N - 1 && acc[j + 1]! < target) j++;
    const a = dense[j]!;
    const b = dense[j + 1] ?? a;
    const k = (target - acc[j]!) / Math.max(1e-6, acc[j + 1]! - acc[j]!);
    const x = a.x + (b.x - a.x) * k;
    const y = a.y + (b.y - a.y) * k;
    pts.push({ x: 50 + x * 2.55, y: 46 - y * 2.35 });
  }
  return pts;
}

/** Few stars: a gentle arc. Many: the heart. */
function layout(pieces: Piece[]) {
  const n = pieces.length;
  if (n <= 3)
    return pieces.map((p, i) => ({
      x: 22 + (i * 56) / Math.max(1, n - 1 || 1),
      y: 40 + Math.sin((i / Math.max(1, n - 1)) * Math.PI) * -14,
    }));
  return heartPoints(n).map((pt, i) => ({
    x: pt.x + (seed(pieces[i]!.id) - 0.5) * 3,
    y: pt.y + (seed(pieces[i]!.id + "y") - 0.5) * 3,
  }));
}

/**
 * Constellation: a night sky where every friend is a star. Tap a star to read
 * it; each one you open draws a line to the last, and when they're all lit the
 * stars make a heart. Drag the sky to look around.
 */
export function ConstellationView({
  theme,
  site,
  modules,
  contributions,
  calendarEntries,
  palette,
  sample,
  showShare,
}: FormatViewProps) {
  const data = usePieces({ site, modules, contributions, calendarEntries, sample });
  const voice = giftVoice(site.solo);
  const reduce = useReducedMotion();
  const fonts = FONT_PAIRINGS[site.font_choice] ?? FONT_PAIRINGS.romantic;
  const stars = data.notes;
  const pos = useMemo(() => layout(stars), [stars]);
  const [lit, setLit] = useState<string[]>([]);
  const [sheet, setSheet] = useState<Piece | null>(null);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const rootRef = useRef<HTMLDivElement | null>(null);
  const skyRef = useRef<HTMLDivElement | null>(null);
  const dragRef = useRef<{
    id: number;
    x: number;
    y: number;
    px: number;
    py: number;
    moved: boolean;
  } | null>(null);
  const done = stars.length > 0 && lit.length === stars.length;
  const colors = ["#FFFFFF", "#FFE9A8", palette.accent, palette.primary];
  // The 3D sky, unless this browser can't draw it (then the classic sky below).
  const [classic, setClassic] = useState(false);
  const [ground, setGround] = useState<string | null>(null);

  // Background stars, drawn once.
  const dust = useMemo(
    () =>
      Array.from({ length: 90 }, (_, i) => ({
        x: (i * 73.7) % 100,
        y: (i * 41.3) % 100,
        s: 0.6 + ((i * 17) % 10) / 9,
        d: ((i * 13) % 50) / 10,
        layer: i % 3,
      })),
    [],
  );

  useEffect(() => {
    if (!done || reduce) return;
    const r = skyRef.current?.getBoundingClientRect();
    if (!r) return;
    window.setTimeout(() => {
      burst(rootRef.current, r.left + r.width / 2, r.top + r.height * 0.45, {
        shape: "stars",
        colors,
        count: 40,
        spread: 2.2,
      });
      heartComplete(stars.length);
    }, 400);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [done]);

  function open(p: Piece, e?: { clientX: number; clientY: number }) {
    const x = e && typeof window !== "undefined" ? e.clientX / Math.max(1, window.innerWidth) : 0.5;
    const again = lit.indexOf(p.id);
    if (again < 0) {
      starFound(lit.length, x);
      // A line draws to each neighbour on the heart that's already been found.
      const i = stars.findIndex((s) => s.id === p.id);
      const n = stars.length;
      const near = [stars[(i + 1) % n], stars[(i - 1 + n) % n]].filter(
        (q) => q && q.id !== p.id && lit.includes(q.id),
      );
      if (near.length) lineDrawn();
      setLit((l) => (l.includes(p.id) ? l : [...l, p.id]));
    } else starAgain(again, x);
    if (e)
      burst(rootRef.current, e.clientX, e.clientY, {
        shape: "sparkles",
        colors,
        count: 12,
        spread: 0.7,
      });
    buzz(8);
    window.setTimeout(() => setSheet(p), reduce ? 0 : 280);
  }

  const lines = lit
    .map((id) => stars.findIndex((s) => s.id === id))
    .filter((i) => i >= 0)
    .map((i) => pos[i]!);

  const heading = (
    <>
      <p className="cst-kicker">
        Look up{data.named ? ", " : ""}
        {data.named ? <SampleText on={data.nameIsSample}>{data.name}</SampleText> : null}
      </p>
      <h1 className="cst-title" style={{ fontFamily: fonts.heading }}>
        {giftHeading(site.custom_text, theme, site.occasion)}
      </h1>
      <p className="cst-intro">
        {site.custom_text.intro_message?.trim() ||
          (voice.solo
            ? "Every star up here is a memory of us. Tap one to read it, and watch them connect."
            : "Every star up here is someone who loves you. Tap one to read it, and watch them connect.")}
      </p>
    </>
  );

  return (
    <div
      ref={rootRef}
      className={`cst-root relative min-h-screen ${classic ? "" : "is-3d"}`}
      data-play-host
      style={
        {
          "--cst-accent": palette.accent,
          "--cst-tint": palette.primary,
          "--cst-ground": ground ?? undefined,
          fontFamily: fonts.body,
        } as React.CSSProperties
      }
    >
      {!classic ? (
        <div ref={skyRef}>
          <NightSky
            stars={stars}
            pos={pos}
            lit={lit}
            done={done}
            tint={palette.primary}
            accent={palette.accent}
            reduce={reduce}
            onOpen={open}
            onFail={() => setClassic(true)}
            onGround={setGround}
            header={heading}
          />
        </div>
      ) : (
        <>
          <div className="mx-auto max-w-3xl px-4 pt-10 pb-14 text-center">{heading}</div>

          <div
            ref={skyRef}
            className="cst-sky"
            onPointerDown={(e) => {
              if ((e.target as HTMLElement).closest("button")) return;
              dragRef.current = {
                id: e.pointerId,
                x: e.clientX,
                y: e.clientY,
                px: pan.x,
                py: pan.y,
                moved: false,
              };
            }}
            onPointerMove={(e) => {
              const d = dragRef.current;
              if (!d || d.id !== e.pointerId || reduce) return;
              const dx = e.clientX - d.x;
              const dy = e.clientY - d.y;
              if (!d.moved && Math.hypot(dx, dy) < 6) return;
              if (!d.moved)
                try {
                  (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
                } catch {
                  /* ok */
                }
              d.moved = true;
              setPan({
                x: Math.max(-40, Math.min(40, d.px + dx * 0.4)),
                y: Math.max(-30, Math.min(30, d.py + dy * 0.4)),
              });
            }}
            onPointerUp={() => {
              dragRef.current = null;
              setPan({ x: 0, y: 0 });
            }}
            onPointerCancel={() => {
              dragRef.current = null;
              setPan({ x: 0, y: 0 });
            }}
          >
            {[0, 1, 2].map((layer) => (
              <div
                key={layer}
                className="cst-dust"
                aria-hidden="true"
                style={{
                  transform: `translate(${pan.x * (0.3 + layer * 0.35)}px, ${pan.y * (0.3 + layer * 0.35)}px)`,
                  transition: dragRef.current ? "none" : "transform .9s cubic-bezier(.2,1.4,.4,1)",
                }}
              >
                {dust
                  .filter((d) => d.layer === layer)
                  .map((d, i) => (
                    <i
                      key={i}
                      style={{
                        left: `${d.x}%`,
                        top: `${d.y}%`,
                        width: d.s * 2,
                        height: d.s * 2,
                        animationDelay: `${-d.d}s`,
                      }}
                    />
                  ))}
              </div>
            ))}
            {!reduce ? (
              <>
                <span className="cst-shoot" aria-hidden="true" />
                <span className="cst-shoot cst-shoot-2" aria-hidden="true" />
              </>
            ) : null}

            <div
              className="cst-field"
              style={{
                transform: `translate(${pan.x}px, ${pan.y}px)`,
                transition: dragRef.current ? "none" : "transform .9s cubic-bezier(.2,1.4,.4,1)",
              }}
            >
              <svg
                className="cst-lines"
                viewBox="0 0 100 100"
                preserveAspectRatio="none"
                aria-hidden="true"
              >
                {lines.slice(1).map((p, i) => {
                  const a = lines[i]!;
                  return (
                    <line
                      key={i}
                      x1={a.x}
                      y1={a.y}
                      x2={p.x}
                      y2={p.y}
                      pathLength={1}
                      className="cst-line"
                    />
                  );
                })}
                {done && lines.length > 2 ? (
                  <line
                    x1={lines[lines.length - 1]!.x}
                    y1={lines[lines.length - 1]!.y}
                    x2={lines[0]!.x}
                    y2={lines[0]!.y}
                    pathLength={1}
                    className="cst-line"
                  />
                ) : null}
              </svg>
              {stars.map((p, i) => {
                const on = lit.includes(p.id);
                const at = pos[i]!;
                return (
                  <button
                    key={p.id}
                    type="button"
                    className={`cst-star ${on ? "is-lit" : ""}`}
                    style={
                      {
                        left: `${at.x}%`,
                        top: `${at.y}%`,
                        animationDelay: `${-seed(p.id) * 4}s`,
                      } as React.CSSProperties
                    }
                    onClick={(e) => open(p, e)}
                    aria-label={`${on ? "Read again: " : ""}a star from ${p.author || "a friend"}`}
                  >
                    <span className="cst-glow" />
                    <span className="cst-core">✦</span>
                    <span className="cst-name">{p.author}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </>
      )}

      <div className="mx-auto max-w-xl px-4 pt-6 pb-16 text-center">
        <p className="cst-progress" role="status" aria-live="polite">
          {done
            ? `You're the brightest one${data.named ? `, ${data.name}` : ""}.`
            : stars.length
              ? `${lit.length} of ${stars.length} stars found`
              : voice.empty("stars")}
        </p>
        {data.words.length ? (
          <p className="mt-4 text-sm opacity-75">
            Written in the stars:{" "}
            {data.words
              .map((w) => w.text)
              .filter(Boolean)
              .join(" · ")}
          </p>
        ) : null}
        {done && data.friends.length ? (
          <p className="mt-4 text-sm opacity-80">With love from {data.friends.join(", ")}.</p>
        ) : null}
        {site.custom_text.footer_note ? (
          <p className="mt-2 text-sm opacity-70">{site.custom_text.footer_note}</p>
        ) : null}
        {data.isSample ? <p className="mt-2 text-sm opacity-70">{voice.sample}</p> : null}
        {showShare && done ? (
          <button type="button" className="cst-share" onClick={() => shareGift(site)}>
            Share the sky
          </button>
        ) : null}
      </div>
      {sheet ? (
        <PieceSheet
          piece={sheet}
          palette={{ ...palette, background: "#1d1b3a" }}
          onClose={() => setSheet(null)}
        />
      ) : null}
    </div>
  );
}
