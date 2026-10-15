import { useEffect, useRef, useState, type ReactNode } from "react";
import { Laptop, Smartphone } from "lucide-react";

export type PreviewDevice = "phone" | "laptop";

/** A real laptop screen: the gift lays out at this width, then shrinks to fit. */
export const LAPTOP_W = 1280;
export const LAPTOP_H = 800;
export const PHONE_W = 390;

/** Phone / Laptop switch for any gift preview. */
export function DeviceToggle({
  value,
  onChange,
  size = "md",
  className = "",
}: {
  value: PreviewDevice;
  onChange: (next: PreviewDevice) => void;
  size?: "sm" | "md";
  className?: string;
}) {
  const btn = size === "sm" ? "min-h-8 px-2.5 text-[11px]" : "min-h-10 px-3.5 text-sm";
  const icon = size === "sm" ? "size-3.5" : "size-4";
  return (
    <div
      role="radiogroup"
      aria-label="Preview on"
      className={`inline-flex gap-0.5 rounded-full bg-white/60 p-0.5 ring-1 ring-ink/10 backdrop-blur ${className}`}
    >
      {(
        [
          ["phone", "Phone", Smartphone],
          ["laptop", "Laptop", Laptop],
        ] as const
      ).map(([id, label, Icon]) => (
        <button
          key={id}
          type="button"
          role="radio"
          aria-checked={value === id}
          onClick={() => onChange(id)}
          className={`inline-flex items-center gap-1.5 rounded-full font-medium transition-colors ${btn} ${
            value === id ? "bg-ink text-cream" : "text-ink/70 hover:bg-white/70"
          }`}
        >
          <Icon className={icon} aria-hidden="true" />
          {label}
        </button>
      ))}
    </div>
  );
}

function useBoxSize<T extends HTMLElement>() {
  const ref = useRef<T | null>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const measure = () => setSize({ w: el.clientWidth, h: el.clientHeight });
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    measure();
    return () => ro.disconnect();
  }, []);
  return [ref, size] as const;
}

/**
 * A gift preview in a device frame. The screen is a containing block for
 * position:fixed (layout containment), so sheets, covers and confetti inside a
 * gift stay inside the screen instead of covering the whole page.
 *
 * - phone: up to 390px wide, `phoneHeight` tall (any CSS length).
 * - laptop: the gift lays out at a real 1280x800 and is scaled down to fit the
 *   available width (`fit="width"`) or both width and height (`fit="contain"`).
 *
 * `children` scroll inside the screen. `overlay` sits above the scroller and
 * doesn't scroll (use it for the opening animation).
 */
export function DevicePreview({
  device,
  children,
  overlay,
  phoneHeight = "min(720px, 72svh)",
  fit = "width",
  scrollLabel,
  scrollRef,
  frame = true,
  className = "",
}: {
  device: PreviewDevice;
  children: ReactNode;
  overlay?: ReactNode;
  phoneHeight?: string;
  fit?: "width" | "contain";
  scrollLabel?: string;
  scrollRef?: React.Ref<HTMLDivElement>;
  /** Draw the phone/laptop body. Off for a plain rounded screen. */
  frame?: boolean;
  className?: string;
}) {
  const [boxRef, box] = useBoxSize<HTMLDivElement>();

  const screen = (
    <>
      <div
        ref={scrollRef}
        className="absolute inset-0 overflow-x-hidden overflow-y-auto overscroll-contain"
        tabIndex={scrollLabel ? 0 : undefined}
        aria-label={scrollLabel}
        role={scrollLabel ? "region" : undefined}
      >
        {children}
      </div>
      {overlay}
    </>
  );

  if (device === "phone") {
    return (
      <div ref={boxRef} className={`relative mx-auto w-full max-w-[406px] ${className}`}>
        <div
          className={
            frame
              ? "relative rounded-[44px] bg-ink p-[8px] shadow-[0_30px_60px_-30px_rgba(43,37,34,0.6)]"
              : "relative"
          }
        >
          {frame ? (
            <span
              aria-hidden="true"
              className="absolute top-[14px] left-1/2 z-20 h-[18px] w-[92px] -translate-x-1/2 rounded-full bg-ink"
            />
          ) : null}
          <div
            className={`jb-screen relative overflow-hidden bg-paper ${frame ? "rounded-[36px]" : "rounded-[28px]"}`}
            style={{ height: phoneHeight, contain: "layout paint" }}
          >
            {screen}
          </div>
        </div>
      </div>
    );
  }

  // Laptop: lay out at 1280x800 and scale to the box.
  const bezel = frame ? 14 : 0;
  const availW = Math.max(0, box.w - bezel * 2);
  const availH = fit === "contain" ? Math.max(0, box.h - bezel * 2 - (frame ? 26 : 0)) : Infinity;
  const scale = availW > 0 ? Math.min(availW / LAPTOP_W, availH / LAPTOP_H, 1) : 0;
  const screenW = LAPTOP_W * scale;
  const screenH = LAPTOP_H * scale;

  return (
    <div
      ref={boxRef}
      className={`relative w-full ${fit === "contain" ? "h-full" : ""} ${className}`}
    >
      <div className="mx-auto flex flex-col items-center" style={{ width: screenW + bezel * 2 }}>
        <div
          className={frame ? "relative rounded-t-[18px] bg-ink shadow-[0_30px_60px_-30px_rgba(43,37,34,0.55)]" : "relative"}
          style={{ padding: bezel }}
        >
          {frame ? (
            <span
              aria-hidden="true"
              className="absolute top-[5px] left-1/2 size-[5px] -translate-x-1/2 rounded-full bg-white/25"
            />
          ) : null}
          <div
            className="relative overflow-hidden rounded-[4px] bg-paper"
            style={{ width: screenW, height: screenH, visibility: scale ? "visible" : "hidden" }}
          >
            <div
              className="jb-screen absolute top-0 left-0 origin-top-left"
              style={{
                width: LAPTOP_W,
                height: LAPTOP_H,
                transform: `scale(${scale})`,
                contain: "layout paint",
              }}
            >
              {screen}
            </div>
          </div>
        </div>
        {frame ? (
          <div aria-hidden="true" className="relative h-[14px]" style={{ width: screenW + bezel * 2 + 56 }}>
            <div className="absolute inset-x-0 top-0 h-[10px] rounded-b-[14px] bg-gradient-to-b from-[#cfc6c1] to-[#a99f99] shadow-[0_10px_20px_-10px_rgba(43,37,34,0.6)]" />
            <div className="absolute top-0 left-1/2 h-[5px] w-[18%] -translate-x-1/2 rounded-b-md bg-[#9a908a]" />
          </div>
        ) : null}
      </div>
    </div>
  );
}
