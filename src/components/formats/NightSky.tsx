import { useEffect, useRef, useState, type ReactNode } from "react";
import type { Piece } from "@/lib/giftPieces";
import type { Projected, Sky } from "@/lib/nightsky/scene";
import { nightAir, shootingStar } from "@/lib/nightsky/sound";
import { useSound } from "@/lib/play";

type Props = {
  stars: Piece[];
  /** Where each star sits, in the 0..100 layout space. */
  pos: { x: number; y: number }[];
  /** Ids of the stars found so far, in the order they were found. */
  lit: string[];
  done: boolean;
  tint: string;
  accent: string;
  reduce: boolean;
  /** The title, intro line and anything else that floats at the top of the sky. */
  header: ReactNode;
  onOpen: (p: Piece, e: { clientX: number; clientY: number }) => void;
  /** No WebGL here: the caller shows the classic sky instead. */
  onFail: () => void;
  /** The colour of the ground, so the page under the sky can match it. */
  onGround?: (hex: string) => void;
};

type Meteor = {
  x0: number;
  y0: number;
  dx: number;
  dy: number;
  start: number;
  dur: number;
  len: number;
};

/**
 * The 3D night sky for the Constellation style. The sky itself is WebGL (see
 * src/lib/nightsky/scene.ts); the stars you tap are real buttons laid over it, so
 * keyboards and screen readers work, and the lines between them are drawn in SVG
 * on top so they stay crisp at any size.
 */
