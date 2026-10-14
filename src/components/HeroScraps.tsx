import { useEffect, useRef } from "react";

type Scrap = {
  kind: "polaroid" | "note" | "envelope";
  className: string;
  rotate: number;
  label?: string;
  color: string;
};

const SCRAPS: Scrap[] = [
  { kind: "polaroid", className: "right-[3%] bottom-[7%] max-sm:right-[2%] max-sm:bottom-[2%] max-sm:scale-90", rotate: 8, label: "us, at the beach", color: "linear-gradient(160deg,#D9E8FB,#E6DCF7 55%,#FBD3DC)" },
  { kind: "note", className: "bottom-[6%] left-[48%] max-lg:hidden", rotate: -7, label: "Happy birthday, Kath. Love you lots.", color: "#FFE8B0" },
  { kind: "envelope", className: "top-[44%] right-[1.5%] max-lg:hidden", rotate: -12, color: "#D5F0E3" },
];

const FLUTTER = ["#FBD3DC", "#E6DCF7", "#D5F0E3", "#FFE8B0", "#D9E8FB", "#FFDCCB"];

/**
 * Paper scraps taped around the hero. They tilt toward the cursor, can be nudged
 * and dragged a little, and spring back like they're taped down. When the hero
 * scrolls away, a few scraps and confetti flutter down the page.
 * Decorative only (aria-hidden). Transform and opacity only.
 */
