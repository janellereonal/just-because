import { useEffect, useRef, useState } from "react";
import Bo from "@/components/Bo";
import type { BoMood, BoScene } from "@/lib/bo3d/scene";

type Props = {
  className?: string;
  lidColor?: string;
  mood?: BoMood;
  /** Pastel notes floating around Bo. */
  notes?: boolean;
  /** Scroll story 0..4, or null for plain idle/wave. */
  story?: number | null;
  /** Called every frame for the story value (cheaper than re-rendering on scroll). */
  storySource?: (() => number | null) | null;
  /** Shown to screen readers. */
  label?: string;
};

/**
 * Bo in 3D. three.js loads only in the browser and only once Bo is near the
 * screen; until then (or without WebGL) the flat SVG Bo stands in. Pauses
 * when scrolled away to save battery.
 */
export function Bo3D({ className, lidColor = "#F6A5B9", mood = "wave", notes = false, story = null, storySource = null, label = "Bo, the Just Because gift box, waving" }: Props) {
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const sceneRef = useRef<BoScene | null>(null);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const wrap = wrapRef.current;
    const canvas = canvasRef.current;
    if (!wrap || !canvas) return;
    let disposed = false;
    let started = false;

    const start = async () => {
      if (started) return;
      started = true;
      try {
        const mod = await import("@/lib/bo3d/scene");
        if (disposed) return;
        if (!mod.webglAvailable()) {
          setFailed(true);
          return;
        }
        sceneRef.current = mod.createBoScene(canvas, { lidColor, notes, mood });
        sceneRef.current.setStory(story);
        setReady(true);
      } catch (error) {
        console.warn("[bo3d] falling back to flat Bo", error);
        setFailed(true);
      }
    };

    const io = new IntersectionObserver(
      (entries) => {
        const visible = entries.some((e) => e.isIntersecting);
        if (visible) void start();
        sceneRef.current?.setPaused(!visible);
      },
      { rootMargin: "200px" },
    );
    io.observe(wrap);
    return () => {
      disposed = true;
      io.disconnect();
      sceneRef.current?.dispose();
      sceneRef.current = null;
    };
    // The scene is created once; props below are pushed in by their own effects.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [notes]);

  useEffect(() => sceneRef.current?.setLidColor(lidColor), [lidColor, ready]);
  useEffect(() => sceneRef.current?.setMood(mood), [mood, ready]);
  useEffect(() => sceneRef.current?.setStory(story), [story, ready]);
  useEffect(() => sceneRef.current?.setStorySource(storySource), [storySource, ready]);

  return (
    <div ref={wrapRef} className={className && /\b(absolute|fixed)\b/.test(className) ? className : `relative ${className ?? ""}`} role="img" aria-label={label}>
      <canvas
        ref={canvasRef}
        aria-hidden="true"
        className={`absolute inset-0 block size-full transition-opacity duration-700 ${ready ? "opacity-100" : "opacity-0"}`}
      />
      {!ready ? (
        <div className={`absolute inset-0 grid place-items-center ${failed ? "" : "animate-pulse"}`}>
          <Bo pose={failed ? "hello" : "idle"} size={150} />
        </div>
      ) : null}
    </div>
  );
}
