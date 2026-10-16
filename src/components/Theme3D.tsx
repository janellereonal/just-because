import { createContext, useContext, useEffect, useRef, useState } from "react";
import type { ThemeKind } from "@/lib/themeKind";
import type { Palette } from "@/lib/themes";
import type { ThemeScene } from "@/lib/theme3d/scene";
import { KIND_BURST, burst, buzz, chime } from "@/lib/play";

/**
 * Small previews (theme cards, the landing demo) set this to false so a page full
 * of gifts shows still images instead of opening one WebGL context per card.
 */
export const Live3DContext = createContext(true);

/** Hold live scenes still (without throwing them away), e.g. a gift hidden behind its opening. */
export const Pause3DContext = createContext(false);

/** Bump when the stills in public/themes3d are re-rendered, to bust caches. */
const STILL_VERSION = "2";
export const themeStillUrl = (kind: ThemeKind) => `/themes3d/${kind}.webp?v=${STILL_VERSION}`;

/**
 * The occasion's 3D hero object. Shows the pre-rendered still at once, then fades
 * to the live scene when it's near the screen (unless previews or reduced motion
 * say otherwise). Decorative: hidden from screen readers.
 */
/** What a parent can ask the 3D object to do. */
export type Theme3DHandle = {
  celebrate: () => void;
  blowOut: () => boolean;
  relight: () => void;
};

