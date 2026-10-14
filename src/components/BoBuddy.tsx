import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Bo3D } from "@/components/Bo3D";
import type { BoScene } from "@/lib/bo3d/scene";
import type { MascotController, MascotOptions } from "@/lib/mascot/controller";

/**
 * The little hopping Bo. Mount once per page; he hops between elements marked
 * with data-bo-perch as you scroll. Decorative only: hidden from screen readers
 * and never in the way of clicks.
 */
export function BoBuddy({ followFocus = false, celebrate = false, intro = true }: MascotOptions = {}) {
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const layerRef = useRef<HTMLDivElement | null>(null);
  const ctrlRef = useRef<MascotController | null>(null);
  const sceneRef = useRef<BoScene | null>(null);
  // Portals only exist in the browser; render after hydration.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!mounted) return;
    const wrap = wrapRef.current;
    const layer = layerRef.current;
    if (!wrap || !layer) return;
    let alive = true;
    void import("@/lib/mascot/controller").then(({ MascotController }) => {
      if (!alive) return;
      ctrlRef.current = new MascotController(wrap, layer, { followFocus, celebrate, intro });
      ctrlRef.current.setScene(sceneRef.current);
      if (import.meta.env.DEV) (window as unknown as { __bo?: MascotController }).__bo = ctrlRef.current;
    });
    return () => {
      alive = false;
      ctrlRef.current?.destroy();
      ctrlRef.current = null;
    };
    // Options are read once when Bo arrives on the page.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mounted]);

  if (!mounted) return null;
  return createPortal(
    <div ref={layerRef} aria-hidden="true" className="pointer-events-none absolute top-0 left-0 z-30 h-0 w-0">
      <div ref={wrapRef} className="absolute top-0 left-0 h-[124px] w-[112px] opacity-0 will-change-transform max-sm:h-[96px] max-sm:w-[88px]">
        <Bo3D
          className="absolute inset-0"
          framing="buddy"
          mood="idle"
          label={null}
          placeholder={false}
          onScene={(scene) => {
            sceneRef.current = scene;
            ctrlRef.current?.setScene(scene);
          }}
        />
      </div>
    </div>,
    document.body,
  );
}
