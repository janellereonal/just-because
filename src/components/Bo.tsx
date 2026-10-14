import React from "react";

/**
 * Bo, the Just Because mascot, as a still 3D render (public/bo/*.webp, rendered from
 * the same 3D Bo as components/Bo3D). Cheap enough for headers, empty states and
 * loading screens; use Bo3D where Bo should move in real 3D.
 *
 * Usage:
 *   <Bo pose="hello" size={160} />
 *   <Bo pose="delivery" animateKey={submitCount} />   // replays the wiggle when the key changes
 *   <Bo pose="surprise" />                             // plays once: pops up
 *   <Bo pose="published" />                            // plays once: jump
 *
 * Resting poses wink or grin now and then. Honors prefers-reduced-motion (no bounce).
 */

export type BoPose = "idle" | "hello" | "delivery" | "surprise" | "published" | "walk" | "carry";

type Props = {
  pose?: BoPose;
  size?: number;
  className?: string;
  /** Change this value to replay a one-shot animation (e.g. after a form submit). */
  animateKey?: string | number;
  title?: string;
};

type Still = BoPose | "happy";
const src = (still: Still) => `/bo/${still}.webp`;

const MOTION: Record<BoPose, string> = {
  idle: "bo-bob",
  hello: "bo-bob",
  delivery: "bo-wiggle",
  walk: "bo-hop",
  carry: "bo-hop",
  surprise: "bo-pop",
  published: "bo-jump",
};

/** Cute faces a resting Bo flashes now and then. */
const CUTE: Partial<Record<BoPose, Still[]>> = {
  idle: ["hello", "happy"],
  hello: ["happy", "idle"],
};

const css = `
.bo-root{display:inline-block;line-height:0;position:relative}
.bo-root img{width:100%;height:100%;object-fit:contain;user-select:none;-webkit-user-drag:none}
.bo-bob{animation:bo-bob 2.4s ease-in-out infinite;transform-origin:50% 85%}
.bo-wiggle{animation:bo-wiggle .5s ease-in-out 1;transform-origin:50% 85%}
.bo-hop{animation:bo-hop .55s ease-in-out infinite;transform-origin:50% 85%}
.bo-pop{animation:bo-pop .6s cubic-bezier(.3,1.6,.5,1) 1 both;transform-origin:50% 85%}
.bo-jump{animation:bo-jump .9s cubic-bezier(.3,1.4,.5,1) 1 both;transform-origin:50% 85%}
@keyframes bo-bob{0%,100%{transform:translateY(0)}50%{transform:translateY(-3%)}}
@keyframes bo-wiggle{0%,100%{transform:rotate(0)}25%{transform:rotate(-6deg)}75%{transform:rotate(6deg)}}
@keyframes bo-hop{0%,100%{transform:translateY(0) scale(1,1)}40%{transform:translateY(-7%) scale(.97,1.04)}85%{transform:translateY(0) scale(1.04,.95)}}
@keyframes bo-pop{0%{transform:scale(.6,.4)}60%{transform:scale(1.08,.94)}100%{transform:scale(1)}}
@keyframes bo-jump{0%{transform:translateY(0) scale(1.06,.92)}35%{transform:translateY(-16%) scale(.95,1.06)}70%{transform:translateY(0) scale(1.06,.93)}100%{transform:translateY(0) scale(1)}}
@media (prefers-reduced-motion: reduce){.bo-root img{animation:none!important}}
`;

let injected = false;
function useBoStyles() {
  React.useEffect(() => {
    if (injected || typeof document === "undefined") return;
    const s = document.createElement("style");
    s.setAttribute("data-bo", "");
    s.textContent = css;
    document.head.appendChild(s);
    injected = true;
  }, []);
}

/** Now and then swap to a cute face for a moment. */
function useCuteFace(pose: BoPose): Still {
  const [still, setStill] = React.useState<Still>(pose);
  React.useEffect(() => {
    setStill(pose);
    const faces = CUTE[pose];
    if (!faces || typeof window === "undefined") return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    for (const f of faces) new Image().src = src(f);
    let back = 0;
    const tick = window.setInterval(
      () => {
        setStill(faces[(Math.random() * faces.length) | 0]!);
        back = window.setTimeout(() => setStill(pose), 900);
      },
      4200 + Math.random() * 3000,
    );
    return () => {
      window.clearInterval(tick);
      window.clearTimeout(back);
    };
  }, [pose]);
  return still;
}

export default function Bo({ pose = "hello", size = 160, className, animateKey, title }: Props) {
  useBoStyles();
  const still = useCuteFace(pose);
  const label = title ?? "Bo, the Just Because gift mascot";
  return (
    <span className={`bo-root ${className ?? ""}`} style={{ width: size, height: size }}>
      <img key={animateKey} src={src(still)} alt={label} width={size} height={size} draggable={false} decoding="async" className={MOTION[pose]} />
    </span>
  );
}
