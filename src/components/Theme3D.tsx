import { createContext, useContext, useEffect, useRef, useState } from "react";
import type { ThemeKind } from "@/lib/themeKind";
import type { Palette } from "@/lib/themes";
import type { ThemeScene } from "@/lib/theme3d/scene";

/**
 * Small previews (theme cards, the landing demo) set this to false so a page full
 * of gifts shows still images instead of opening one WebGL context per card.
 */
export const Live3DContext = createContext(true);

/** Bump when the stills in public/themes3d are re-rendered, to bust caches. */
const STILL_VERSION = "1";
export const themeStillUrl = (kind: ThemeKind) => `/themes3d/${kind}.webp?v=${STILL_VERSION}`;

/**
 * The occasion's 3D hero object. Shows the pre-rendered still at once, then fades
 * to the live scene when it's near the screen (unless previews or reduced motion
 * say otherwise). Decorative: hidden from screen readers.
 */
export function Theme3D({
  kind,
  palette,
  className = "",
}: {
  kind: ThemeKind;
  palette: Palette;
  className?: string;
}) {
  const live = useContext(Live3DContext);
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [ready, setReady] = useState(false);
  const [stillOk, setStillOk] = useState(true);

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
        await scene.ready;
        if (!disposed) setReady(true);
      } catch (error) {
        console.warn("[theme3d] keeping the still image", error);
      }
    };
    const io = new IntersectionObserver(
      (entries) => {
        const visible = entries.some((e) => e.isIntersecting);
        if (visible) void start();
        scene?.setPaused(!visible);
      },
      { rootMargin: "150px" },
    );
    io.observe(wrap);
    return () => {
      disposed = true;
      io.disconnect();
      scene?.dispose();
      scene = null;
      setReady(false);
    };
  }, [live, kind, palette.accent, palette.primary, palette.background]);

  return (
    <div ref={wrapRef} aria-hidden="true" className={`pointer-events-none relative ${className}`}>
      {stillOk ? (
        <img
          src={themeStillUrl(kind)}
          alt=""
          draggable={false}
          onError={() => setStillOk(false)}
          className={`absolute inset-0 size-full object-contain transition-opacity duration-700 ${ready ? "opacity-0" : "opacity-100"}`}
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