export function HeroScraps({ heroRef }: { heroRef: React.RefObject<HTMLElement | null> }) {
  const refs = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    const hero = heroRef.current;
    if (!hero) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const coarse = window.matchMedia("(pointer: coarse)").matches;

    type State = { el: HTMLDivElement; rot: number; tx: number; ty: number; vx: number; vy: number; rx: number; ry: number; drag: { id: number; x: number; y: number } | null };
    const items: State[] = refs.current
      .map((el, i): State | null => (el ? { el, rot: SCRAPS[i]!.rotate, tx: 0, ty: 0, vx: 0, vy: 0, rx: 0, ry: 0, drag: null } : null))
      .filter((s): s is State => !!s);

    let px = -1;
    let py = -1;
    let raf = 0;
    let running = false;
    const offs: (() => void)[] = [];

    const draw = (s: State) => {
      s.el.style.transform = `perspective(700px) translate3d(${s.tx.toFixed(1)}px, ${s.ty.toFixed(1)}px, 0) rotate(${s.rot + s.tx * 0.06}deg) rotateX(${s.rx.toFixed(2)}deg) rotateY(${s.ry.toFixed(2)}deg)`;
    };

    const tick = () => {
      raf = 0;
      let moving = false;
      for (const s of items) {
        // Tilt toward the cursor (subtle 3D parallax).
        let trx = 0;
        let try_ = 0;
        if (px >= 0 && !reduce && !coarse) {
          const r = s.el.getBoundingClientRect();
          const dx = (px - (r.left + r.width / 2)) / 400;
          const dy = (py - (r.top + r.height / 2)) / 400;
          try_ = Math.max(-1, Math.min(1, dx)) * 14;
          trx = -Math.max(-1, Math.min(1, dy)) * 14;
        }
        s.rx += (trx - s.rx) * 0.12;
        s.ry += (try_ - s.ry) * 0.12;
        if (!s.drag) {
          // Spring back to the tape.
          s.vx = (s.vx - s.tx * 0.12) * 0.78;
          s.vy = (s.vy - s.ty * 0.12) * 0.78;
          s.tx += s.vx;
          s.ty += s.vy;
        }
        draw(s);
        if (Math.abs(s.tx) + Math.abs(s.ty) + Math.abs(s.vx) + Math.abs(s.vy) > 0.2 || Math.abs(s.rx - trx) + Math.abs(s.ry - try_) > 0.1 || s.drag) moving = true;
      }
      if (moving && running) raf = requestAnimationFrame(tick);
    };
    const kick = () => {
      if (!raf && running) raf = requestAnimationFrame(tick);
    };

    const onMove = (e: PointerEvent) => {
      px = e.clientX;
      py = e.clientY;
      for (const s of items) {
        if (!s.drag || s.drag.id !== e.pointerId) continue;
        // Taped down: it gives a little, then resists.
        const dx = e.clientX - s.drag.x;
        const dy = e.clientY - s.drag.y;
        const pull = (d: number) => Math.sign(d) * 70 * (1 - Math.exp(-Math.abs(d) / 90));
        s.tx = pull(dx);
        s.ty = pull(dy);
      }
      kick();
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    offs.push(() => window.removeEventListener("pointermove", onMove));

    for (const s of items) {
      const down = (e: PointerEvent) => {
        if (reduce) return;
        e.preventDefault();
        try {
          s.el.setPointerCapture(e.pointerId);
        } catch {
          // Pointer already gone; the window listener still tracks moves.
        }
        s.drag = { id: e.pointerId, x: e.clientX - s.tx, y: e.clientY - s.ty };
        s.el.style.cursor = "grabbing";
        kick();
      };
      const up = (e: PointerEvent) => {
        if (!s.drag || s.drag.id !== e.pointerId) return;
        s.drag = null;
        s.el.style.cursor = "grab";
        kick();
      };
      s.el.addEventListener("pointerdown", down);
      s.el.addEventListener("pointerup", up);
      s.el.addEventListener("pointercancel", up);
      offs.push(() => {
        s.el.removeEventListener("pointerdown", down);
        s.el.removeEventListener("pointerup", up);
        s.el.removeEventListener("pointercancel", up);
      });
      draw(s);
    }

    // Only animate while the hero is on screen; flutter scraps down as it leaves.
    let fluttered = false;
    const io = new IntersectionObserver(
      ([entry]) => {
        running = !!entry?.isIntersecting;
        if (running) kick();
        else if (!fluttered && !reduce && entry && entry.boundingClientRect.top < 0) {
          fluttered = true;
          flutter();
        }
      },
      { threshold: 0 },
    );
    io.observe(hero);
    offs.push(() => io.disconnect());

    return () => {
      cancelAnimationFrame(raf);
      for (const off of offs) off();
    };
  }, [heroRef]);

  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 z-[1]">
      {SCRAPS.map((s, i) => (
        <div
          key={s.kind}
          ref={(el) => {
            refs.current[i] = el;
          }}
          className={`pointer-events-auto absolute cursor-grab touch-none select-none will-change-transform ${s.className}`}
          style={{ transform: `rotate(${s.rotate}deg)` }}
        >
          <Tape />
          {s.kind === "polaroid" ? (
            <div className="w-[104px] rounded-[6px] bg-white p-2 pb-1.5 shadow-[0_14px_30px_-16px_rgba(43,37,34,0.55)] sm:w-[124px]">
              <div className="aspect-square rounded-[3px]" style={{ background: s.color }}>
                <div className="flex size-full items-end justify-center pb-3">
                  <span className="size-6 rounded-full bg-white/70" />
                  <span className="-ml-1 size-8 rounded-full bg-white/80" />
                </div>
              </div>
              <p className="pt-1.5 text-center text-[11px] text-ink/70">{s.label}</p>
            </div>
          ) : s.kind === "note" ? (
            <div
              className="w-[132px] rounded-[10px] p-3 text-[12px] leading-snug text-ink/80 shadow-[0_14px_30px_-16px_rgba(43,37,34,0.5)] sm:w-[150px]"
              style={{ background: s.color }}
            >
              {s.label}
            </div>
          ) : (
            <div className="relative h-[58px] w-[86px] overflow-hidden rounded-[8px] shadow-[0_14px_30px_-16px_rgba(43,37,34,0.5)]" style={{ background: s.color }}>
              <span className="absolute inset-x-0 top-0 h-[38px] origin-top bg-white/45 [clip-path:polygon(0_0,100%_0,50%_100%)]" />
              <span className="absolute top-[26px] left-1/2 size-3 -translate-x-1/2 rounded-full bg-accent/80" />
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function Tape() {
  return <span className="absolute -top-2 left-1/2 z-10 h-4 w-11 -translate-x-1/2 -rotate-3 rounded-[2px] bg-white/60 shadow-sm backdrop-blur-[1px]" />;
}

/** A few scraps and confetti flutter down the screen (fixed, gone in ~2.5s). */
function flutter() {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const n = vw < 640 ? 7 : 12;
  for (let i = 0; i < n; i++) {
    const bit = document.createElement("span");
    const scrap = i % 3 === 0;
    const w = scrap ? 26 + Math.random() * 10 : 8 + Math.random() * 5;
    const h = scrap ? w * 0.7 : w * 0.55;
    Object.assign(bit.style, {
      position: "fixed",
      left: `${Math.random() * vw}px`,
      top: "-30px",
      width: `${w}px`,
      height: `${h}px`,
      borderRadius: scrap ? "5px" : "2px",
      background: FLUTTER[i % FLUTTER.length]!,
      boxShadow: scrap ? "0 6px 14px -8px rgba(43,37,34,.45)" : "none",
      pointerEvents: "none",
      zIndex: "25",
      willChange: "transform, opacity",
    });
    bit.setAttribute("aria-hidden", "true");
    document.body.appendChild(bit);
    const sway = (Math.random() - 0.5) * 120;
    const fall = vh * (0.55 + Math.random() * 0.4);
    const spin = (Math.random() - 0.5) * 720;
    const anim = bit.animate(
      [
        { transform: "translate(0,0) rotate(0deg)", opacity: 1 },
        { transform: `translate(${sway}px, ${fall * 0.5}px) rotate(${spin / 2}deg)`, opacity: 1, offset: 0.5 },
        { transform: `translate(${-sway * 0.4}px, ${fall}px) rotate(${spin}deg)`, opacity: 0 },
      ],
      { duration: 1800 + Math.random() * 900, delay: Math.random() * 400, easing: "cubic-bezier(.3,.2,.4,1)" },
    );
    anim.onfinish = () => bit.remove();
  }
}