export function NightSky({
  stars,
  pos,
  lit,
  done,
  tint,
  accent,
  reduce,
  header,
  onOpen,
  onFail,
  onGround,
}: Props) {
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const headRef = useRef<HTMLDivElement | null>(null);
  const btnRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const skyRef = useRef<Sky | null>(null);
  const [ready, setReady] = useState(false);
  const [soundIsOn] = useSound();
  const visibleRef = useRef(false);
  // The night air plays only while the sky is on screen and sound is on.
  useEffect(() => {
    nightAir(soundIsOn && visibleRef.current && !reduce);
    return () => nightAir(false);
  }, [soundIsOn, reduce]);

  // What the frame loop reads, without re-running effects.
  const live = useRef({ lit, done, stars, reduce });
  const soundIsOnRef = useRef(false);
  soundIsOnRef.current = soundIsOn;
  live.current = { lit, done, stars, reduce };
  const segStart = useRef(new Map<string, number>());
  const hitRef = useRef(0);
  const meteors = useRef<Meteor[]>([]);
  const nextMeteor = useRef(4);

  // Build the sky once per set of stars and colours.
  useEffect(() => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) return;
    let disposed = false;
    let sky: Sky | null = null;
    const cleanups: (() => void)[] = [];
    const lite =
      Math.min(window.innerWidth, window.innerHeight) < 600 ||
      (navigator.hardwareConcurrency || 8) <= 4 ||
      ((navigator as Navigator & { deviceMemory?: number }).deviceMemory ?? 8) <= 4;

    import("@/lib/nightsky/scene")
      .then(({ createSky }) => {
        if (disposed) return;
        sky = createSky(canvas, { tint, accent, stars: pos, lite, still: reduce });
        if (!sky) {
          onFail();
          return;
        }
        skyRef.current = sky;
        onGround?.(sky.ground);
        const r = wrap.getBoundingClientRect();
        sky.resize(r.width, r.height);
        const safe = () => {
          const head = headRef.current;
          if (head)
            sky?.setSafeTop(head.getBoundingClientRect().bottom - wrap.getBoundingClientRect().top);
        };
        safe();
        sky.setLit(live.current.stars.map((s) => live.current.lit.includes(s.id)));
        sky.setDone(live.current.done);
        sky.onFrame(draw);
        setReady(true);

        const ro = new ResizeObserver(([e]) => {
          if (!e) return;
          sky?.resize(e.contentRect.width, e.contentRect.height);
          safe();
        });
        ro.observe(wrap);
        if (headRef.current) ro.observe(headRef.current);
        // Fonts can arrive after the first measure and change the title's height.
        document.fonts?.ready.then(safe).catch(() => {});
        cleanups.push(() => ro.disconnect());

        // Only run while it's on screen and the tab is visible.
        let seen = false;
        let visible = false;
        const sync = () => {
          const on = visible && document.visibilityState === "visible";
          visibleRef.current = on;
          sky?.setRunning(on);
          nightAir(on && soundIsOnRef.current && !live.current.reduce);
        };
        const io = new IntersectionObserver(
          ([e]) => {
            visible = !!e?.isIntersecting;
            if (visible && !seen) {
              seen = true;
              sky?.intro();
            }
            sync();
          },
          { threshold: 0.15 },
        );
        io.observe(wrap);
        document.addEventListener("visibilitychange", sync);
        // If the gift's opening was still covering the page, rise again once it's gone.
        const again = () => sky?.intro();
        window.addEventListener("jb:opening-done", again);
        cleanups.push(() => {
          io.disconnect();
          document.removeEventListener("visibilitychange", sync);
          window.removeEventListener("jb:opening-done", again);
        });
      })
      .catch(() => {
        if (!disposed) onFail();
      });

    return () => {
      disposed = true;
      cleanups.forEach((f) => f());
      sky?.dispose();
      skyRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tint, accent, reduce, pos]);

  useEffect(() => {
    skyRef.current?.setLit(stars.map((s) => lit.includes(s.id)));
  }, [lit, stars]);

  useEffect(() => {
    skyRef.current?.setDone(done);
  }, [done]);

  /** Runs after every WebGL frame: move the buttons, draw the lines and shooting stars. */
  function draw(p: Projected[], t: number) {
    const { lit, stars, reduce } = live.current;
    // Tap areas as big as the space around each star allows, so neighbours never overlap.
    let gap = Infinity;
    for (let i = 0; i < p.length; i++)
      for (let j = i + 1; j < p.length; j++)
        gap = Math.min(gap, Math.hypot(p[i]!.x - p[j]!.x, p[i]!.y - p[j]!.y));
    const hit = Math.round(Math.max(26, Math.min(54, Number.isFinite(gap) ? gap * 0.96 : 54)));
    if (wrapRef.current && hitRef.current !== hit) {
      hitRef.current = hit;
      wrapRef.current.style.setProperty("--nsk-hit", `${hit}px`);
    }
    p.forEach((pt, i) => {
      const b = btnRefs.current[i];
      if (!b) return;
      b.style.transform = `translate3d(${pt.x}px, ${pt.y}px, 0) translate(-50%, -50%)`;
      b.style.opacity = pt.on ? "1" : "0";
      b.style.pointerEvents = pt.on ? "auto" : "none";
    });

    const svg = svgRef.current;
    if (!svg) return;
    // Lines run along the heart's outline: between neighbours, once both are found.
    const on = new Set(lit);
    const segs: { a: number; b: number; key: string }[] = [];
    const n = stars.length;
    for (let i = 0; i < n; i++) {
      const j = i + 1 < n ? i + 1 : n > 3 ? 0 : -1;
      if (j < 0 || j === i) continue;
      if (on.has(stars[i]!.id) && on.has(stars[j]!.id))
        segs.push({ a: i, b: j, key: `${stars[i]!.id}>${stars[j]!.id}` });
    }
    // Which end to grow from: the star that was found first.
    const order = new Map(lit.map((id, k) => [id, k] as const));
    const lines = svg.querySelector<SVGGElement>("[data-lines]")!;
    while (lines.childElementCount < segs.length) {
      const l = document.createElementNS("http://www.w3.org/2000/svg", "line");
      l.setAttribute("class", "nsk-line");
      lines.appendChild(l);
    }
    while (lines.childElementCount > segs.length) lines.lastElementChild?.remove();
    const now = performance.now();
    segs.forEach((s, i) => {
      const l = lines.children[i] as SVGLineElement;
      const first = (order.get(stars[s.a]!.id) ?? 0) <= (order.get(stars[s.b]!.id) ?? 0);
      const A = p[first ? s.a : s.b];
      const B = p[first ? s.b : s.a];
      if (!A || !B) return;
      if (!segStart.current.has(s.key)) segStart.current.set(s.key, now);
      const start = segStart.current.get(s.key)!;
      const k = reduce ? 1 : Math.max(0, Math.min(1, (now - start) / 900));
      const e = 1 - Math.pow(1 - k, 3);
      // Grow from star A toward star B.
      l.setAttribute("x1", A.x.toFixed(1));
      l.setAttribute("y1", A.y.toFixed(1));
      l.setAttribute("x2", (A.x + (B.x - A.x) * e).toFixed(1));
      l.setAttribute("y2", (A.y + (B.y - A.y) * e).toFixed(1));
      l.style.opacity = e > 0 ? String(0.35 + 0.65 * e) : "0";
    });

    // Shooting stars, now and then.
    const box = svg.getBoundingClientRect();
    const met = svg.querySelector<SVGGElement>("[data-meteors]")!;
    if (!reduce) {
      if (t > nextMeteor.current) {
        const fromLeft = Math.random() < 0.5;
        const ang = (fromLeft ? 0.35 : Math.PI - 0.35) + (Math.random() - 0.5) * 0.4;
        meteors.current.push({
          x0: box.width * (fromLeft ? 0.05 + Math.random() * 0.4 : 0.55 + Math.random() * 0.4),
          y0: box.height * (0.05 + Math.random() * 0.3),
          dx: Math.cos(ang),
          dy: Math.sin(ang),
          start: t,
          dur: 0.7 + Math.random() * 0.5,
          len: Math.min(box.width, 900) * (0.18 + Math.random() * 0.12),
        });
        nextMeteor.current = t + 5 + Math.random() * 7;
        shootingStar(fromLeft);
      }
      meteors.current = meteors.current.filter((m) => t - m.start < m.dur);
    } else meteors.current = [];
    // Each shooting star is a gradient line, bright at the head and fading to nothing at the tail.
    const NS = "http://www.w3.org/2000/svg";
    while (met.childElementCount < meteors.current.length) {
      const g = document.createElementNS(NS, "g");
      const grad = document.createElementNS(NS, "linearGradient");
      const id = `nsk-m-${Math.random().toString(36).slice(2, 8)}`;
      grad.setAttribute("id", id);
      grad.setAttribute("gradientUnits", "userSpaceOnUse");
      grad.innerHTML =
        '<stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset="0.85" stop-color="#e8f0ff" stop-opacity=".8"/><stop offset="1" stop-color="#fff" stop-opacity="1"/>';
      const l = document.createElementNS(NS, "line");
      l.setAttribute("class", "nsk-meteor");
      l.setAttribute("stroke", `url(#${id})`);
      g.append(grad, l);
      met.appendChild(g);
    }
    while (met.childElementCount > meteors.current.length) met.lastElementChild?.remove();
    meteors.current.forEach((m, i) => {
      const g = met.children[i] as SVGGElement;
      const grad = g.firstElementChild as SVGLinearGradientElement;
      const l = g.lastElementChild as SVGLineElement;
      const k = (t - m.start) / m.dur;
      const travel = m.len * 2.2 * k;
      const hx = m.x0 + m.dx * travel;
      const hy = m.y0 + m.dy * travel;
      const tail = m.len * Math.min(1, k * 3) * (1 - k * 0.5);
      const tx = hx - m.dx * tail;
      const ty = hy - m.dy * tail;
      for (const [el, a, b, c, d] of [
        [l, tx, ty, hx, hy],
        [grad, tx, ty, hx, hy],
      ] as const) {
        el.setAttribute("x1", a.toFixed(1));
        el.setAttribute("y1", b.toFixed(1));
        el.setAttribute("x2", c.toFixed(1));
        el.setAttribute("y2", d.toFixed(1));
      }
      l.style.opacity = String(Math.sin(Math.PI * Math.min(1, k * 1.1)));
    });
  }

  // Look around by dragging; a tiny lean toward the mouse on desktop.
  const dragRef = useRef<{ id: number; x: number; y: number; moved: boolean } | null>(null);

  return (
    <div
      ref={wrapRef}
      className={`nsk-wrap ${ready ? "is-ready" : ""}`}
      onPointerDown={(e) => {
        if ((e.target as HTMLElement).closest("button, a")) return;
        dragRef.current = { id: e.pointerId, x: e.clientX, y: e.clientY, moved: false };
      }}
      onPointerMove={(e) => {
        const d = dragRef.current;
        const sky = skyRef.current;
        if (!sky || reduce) return;
        if (!d) {
          if (e.pointerType === "mouse") {
            const r = e.currentTarget.getBoundingClientRect();
            sky.lean(
              ((e.clientX - r.left) / r.width) * 2 - 1,
              ((e.clientY - r.top) / r.height) * 2 - 1,
            );
          }
          return;
        }
        if (d.id !== e.pointerId) return;
        const dx = e.clientX - d.x;
        const dy = e.clientY - d.y;
        if (!d.moved && Math.hypot(dx, dy) < 6) return;
        if (!d.moved) {
          // On phones, a mostly vertical swipe is a page scroll, not a look.
          if (e.pointerType !== "mouse" && Math.abs(dy) > Math.abs(dx)) {
            dragRef.current = null;
            return;
          }
          try {
            e.currentTarget.setPointerCapture(e.pointerId);
          } catch {
            /* ok */
          }
        }
        d.moved = true;
        sky.drag(dx, dy);
      }}
      onPointerUp={() => {
        dragRef.current = null;
        skyRef.current?.release();
      }}
      onPointerCancel={() => {
        dragRef.current = null;
        skyRef.current?.release();
      }}
      onPointerLeave={() => skyRef.current?.lean(0, 0)}
    >
      <canvas ref={canvasRef} className="nsk-canvas" aria-hidden="true" />
      <svg ref={svgRef} className="nsk-overlay" aria-hidden="true">
        <g data-meteors />
        <g data-lines />
      </svg>
      <div ref={headRef} className="nsk-head">
        {header}
      </div>
      <div className="nsk-stars">
        {stars.map((p, i) => {
          const on = lit.includes(p.id);
          return (
            <button
              key={p.id}
              ref={(el) => {
                btnRefs.current[i] = el;
              }}
              type="button"
              className={`nsk-star ${on ? "is-lit" : ""} ${lit[lit.length - 1] === p.id ? "is-last" : ""}`}
              style={{ opacity: 0 }}
              onClick={(e) => onOpen(p, e)}
              onPointerEnter={() => skyRef.current?.setHover(i)}
              onPointerLeave={() => skyRef.current?.setHover(-1)}
              onFocus={() => skyRef.current?.setHover(i)}
              onBlur={() => skyRef.current?.setHover(-1)}
              aria-label={`${on ? "Read again: " : ""}a star from ${p.author || "a friend"}`}
            >
              <span className="nsk-name">{p.author}</span>
            </button>
          );
        })}
      </div>
      <div className="nsk-hint" aria-hidden="true">
        {reduce ? null : "Drag to look around"}
      </div>
    </div>
  );
}
