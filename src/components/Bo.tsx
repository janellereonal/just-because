import React from "react";

/**
 * Bo, the Just Because mascot, as an animated inline SVG.
 *
 * Usage:
 *   <Bo pose="hello" size={160} />
 *   <Bo pose="delivery" animateKey={submitCount} />   // replays the wiggle when the key changes
 *   <Bo pose="surprise" />                             // plays once: lid pops off
 *   <Bo pose="published" />                            // plays once: jump + confetti
 *
 * Poses: "idle" | "hello" | "delivery" | "surprise" | "published"
 * Honors prefers-reduced-motion (shows the pose still).
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

const INK = "#2B2522";
const TERRA = "#EF7F99"; // pastel redesign: berry-pink lid and ribbon
const CREAM = "#F4EEE3";

const css = `
.bo-root{display:inline-block;line-height:0}
.bo-root svg{overflow:visible}
.bo-root .bo-part{transform-box:view-box}
.bo-bob{animation:bo-bob 2.4s ease-in-out infinite}
.bo-blink{transform-origin:100px 122px;animation:bo-blink 5.2s infinite}
.bo-wave{transform-origin:138px 118px;animation:bo-wave 1.2s ease-in-out 1 both}
.bo-sparks{animation:bo-fade 1.2s ease-in-out infinite alternate}
.bo-wiggle{transform-origin:100px 155px;animation:bo-wiggle .5s ease-in-out 1}
.bo-squash{transform-origin:100px 170px;animation:bo-squash .6s cubic-bezier(.3,1.6,.5,1) 1 both}
.bo-lidpop{transform-origin:100px 85px;animation:bo-lidpop .6s cubic-bezier(.3,1.6,.5,1) .15s 1 both}
.bo-surprise-sparks{animation:bo-sparkin .4s ease-out .5s 1 both}
.bo-jump{animation:bo-jump .9s cubic-bezier(.3,1.5,.5,1) 1 both}
.bo-confetti>*{animation:bo-fall 1.4s ease-in .2s 1 both}
.bo-confetti>*:nth-child(2n){animation-delay:.3s}
.bo-confetti>*:nth-child(3n){animation-delay:.4s}
.bo-hop{animation:bo-hop .7s ease-in-out infinite}
.bo-leg-l{transform-origin:78px 168px;animation:bo-swing .7s ease-in-out infinite}
.bo-leg-r{transform-origin:122px 168px;animation:bo-swing .7s ease-in-out infinite reverse}
@keyframes bo-hop{0%,100%{transform:translateY(0)}25%,75%{transform:translateY(-3px)}50%{transform:translateY(0)}}
@keyframes bo-swing{0%,100%{transform:rotate(15deg)}50%{transform:rotate(-15deg)}}
@keyframes bo-bob{0%,100%{transform:translateY(0)}50%{transform:translateY(-4px)}}
@keyframes bo-blink{0%,94%,100%{transform:scaleY(1)}96%{transform:scaleY(.1)}}
@keyframes bo-wave{0%{transform:rotate(0)}15%{transform:rotate(-20deg)}30%{transform:rotate(15deg)}45%{transform:rotate(-20deg)}60%{transform:rotate(15deg)}75%{transform:rotate(-15deg)}100%{transform:rotate(0)}}
@keyframes bo-fade{from{opacity:.35}to{opacity:1}}
@keyframes bo-wiggle{0%,100%{transform:rotate(0)}25%{transform:rotate(-8deg)}75%{transform:rotate(8deg)}}
@keyframes bo-squash{0%{transform:scale(1,1)}35%{transform:scale(1.06,.92)}100%{transform:scale(1,1)}}
@keyframes bo-lidpop{0%{transform:translateY(24px) rotate(9deg)}100%{transform:translateY(0) rotate(0)}}
@keyframes bo-sparkin{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}
@keyframes bo-jump{0%{transform:translateY(0)}35%{transform:translateY(-16px)}65%{transform:translateY(2px)}100%{transform:translateY(0)}}
@keyframes bo-fall{0%{opacity:0;transform:translateY(-20px) rotate(0)}20%{opacity:1}100%{opacity:0;transform:translateY(60px) rotate(180deg)}}
@media (prefers-reduced-motion: reduce){.bo-root *{animation:none!important}}
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

const stroke = { fill: "none", stroke: INK, strokeLinecap: "round" as const };

function Arm({ d, hx, hy }: { d: string; hx: number; hy: number }) {
  return (
    <>
      <path d={d} {...stroke} strokeWidth={3.4} />
      <circle cx={hx} cy={hy} r={5.5} fill={CREAM} stroke={INK} strokeWidth={2.8} />
    </>
  );
}

function Legs() {
  return (
    <>
      <path d="M78 168 L75 186 M122 168 L125 186" {...stroke} strokeWidth={3.4} />
      <ellipse cx={69} cy={189} rx={9} ry={4.5} fill={INK} />
      <ellipse cx={131} cy={189} rx={9} ry={4.5} fill={INK} />
    </>
  );
}

function WalkingLegs() {
  return (
    <>
      <g className="bo-part bo-leg-l">
        <path d="M78 168 L75 186" {...stroke} strokeWidth={3.4} />
        <ellipse cx={69} cy={189} rx={9} ry={4.5} fill={INK} />
      </g>
      <g className="bo-part bo-leg-r">
        <path d="M122 168 L125 186" {...stroke} strokeWidth={3.4} />
        <ellipse cx={131} cy={189} rx={9} ry={4.5} fill={INK} />
      </g>
    </>
  );
}

function Envelope() {
  return (
    <>
      <rect x={78} y={141} width={44} height={28} rx={3} fill={CREAM} stroke={INK} strokeWidth={3} />
      <path d="M80 143 L100 157 L120 143" {...stroke} strokeWidth={2.6} strokeLinejoin="round" />
      <path d="M100 163 Q92 157 95 153 Q98 151 100 155 Q102 151 105 153 Q108 157 100 163 Z" fill={TERRA} />
    </>
  );
}

function Body({ mouth }: { mouth: "smile" | "o" | "small-o" | "soft" }) {
  return (
    <>
      <path d="M60 95 Q58 132 61 169 L139 169 Q142 132 140 95 Z" fill={CREAM} stroke={INK} strokeWidth={3.4} strokeLinejoin="round" />
      <path d="M100 96 L100 168" fill="none" stroke={TERRA} strokeWidth={7} />
      <g className="bo-part bo-blink">
        <circle cx={82} cy={122} r={3.4} fill={INK} />
        <circle cx={118} cy={122} r={3.4} fill={INK} />
      </g>
      <ellipse cx={71} cy={134} rx={7} ry={4.5} fill={TERRA} opacity={0.85} />
      <ellipse cx={129} cy={134} rx={7} ry={4.5} fill={TERRA} opacity={0.85} />
      {mouth === "smile" && <path d="M92 134 Q100 141 108 134" {...stroke} strokeWidth={3} />}
      {mouth === "soft" && <path d="M92 131 Q100 137 108 131" {...stroke} strokeWidth={3} />}
      {mouth === "o" && <ellipse cx={100} cy={137} rx={6} ry={5} fill={INK} />}
      {mouth === "small-o" && <ellipse cx={100} cy={137} rx={4} ry={5} fill={INK} />}
    </>
  );
}

function Lid() {
  return (
    <>
      <rect x={52} y={75} width={96} height={21} rx={3} fill={TERRA} stroke={INK} strokeWidth={3.4} />
      <path d="M100 74 Q80 50 86 45 Q93 41 100 74 Q107 41 114 45 Q120 50 100 74 Z" fill={TERRA} stroke={INK} strokeWidth={2.8} strokeLinejoin="round" />
      <circle cx={100} cy={73} r={3} fill={INK} />
    </>
  );
}

export default function Bo({ pose = "hello", size = 160, className, animateKey, title }: Props) {
  useBoStyles();
  const label = title ?? "Bo, the Just Because gift mascot";

  let content: React.ReactNode;
  switch (pose) {
    case "hello":
      content = (
        <g className="bo-part bo-bob">
          <Legs />
          <Arm d="M62 118 Q44 130 46 149" hx={47} hy={154} />
          <g className="bo-part bo-wave">
            <Arm d="M138 118 Q158 108 163 88" hx={165} hy={82} />
            <path className="bo-sparks" d="M176 72 L181 67 M179 84 L186 84 M156 70 L153 64" {...stroke} strokeWidth={2.2} />
          </g>
          <Body mouth="smile" />
          <Lid />
        </g>
      );
      break;
    case "delivery":
      content = (
        <g className="bo-part bo-bob">
          <Legs />
          <Body mouth="soft" />
          <Lid />
          <path d="M62 125 Q64 145 80 149" {...stroke} strokeWidth={3.4} />
          <path d="M138 125 Q136 145 120 149" {...stroke} strokeWidth={3.4} />
          <g className="bo-part bo-wiggle" key={animateKey}>
            <Envelope />
          </g>
        </g>
      );
      break;
    case "walk":
      content = (
        <g className="bo-part bo-hop">
          <WalkingLegs />
          <Arm d="M62 118 Q52 138 54 158" hx={55} hy={162} />
          <Arm d="M138 118 Q148 138 146 158" hx={145} hy={162} />
          <Body mouth="smile" />
          <Lid />
        </g>
      );
      break;
    case "carry":
      content = (
        <g className="bo-part bo-hop">
          <WalkingLegs />
          <Body mouth="soft" />
          <Lid />
          <path d="M62 125 Q64 145 80 149" {...stroke} strokeWidth={3.4} />
          <path d="M138 125 Q136 145 120 149" {...stroke} strokeWidth={3.4} />
          <Envelope />
        </g>
      );
      break;
    case "surprise":
      content = (
        <g className="bo-part bo-squash" key={animateKey}>
          <Legs />
          <Arm d="M62 115 Q42 95 50 61" hx={51} hy={56} />
          <Arm d="M138 115 Q158 95 152 51" hx={152} hy={46} />
          <Body mouth="small-o" />
          <g className="bo-part bo-lidpop">
            <g transform="translate(0 -24) rotate(-9 100 85)">
              <Lid />
            </g>
          </g>
          <path className="bo-surprise-sparks" d="M74 87 L68 79 M100 89 L100 81 M126 83 L132 75" fill="none" stroke={TERRA} strokeWidth={2.6} strokeLinecap="round" />
        </g>
      );
      break;
    case "published":
      content = (
        <g key={animateKey}>
          <g className="bo-part bo-jump">
            <Legs />
            <Arm d="M62 115 Q42 100 42 77" hx={42} hy={71} />
            <Arm d="M138 115 Q158 100 158 77" hx={158} hy={71} />
            <Body mouth="o" />
            <Lid />
          </g>
          <g className="bo-confetti">
            <rect x={24} y={43} width={7} height={4} rx={1} fill={TERRA} transform="rotate(-25 28 45)" />
            <rect x={166} y={35} width={7} height={4} rx={1} fill={INK} transform="rotate(30 170 37)" />
            <circle cx={60} cy={27} r={3} fill={INK} />
            <circle cx={142} cy={23} r={3} fill={TERRA} />
            <rect x={94} y={17} width={7} height={4} rx={1} fill={TERRA} transform="rotate(15 98 19)" />
            <circle cx={20} cy={85} r={2.5} fill={TERRA} />
            <circle cx={182} cy={91} r={2.5} fill={INK} />
          </g>
        </g>
      );
      break;
    default:
      content = (
        <g className="bo-part bo-bob">
          <Legs />
          <Arm d="M62 118 Q44 130 46 149" hx={47} hy={154} />
          <Arm d="M138 118 Q156 130 154 149" hx={153} hy={154} />
          <Body mouth="smile" />
          <Lid />
        </g>
      );
  }

  return (
    <span className={`bo-root ${className ?? ""}`} style={{ width: size, height: size }}>
      <svg viewBox="0 0 200 200" width={size} height={size} role="img" aria-label={label}>
        {content}
      </svg>
    </span>
  );
}