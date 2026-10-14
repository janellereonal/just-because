import { useEffect, useRef, useState } from "react";
import Bo from "@/components/Bo";
import type { BoFraming, BoMood, BoScene } from "@/lib/bo3d/scene";
import type { BoAccessory } from "@/lib/bo3d/accessories";

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
  /** A small theme prop on the lid. */
  accessory?: BoAccessory | null;
  framing?: BoFraming;
  /** Hands over the live scene once Bo is on screen (for poses and hops). */
  onScene?: (scene: BoScene | null) => void;
  /** Shown to screen readers. Pass null when Bo is purely decorative. */
  label?: string | null;
  /** Hide the flat stand-in while loading (the hopping mascot just fades in). */
  placeholder?: boolean;
};

/**
 * Bo in 3D. three.js loads only in the browser and only once Bo is near the
 * screen; until then (or without WebGL) the flat SVG Bo stands in. Pauses
 * when scrolled away to save battery.
 */
export function Bo3D({
  className,
  lidColor = "#F6A5B9",
  mood = "wave",
  notes = false,
  story = null,
  storySource = null,
  accessory = null,
  framing = "stage",
  onScene,
  label = "Bo, the Just Because gift box, waving",
  placeholder = true,
}: Props) {
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const sceneRef = useRef<BoScene | null>(null);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const onSceneRef = useRef(onScene);
  useEffect(() => {
    onSceneRef.current = onScene;
  });

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
        const created = mod.createBoScene(canvas, { lidColor, notes, mood, framing });
        sceneRef.current = created;
        created.setStory(story);
        await created.ready;
        if (disposed) return;
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
      onSceneRef.current?.(null);
    };
    // The scene is created once; props below are pushed in by their own effects.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [notes, framing]);

  useEffect(() => sceneRef.current?.setLidColor(lidColor), [lidColor, ready]);
  useEffect(() => sceneRef.current?.setMood(mood), [mood, ready]);
  useEffect(() => sceneRef.current?.setStory(story), [story, ready]);
  useEffect(() => sceneRef.current?.setStorySource(storySource), [storySource, ready]);
  useEffect(() => sceneRef.current?.setAccessory(accessory), [accessory, ready]);
  useEffect(() => {
    if (ready) onSceneRef.current?.(sceneRef.current);
  }, [ready]);

  return (
    <div
      ref={wrapRef}
      className={className && /\b(absolute|fixed)\b/.test(className) ? className : `relative ${className ?? ""}`}
      {...(label ? { role: "img", "aria-label": label } : { "aria-hidden": true })}
    >
      <canvas
        ref={canvasRef}
        aria-hidden="true"
        className={`absolute inset-0 block size-full transition-opacity duration-700 ${ready ? "opacity-100" : "opacity-0"}`}
      />
      {!ready && placeholder ? (
        <div className={`absolute inset-0 grid place-items-center ${failed ? "" : "animate-pulse"}`}>
          <Bo pose={failed ? "hello" : "idle"} size={150} />
        </div>
      ) : null}
    </div>
  );
}