export function Theme3D({
  kind,
  palette,
  className = "",
  interactive = false,
  onPoke,
  handleRef,
  label,
  burstColors,
}: {
  kind: ThemeKind;
  palette: Palette;
  className?: string;
  /** Tap to make it react, drag sideways to spin it. */
  interactive?: boolean;
  /** Called on a tap, with where it happened (for bursts) and whether a piece was hit. */
  onPoke?: (x: number, y: number, hit: boolean) => void;
  handleRef?: React.MutableRefObject<Theme3DHandle | null>;
  /** Accessible name when interactive. */
  label?: string;
  /** With no onPoke: burst these colors into the nearest [data-play-host] on a tap. */
  burstColors?: string[];
}) {
  const live = useContext(Live3DContext);
  const held = useContext(Pause3DContext);
  const heldRef = useRef(held);
  heldRef.current = held;
  const visibleRef = useRef(false);
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const sceneRef = useRef<ThemeScene | null>(null);
  const [ready, setReady] = useState(false);
  const [stillOk, setStillOk] = useState(true);
  const [wiggle, setWiggle] = useState(0);
  const drag = useRef<{
    x: number;
    y: number;
    t: number;
    moved: boolean;
    v: number;
    id: number;
  } | null>(null);

  useEffect(() => {
    if (!handleRef) return;
    handleRef.current = {
      celebrate: () => {
        if (sceneRef.current) sceneRef.current.celebrate();
        else setWiggle((w) => w + 1);
      },
      blowOut: () => sceneRef.current?.blowOut() ?? false,
      relight: () => sceneRef.current?.relight(),
    };
    return () => {
      handleRef.current = null;
    };
  }, [handleRef]);

  function tap(clientX: number, clientY: number) {
    const canvas = canvasRef.current;
    let hit = false;
    if (canvas && sceneRef.current && ready) {
      const r = canvas.getBoundingClientRect();
      hit = sceneRef.current.poke(
        ((clientX - r.left) / r.width) * 2 - 1,
        ((clientY - r.top) / r.height) * 2 - 1,
      );
      if (!hit) sceneRef.current.celebrate();
    } else {
      setWiggle((w) => w + 1);
    }
    if (onPoke) onPoke(clientX, clientY, hit);
    else if (burstColors) {
      const host =
        wrapRef.current?.closest<HTMLElement>("[data-play-host]") ??
        wrapRef.current?.parentElement ??
        null;
      burst(host, clientX, clientY, {
        shape: KIND_BURST[kind],
        colors: burstColors,
        count: hit ? 16 : 10,
      });
      chime(hit ? "pop" : "boop");
      buzz(10);
    }
  }

  const handlers = interactive
    ? {
        onPointerDown: (e: React.PointerEvent) => {
          e.stopPropagation();
          drag.current = {
            x: e.clientX,
            y: e.clientY,
            t: performance.now(),
            moved: false,
            v: 0,
            id: e.pointerId,
          };
        },
        onPointerMove: (e: React.PointerEvent) => {
          const d = drag.current;
          if (!d || d.id !== e.pointerId) return;
          const dx = e.clientX - d.x;
          if (!d.moved && Math.abs(dx) < 7) return;
          if (!d.moved) {
            d.moved = true;
            try {
              (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
            } catch {
              /* fine without capture */
            }
          }
          const now = performance.now();
          const rad = dx * 0.014;
          sceneRef.current?.turn(rad);
          d.v = d.v * 0.6 + (rad / Math.max(8, now - d.t)) * 1000 * 0.4;
          d.x = e.clientX;
          d.t = now;
        },
        onPointerUp: (e: React.PointerEvent) => {
          const d = drag.current;
          drag.current = null;
          if (!d) return;
          e.stopPropagation();
          if (d.moved) sceneRef.current?.fling(d.v);
          else tap(e.clientX, e.clientY);
        },
        onPointerCancel: () => {
          drag.current = null;
        },
        onClick: (e: React.MouseEvent) => e.stopPropagation(),
        onKeyDown: (e: React.KeyboardEvent) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            e.stopPropagation();
            const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
            if (sceneRef.current) sceneRef.current.celebrate();
            else setWiggle((w) => w + 1);
            onPoke?.(r.left + r.width / 2, r.top + r.height / 2, true);
          } else if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
            e.preventDefault();
            sceneRef.current?.fling(e.key === "ArrowLeft" ? -6 : 6);
          }
        },
      }
    : {};

  useEffect(() => {
    if (!live) return;
    const wrap = wrapRef.current;
    const canvas = canvasRef.current;
    if (!wrap || !canvas) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let scene: ThemeScene | null = null;
    let disposed = false;
    let started = false;
    const start = async () => {
      if (started) return;
      started = true;
      try {
        const mod = await import("@/lib/theme3d/scene");
        if (disposed || !mod.webglAvailable()) return;
        scene = mod.createThemeScene(canvas, kind, palette);
        sceneRef.current = scene;
        scene.setPaused(heldRef.current || !visibleRef.current);
        await scene.ready;
        if (!disposed) setReady(true);
      } catch (error) {
        console.warn("[theme3d] keeping the still image", error);
      }
    };
    const io = new IntersectionObserver(
      (entries) => {
        const visible = entries.some((e) => e.isIntersecting);
        visibleRef.current = visible;
        if (visible && !heldRef.current) void start();
        scene?.setPaused(!visible || heldRef.current);
      },
      { rootMargin: "150px" },
    );
    io.observe(wrap);
    const wake = () => void start();
    wrap.addEventListener("jb-3d-wake", wake);
    return () => {
      disposed = true;
      wrap.removeEventListener("jb-3d-wake", wake);
      io.disconnect();
      scene?.dispose();
      scene = null;
      sceneRef.current = null;
      setReady(false);
    };
  }, [live, kind, palette.accent, palette.primary, palette.background]);

  useEffect(() => {
    if (!live) return;
    if (!held && visibleRef.current && !sceneRef.current) {
      // Became unheld while on screen: nudge the observer path by re-checking.
      wrapRef.current?.dispatchEvent(new Event("jb-3d-wake"));
    }
    sceneRef.current?.setPaused(held || !visibleRef.current);
  }, [held, live]);

  return (
    <div
      ref={wrapRef}
      aria-hidden={interactive ? undefined : "true"}
      role={interactive ? "button" : undefined}
      tabIndex={interactive ? 0 : undefined}
      aria-label={interactive ? (label ?? "Tap to play, drag to spin") : undefined}
      className={`relative ${interactive ? "jb-3d-play cursor-grab touch-pan-y select-none active:cursor-grabbing" : "pointer-events-none"} ${className}`}
      {...handlers}
    >
      {stillOk ? (
        <img
          key={wiggle}
          src={themeStillUrl(kind)}
          alt=""
          draggable={false}
          onError={() => setStillOk(false)}
          className={`absolute inset-0 size-full object-contain transition-opacity duration-700 ${ready ? "opacity-0" : "opacity-100"} ${wiggle ? "jb-boing" : ""}`}
        />
      ) : null}
      {live ? (
        <canvas
          ref={canvasRef}
          className={`absolute inset-0 block size-full transition-opacity duration-700 ${ready ? "opacity-100" : "opacity-0"}`}
        />
      ) : null}
    </div>
  );
}
