/**
 * Where each layout style's object sits, so every opening is a place and not just a
 * thing on a backdrop (the bar is Boarding Pass's sky and Invitation's silk table):
 *
 *   Scrapbook      a walnut craft table under a desk lamp, washi tape and a pencil
 *   Storybook      a bedside at night: a window with the moon, a lamp, a quilt
 *   Comic Issue    a comic shop: halftone wall, speed lines, a long box of other issues
 *   Bento Board    a linen tablecloth in window light, chopsticks, a cup of tea
 *   Gift Hunt      an explorer's desk by candlelight: a compass, coins, a quill
 *   Zine           a photocopier glass: the scan light sweeping, cut-out scraps, staples
 *   Mixtape        a bedroom floor at night: a lava lamp glow, cassette cases, the pencil
 *   Scratch Cards  a corner-shop counter: lucky gold coins, ticket stubs
 *
 * Every scene: a surface, one light that sets the mood, props at three depths (far,
 * table, out-of-focus foreground) that move with the stage's parallax, and one small
 * living thing (dust in the lamp light, a flickering candle, the scan bar). All CSS, so
 * phones stay smooth. Props take the gift's colours where it makes sense.
 */
import { motion } from "motion/react";
import { Layer } from "@/themes/_shared/stage";
import { TEXTURE, TEXTURE_SOFT } from "@/themes/_shared/light";
import type { StyleId } from "@/lib/styles";

export type SceneProps = { primary: string; accent: string; reduced: boolean };

const abs = "pointer-events-none absolute";

/** Specks of dust turning slowly in a beam of light. */
function Motes({
  count = 14,
  color = "255,240,210",
  box,
  reduced,
}: {
  count?: number;
  color?: string;
  box: React.CSSProperties;
  reduced: boolean;
}) {
  const motes = Array.from({ length: count }, (_, i) => ({
    x: (i * 37.7) % 100,
    y: (i * 61.3) % 100,
    s: 1.2 + ((i * 7) % 5) * 0.5,
    d: 7 + ((i * 13) % 9),
  }));
  return (
    <span className={abs} style={box} aria-hidden>
      {motes.map((m, i) => (
        <motion.span
          key={i}
          className="absolute rounded-full"
          style={{
            left: `${m.x}%`,
            top: `${m.y}%`,
            width: m.s,
            height: m.s,
            background: `rgba(${color},.85)`,
            boxShadow: `0 0 ${m.s * 3}px rgba(${color},.6)`,
          }}
          animate={
            reduced ? {} : { x: [0, 14, -8, 0], y: [0, -18, -6, 0], opacity: [0.2, 0.9, 0.5, 0.2] }
          }
          transition={{ duration: m.d, repeat: Infinity, ease: "easeInOut", delay: -i * 0.7 }}
        />
      ))}
    </span>
  );
}

/** A lamp or window light falling on the table. */
function Light({
  at,
  size,
  color,
  blend = "screen",
}: {
  at: string;
  size: string;
  color: string;
  blend?: React.CSSProperties["mixBlendMode"];
}) {
  return (
    <span
      className={`${abs} inset-0`}
      style={{
        background: `radial-gradient(${size} at ${at}, ${color}, transparent 72%)`,
        mixBlendMode: blend,
      }}
      aria-hidden
    />
  );
}

/** The edge of a vignette, so the eye goes to the object. */
function Vignette({ strength = 0.55, tint = "0,0,0" }: { strength?: number; tint?: string }) {
  return (
    <span
      className={`${abs} inset-0`}
      style={{
        background: `radial-gradient(120% 95% at 50% 45%, transparent 48%, rgba(${tint},${strength}))`,
      }}
      aria-hidden
    />
  );
}

/* ------------------------------------------------------------------ props */

function WashiRoll({ color, style }: { color: string; style: React.CSSProperties }) {
  return (
    <span
      className={`${abs} rounded-full`}
      style={{ width: "22cqi", maxWidth: 110, aspectRatio: "1", ...style }}
      aria-hidden
    >
      <span
        className="absolute inset-0 rounded-full"
        style={{
          background: `repeating-linear-gradient(45deg, ${color} 0 6px, color-mix(in oklab, ${color} 70%, #fff) 6px 12px)`,
          boxShadow: "0 10px 18px rgba(40,25,15,.35), inset 0 0 0 1px rgba(0,0,0,.08)",
        }}
      />
      <span
        className="absolute inset-[30%] rounded-full"
        style={{ background: "#E9DFCF", boxShadow: "inset 0 2px 6px rgba(0,0,0,.25)" }}
      />
    </span>
  );
}

function TapeStrip({ color, style }: { color: string; style: React.CSSProperties }) {
  return (
    <span
      className={abs}
      style={{
        width: "30cqi",
        maxWidth: 160,
        height: 22,
        background: `repeating-linear-gradient(90deg, ${color}cc 0 8px, ${color}88 8px 16px)`,
        clipPath: "polygon(2% 0, 98% 6%, 100% 50%, 97% 100%, 1% 94%, 0 50%)",
        boxShadow: "0 2px 4px rgba(0,0,0,.15)",
        ...style,
      }}
      aria-hidden
    />
  );
}

function Pencil({ style, color = "#F2C14E" }: { style: React.CSSProperties; color?: string }) {
  return (
    <span
      className={abs}
      style={{ width: "44cqi", maxWidth: 220, height: 12, ...style }}
      aria-hidden
    >
      <span
        className="absolute inset-y-0 left-[9%] right-[8%]"
        style={{
          background: `linear-gradient(180deg, color-mix(in oklab, ${color} 80%, #fff), ${color} 45%, color-mix(in oklab, ${color} 75%, #000))`,
          boxShadow: "0 6px 10px rgba(0,0,0,.3)",
        }}
      />
      <span
        className="absolute inset-y-0 left-0 w-[10%]"
        style={{
          background: "linear-gradient(90deg,#3A3533 0 30%, #E8C9A0 30%)",
          clipPath: "polygon(0 50%, 100% 0, 100% 100%)",
        }}
      />
      <span
        className="absolute inset-y-0 right-0 w-[8%] rounded-r-[3px]"
        style={{ background: "linear-gradient(90deg,#B9B9B9,#E7E7E7 40%,#E59AA8 40%)" }}
      />
    </span>
  );
}

function Polaroid({ tint, style }: { tint: string; style: React.CSSProperties }) {
  return (
    <span
      className={`${abs} bg-white`}
      style={{
        width: "26cqi",
        maxWidth: 130,
        aspectRatio: "0.86",
        padding: "6% 6% 18%",
        boxShadow: "0 12px 24px rgba(30,20,10,.35)",
        ...style,
      }}
      aria-hidden
    >
      <span
        className="block size-full"
        style={{
          background: `linear-gradient(150deg, color-mix(in oklab, ${tint} 60%, #fff), ${tint})`,
        }}
      />
    </span>
  );
}

function Coin({ style, size = "11cqi" }: { style: React.CSSProperties; size?: string }) {
  return (
    <span
      className={`${abs} rounded-full`}
      style={{
        width: size,
        maxWidth: 58,
        aspectRatio: "1",
        background: "radial-gradient(circle at 35% 30%, #FFF3B8, #E7B53B 45%, #A5741A 80%)",
        boxShadow:
          "0 5px 10px rgba(0,0,0,.4), inset 0 0 0 3px rgba(255,235,160,.5), inset 0 0 0 5px rgba(150,100,20,.35)",
        ...style,
      }}
      aria-hidden
    />
  );
}

function Cassette({ color, style }: { color: string; style: React.CSSProperties }) {
  return (
    <span
      className={`${abs} rounded-[6px]`}
      style={{
        width: "38cqi",
        maxWidth: 190,
        aspectRatio: "1.6",
        background: `linear-gradient(160deg, color-mix(in oklab, ${color} 55%, #222), #1B1820)`,
        boxShadow: "0 14px 24px rgba(0,0,0,.45), inset 0 0 0 1px rgba(255,255,255,.08)",
        ...style,
      }}
      aria-hidden
    >
      <span
        className="absolute inset-x-[8%] top-[10%] h-[34%] rounded-[3px]"
        style={{ background: "#F2EBDD" }}
      />
      <span
        className="absolute inset-x-[22%] top-[56%] h-[22%] rounded-full"
        style={{ background: "#0E0C12", boxShadow: "inset 0 0 0 2px rgba(255,255,255,.08)" }}
      />
    </span>
  );
}

/* ------------------------------------------------------------------ the scenes */

function ScrapbookScene({ primary, accent, reduced }: SceneProps) {
  return (
    <>
      {/* Walnut table, the lamp up and to the left. */}
      <span
        className={`${abs} inset-0`}
        style={{
          backgroundImage: `${TEXTURE.wood}, linear-gradient(180deg, #3B271B, #6A4630 45%, #4A3020)`,
          backgroundSize: "520px 520px, auto",
        }}
        aria-hidden
      />
      <span
        className={`${abs} inset-0`}
        style={{
          background:
            "linear-gradient(180deg, rgba(70,44,28,.55), rgba(96,62,38,.4) 45%, rgba(66,40,24,.55))",
        }}
        aria-hidden
      />
      <Light at="28% 22%" size="70% 55%" color="rgba(255,214,160,.55)" />
      <Light at="55% 52%" size="48% 34%" color="rgba(255,236,205,.35)" />
      <Motes reduced={reduced} box={{ left: "8%", top: "6%", width: "48%", height: "40%" }} />
      <Layer depth={-5} className={`${abs} inset-0`}>
        <TapeStrip color={accent} style={{ left: "-4%", top: "12%", rotate: "-14deg" }} />
        <WashiRoll color={primary} style={{ right: "-5%", top: "8%" }} />
        <Polaroid tint={accent} style={{ left: "-7%", bottom: "16%", rotate: "-12deg" }} />
      </Layer>
      <Layer depth={6} className={`${abs} inset-0`}>
        <Pencil style={{ right: "-8%", bottom: "20%", rotate: "-28deg" }} />
        <WashiRoll color={accent} style={{ left: "6%", top: "72%", width: "16cqi" }} />
      </Layer>
      <Layer depth={22} className={`${abs} inset-0 z-[30]`}>
        <TapeStrip
          color={primary}
          style={{
            right: "-10%",
            bottom: "-1%",
            rotate: "8deg",
            filter: "blur(2.5px)",
            width: "50cqi",
          }}
        />
      </Layer>
      <Vignette strength={0.6} tint="20,10,4" />
    </>
  );
}

function StorybookScene({ accent, reduced }: SceneProps) {
  return (
    <>
      <span
        className={`${abs} inset-0`}
        style={{ background: "linear-gradient(180deg, #171830, #24213D 50%, #2E2440)" }}
        aria-hidden
      />
      {/* The window, with the moon and a few stars. */}
      <Layer depth={-8} className={`${abs} inset-0`}>
        <span
          className={abs}
          style={{
            right: "6%",
            top: "7%",
            width: "40cqi",
            maxWidth: 220,
            aspectRatio: "0.8",
            borderRadius: "48% 48% 6px 6px / 30% 30% 6px 6px",
            background: "linear-gradient(180deg, #1D2C5A, #2F3F78)",
            boxShadow:
              "inset 0 0 0 6px #3A2F3A, inset 0 0 0 9px #4A3D48, 0 0 50px rgba(150,170,255,.25)",
            overflow: "hidden",
          }}
          aria-hidden
        >
          <span
            className="absolute inset-y-0 left-1/2 w-[6px] -translate-x-1/2"
            style={{ background: "#3A2F3A" }}
          />
          <span
            className="absolute inset-x-0 top-[48%] h-[6px]"
            style={{ background: "#3A2F3A" }}
          />
          <span
            className="absolute top-[14%] left-[16%] size-[26%] rounded-full"
            style={{
              background: "radial-gradient(circle at 40% 40%, #FFFBEA, #F2E3B0 60%, #D9C88E)",
              boxShadow: "0 0 30px rgba(255,245,200,.7)",
            }}
          />
          {[
            [70, 18],
            [62, 34],
            [80, 60],
            [24, 66],
            [50, 80],
            [35, 30],
          ].map(([x, y], i) => (
            <motion.span
              key={i}
              className="absolute size-[3px] rounded-full bg-white"
              style={{ left: `${x}%`, top: `${y}%`, boxShadow: "0 0 6px #fff" }}
              animate={reduced ? {} : { opacity: [0.3, 1, 0.3] }}
              transition={{ duration: 2.5 + i * 0.4, repeat: Infinity, delay: i * 0.3 }}
            />
          ))}
        </span>
      </Layer>
      {/* Moonlight across the room, the bedside lamp low on the left. */}
      <span
        className={`${abs} inset-0`}
        style={{
          background: "linear-gradient(200deg, rgba(160,180,255,.16) 10%, transparent 45%)",
          mixBlendMode: "screen",
        }}
        aria-hidden
      />
      <Light at="10% 78%" size="70% 50%" color="rgba(255,190,120,.42)" />
      <Motes
        reduced={reduced}
        color="255,220,170"
        box={{ left: "0%", top: "48%", width: "55%", height: "40%" }}
        count={12}
      />
      {/* The quilt the book is resting on. */}
      <span
        className={`${abs} inset-x-0 bottom-0 h-[34%]`}
        style={{
          background: `linear-gradient(180deg, transparent, color-mix(in oklab, ${accent} 30%, #2A2238) 40%)`,
          backgroundImage: `${TEXTURE_SOFT.linen}, linear-gradient(180deg, transparent, color-mix(in oklab, ${accent} 26%, #2A2238) 40%)`,
          maskImage: "linear-gradient(transparent, #000 40%)",
          WebkitMaskImage: "linear-gradient(transparent, #000 40%)",
        }}
        aria-hidden
      />
      <Vignette strength={0.55} tint="6,6,18" />
    </>
  );
}

function ComicScene({ primary, accent, reduced }: SceneProps) {
  return (
    <>
      <span
        className={`${abs} inset-0`}
        style={{
          background: `linear-gradient(180deg, color-mix(in oklab, ${primary} 70%, #10112A), #14132B)`,
        }}
        aria-hidden
      />
      {/* Speed lines from behind the comic, slowly turning. */}
      <motion.span
        className={`${abs} left-1/2 top-[44%] aspect-square w-[min(180cqi,1100px)] -translate-x-1/2 -translate-y-1/2`}
        style={{
          willChange: "transform",
          background: `repeating-conic-gradient(from 0deg, ${accent}22 0deg 4deg, transparent 4deg 13deg)`,
          maskImage: "radial-gradient(closest-side, transparent 14%, #000 40%, transparent 92%)",
          WebkitMaskImage:
            "radial-gradient(closest-side, transparent 14%, #000 40%, transparent 92%)",
        }}
        animate={reduced ? {} : { rotate: 360 }}
        transition={{ duration: 120, repeat: Infinity, ease: "linear" }}
        aria-hidden
      />
      {/* Ben-day dots, bigger toward the edges like an old print. */}
      <span
        className={`${abs} inset-0`}
        style={{
          background: `radial-gradient(circle, ${accent}55 1.4px, transparent 1.9px) 0 0 / 11px 11px`,
          maskImage: "radial-gradient(70% 60% at 50% 44%, transparent 40%, #000 90%)",
          WebkitMaskImage: "radial-gradient(70% 60% at 50% 44%, transparent 40%, #000 90%)",
        }}
        aria-hidden
      />
      <Light at="50% 40%" size="50% 38%" color="rgba(255,250,230,.28)" />
      {/* The long box: other issues' spines along the bottom. */}
      <Layer depth={8} className={`${abs} inset-x-0 bottom-0 h-[17%]`}>
        <span
          className="absolute inset-x-[-4%] top-0 bottom-0 flex items-stretch gap-[3px]"
          style={{ transform: "perspective(500px) rotateX(38deg)", transformOrigin: "50% 100%" }}
          aria-hidden
        >
          {Array.from({ length: 22 }, (_, i) => (
            <span
              key={i}
              className="flex-1"
              style={{
                background: [accent, "#F4E9D1", primary, "#E84A3C", "#2C5BD8", "#F2C14E"][i % 6],
                boxShadow: "inset -2px 0 0 rgba(0,0,0,.25)",
                marginTop: `${(i * 37) % 9}px`,
              }}
            />
          ))}
        </span>
        <span
          className="absolute inset-x-0 bottom-0 h-[42%]"
          style={{
            background: "linear-gradient(180deg, #6B4A2E, #4A3220)",
            backgroundImage: `${TEXTURE.kraft}, linear-gradient(180deg, #6B4A2E, #4A3220)`,
            boxShadow: "0 -6px 14px rgba(0,0,0,.4)",
          }}
        />
      </Layer>
      <Vignette strength={0.5} tint="6,6,20" />
    </>
  );
}

function BentoScene({ primary, reduced }: SceneProps) {
  return (
    <>
      <span
        className={`${abs} inset-0`}
        style={{
          backgroundColor: "#E9E1D2",
          backgroundImage: `${TEXTURE.linen}, linear-gradient(180deg, #EFE8DB, #E0D6C4)`,
          backgroundSize: "220px 220px, auto",
        }}
        aria-hidden
      />
      {/* Morning light through a window: the frame's shadow falls across the cloth. */}
      <motion.span
        className={`${abs} -inset-[20%]`}
        style={{
          background:
            "repeating-linear-gradient(90deg, transparent 0 22%, rgba(80,60,40,.10) 22% 24%), repeating-linear-gradient(0deg, transparent 0 30%, rgba(80,60,40,.10) 30% 32%)",
          transform: "rotate(-24deg) skewX(-12deg)",
          maskImage: "radial-gradient(60% 50% at 40% 40%, #000, transparent 75%)",
          WebkitMaskImage: "radial-gradient(60% 50% at 40% 40%, #000, transparent 75%)",
        }}
        animate={reduced ? {} : { x: [0, 10, 0] }}
        transition={{ duration: 14, repeat: Infinity, ease: "easeInOut" }}
        aria-hidden
      />
      <Light at="30% 26%" size="80% 60%" color="rgba(255,248,230,.65)" />
      <Layer depth={-4} className={`${abs} inset-0`}>
        {/* A cup of tea, from above. */}
        <span
          className={`${abs} rounded-full`}
          style={{
            right: "4%",
            top: "8%",
            width: "24cqi",
            maxWidth: 120,
            aspectRatio: "1",
            background: "radial-gradient(circle, #9C6B3A 0 52%, #F6F1E8 54% 70%, #E2DACB 72%)",
            boxShadow: "0 10px 20px rgba(60,40,20,.25)",
          }}
          aria-hidden
        />
      </Layer>
      <Layer depth={6} className={`${abs} inset-0`}>
        {/* Chopsticks on a little rest. */}
        <span
          className={abs}
          style={{
            left: "-6%",
            bottom: "17%",
            width: "64cqi",
            maxWidth: 300,
            height: 24,
            rotate: "-8deg",
          }}
          aria-hidden
        >
          {[0, 14].map((y) => (
            <span
              key={y}
              className="absolute left-0 right-0 h-[7px] rounded-full"
              style={{
                top: y,
                background: "linear-gradient(90deg, #6E4A2C, #B5865A 70%, #D8B48A)",
                boxShadow: "0 6px 8px rgba(60,40,20,.3)",
                clipPath: "polygon(0 15%, 100% 35%, 100% 65%, 0 85%)",
              }}
            />
          ))}
          <span
            className="absolute top-[-3px] left-[62%] h-[26px] w-[16px] rounded-[7px]"
            style={{
              background: "linear-gradient(90deg, #E9E4DA, #FFFFFF 45%, #D9D2C4)",
              boxShadow: "0 5px 8px rgba(60,40,20,.25)",
            }}
          />
        </span>
        {/* A folded cloth napkin in a soft version of the gift's colour. */}
        <span
          className={abs}
          style={{
            right: "-8%",
            bottom: "6%",
            width: "34cqi",
            maxWidth: 170,
            aspectRatio: "1.15",
            rotate: "-12deg",
            borderRadius: 6,
            background: `linear-gradient(160deg, color-mix(in oklab, ${primary} 28%, #F7F2EA), color-mix(in oklab, ${primary} 40%, #EDE5D8))`,
            boxShadow: "0 10px 18px rgba(60,40,20,.22)",
          }}
          aria-hidden
        >
          <span
            className="absolute inset-y-0 left-[46%] w-[2px]"
            style={{ background: "linear-gradient(90deg, rgba(0,0,0,.08), rgba(255,255,255,.5))" }}
          />
          <span
            className="absolute inset-x-0 top-[48%] h-[2px]"
            style={{
              background: "linear-gradient(180deg, rgba(0,0,0,.07), rgba(255,255,255,.45))",
            }}
          />
          <span
            className="absolute inset-0 rounded-[inherit]"
            style={{ backgroundImage: TEXTURE_SOFT.linen, backgroundSize: "120px 120px" }}
          />
        </span>
      </Layer>
      <Vignette strength={0.25} tint="80,60,40" />
    </>
  );
}

function HuntScene({ reduced }: SceneProps) {
  return (
    <>
      <span
        className={`${abs} inset-0`}
        style={{
          backgroundImage: `${TEXTURE.wood}, linear-gradient(180deg, #24180F, #3A2617 45%, #2A1C12)`,
          backgroundSize: "520px 520px, auto",
        }}
        aria-hidden
      />
      <span
        className={`${abs} inset-0`}
        style={{
          background:
            "linear-gradient(180deg, rgba(36,24,15,.55), rgba(58,38,23,.4) 45%, rgba(42,28,18,.6))",
        }}
        aria-hidden
      />
      {/* The candle: warm, low left, flickering. */}
      <motion.span
        className={`${abs} inset-0`}
        style={{
          background: "radial-gradient(75% 60% at 18% 82%, rgba(255,170,80,.55), transparent 70%)",
          mixBlendMode: "screen",
        }}
        animate={reduced ? {} : { opacity: [0.85, 1, 0.8, 0.95, 0.88, 1, 0.85] }}
        transition={{ duration: 3.2, repeat: Infinity, ease: "easeInOut" }}
        aria-hidden
      />
      <Layer depth={-6} className={`${abs} inset-0`}>
        {/* A faded compass rose inked on an old chart. */}
        <span
          className={`${abs} rounded-full`}
          style={{
            right: "-14%",
            top: "4%",
            width: "62cqi",
            maxWidth: 320,
            aspectRatio: "1",
            background:
              "repeating-conic-gradient(rgba(240,215,170,.16) 0 2deg, transparent 2deg 22.5deg), radial-gradient(circle, transparent 46%, rgba(240,215,170,.18) 47% 48%, transparent 49% 62%, rgba(240,215,170,.14) 63% 64%, transparent 65%)",
          }}
          aria-hidden
        />
      </Layer>
      <Layer depth={6} className={`${abs} inset-0`}>
        {/* A brass compass. */}
        <span
          className={`${abs} rounded-full`}
          style={{
            left: "4%",
            top: "10%",
            width: "22cqi",
            maxWidth: 110,
            aspectRatio: "1",
            background: "radial-gradient(circle, #F1E6CC 0 58%, #C89A45 60% 72%, #8C6420 74%)",
            boxShadow: "0 10px 18px rgba(0,0,0,.5)",
          }}
          aria-hidden
        >
          <motion.span
            className="absolute left-1/2 top-[18%] h-[64%] w-[10%] -translate-x-1/2"
            style={{
              background: "linear-gradient(180deg, #C2362B 50%, #2B2522 50%)",
              clipPath: "polygon(50% 0, 100% 50%, 50% 100%, 0 50%)",
            }}
            animate={reduced ? {} : { rotate: [-14, 10, -6, 4, -2] }}
            transition={{ duration: 6, repeat: Infinity, repeatType: "mirror", ease: "easeInOut" }}
          />
        </span>
        <Coin style={{ right: "10%", bottom: "18%" }} />
        <Coin style={{ right: "4%", bottom: "13%", rotate: "20deg" }} size="9cqi" />
        {/* A quill. */}
        <span
          className={abs}
          style={{
            left: "-4%",
            bottom: "8%",
            width: "46cqi",
            maxWidth: 230,
            height: 24,
            rotate: "-20deg",
            background: "linear-gradient(180deg, #F4EEE0, #CFC4AE)",
            clipPath: "polygon(0 50%, 22% 10%, 100% 40%, 100% 60%, 22% 90%)",
            boxShadow: "0 8px 12px rgba(0,0,0,.35)",
            opacity: 0.9,
          }}
          aria-hidden
        />
      </Layer>
      <Vignette strength={0.7} tint="8,5,2" />
    </>
  );
}

function ZineScene({ accent, reduced }: SceneProps) {
  return (
    <>
      {/* The copier glass: cool grey, the scan light sweeping under it now and then. */}
      <span
        className={`${abs} inset-0`}
        style={{
          backgroundColor: "#D7D5CF",
          backgroundImage: `radial-gradient(circle, rgba(0,0,0,.08) 1px, transparent 1.4px), radial-gradient(60% 50% at 50% 45%, #EEEBE4, transparent 75%), ${TEXTURE_SOFT.paper}`,
          backgroundSize: "6px 6px, auto, 260px 260px",
        }}
        aria-hidden
      />
      {!reduced ? (
        <motion.span
          className={`${abs} inset-y-0 w-[22%]`}
          style={{
            background:
              "linear-gradient(90deg, transparent, rgba(190,255,230,.35), rgba(255,255,255,.55), rgba(190,255,230,.35), transparent)",
            mixBlendMode: "screen",
          }}
          initial={{ left: "-25%" }}
          animate={{ left: ["-25%", "105%"] }}
          transition={{ duration: 2.6, repeat: Infinity, repeatDelay: 4.5, ease: [0.4, 0, 0.6, 1] }}
          aria-hidden
        />
      ) : null}
      <Layer depth={-5} className={`${abs} inset-0`}>
        {/* Cut-out letters and scraps waiting to be glued in. */}
        {[
          ["Z", "#111", "#FFF", 8, 10, -10],
          ["!", "#FFD23F", "#111", 82, 14, 12],
          ["X", accent, "#FFF", 12, 74, 8],
          ["♥", "#FFF", "#C2366B", 84, 70, -14],
        ].map(([ch, bg, fg, x, y, r], i) => (
          <span
            key={i}
            className={`${abs} grid place-items-center font-black`}
            style={{
              left: `${x}%`,
              top: `${y}%`,
              width: "11cqi",
              maxWidth: 54,
              aspectRatio: "0.9",
              background: bg as string,
              color: fg as string,
              rotate: `${r}deg`,
              fontFamily: i % 2 ? "Georgia, serif" : "var(--jb-display)",
              fontSize: "clamp(18px,6cqi,30px)",
              boxShadow: "2px 3px 0 rgba(0,0,0,.25)",
            }}
            aria-hidden
          >
            {ch as string}
          </span>
        ))}
      </Layer>
      <Layer depth={7} className={`${abs} inset-0`}>
        {/* Loose staples. */}
        {[
          [22, 88, 30],
          [70, 86, -20],
          [90, 40, 70],
        ].map(([x, y, r], i) => (
          <span
            key={i}
            className={abs}
            style={{
              left: `${x}%`,
              top: `${y}%`,
              width: 18,
              height: 6,
              rotate: `${r}deg`,
              borderTop: "2px solid #8E8E8E",
              borderLeft: "2px solid #8E8E8E",
              borderRight: "2px solid #8E8E8E",
            }}
            aria-hidden
          />
        ))}
      </Layer>
      <Vignette strength={0.28} tint="40,40,40" />
    </>
  );
}

function MixtapeScene({ primary, accent, reduced }: SceneProps) {
  return (
    <>
      <span
        className={`${abs} inset-0`}
        style={{
          backgroundImage: `${TEXTURE_SOFT.linen}, linear-gradient(180deg, #1E1630, #2C1F3E 55%, #241A33)`,
          backgroundSize: "220px 220px, auto",
        }}
        aria-hidden
      />
      {/* A lava lamp off to the side: the glow breathes in the gift's colours. */}
      <motion.span
        className={`${abs} inset-0`}
        style={{
          background: `radial-gradient(60% 45% at 8% 20%, ${accent}66, transparent 70%)`,
          mixBlendMode: "screen",
        }}
        animate={reduced ? {} : { opacity: [0.7, 1, 0.75] }}
        transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
        aria-hidden
      />
      <motion.span
        className={`${abs} inset-0`}
        style={{
          background: `radial-gradient(55% 40% at 96% 84%, ${primary}55, transparent 70%)`,
          mixBlendMode: "screen",
        }}
        animate={reduced ? {} : { opacity: [1, 0.7, 1] }}
        transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}
        aria-hidden
      />
      <Layer depth={-5} className={`${abs} inset-0`}>
        <Cassette color={accent} style={{ left: "-12%", top: "8%", rotate: "-16deg" }} />
        <Cassette
          color={primary}
          style={{ right: "-14%", top: "16%", rotate: "12deg", opacity: 0.85 }}
        />
      </Layer>
      <Layer depth={7} className={`${abs} inset-0`}>
        {/* The pencil, for winding the tape back. */}
        <Pencil style={{ left: "-8%", bottom: "14%", rotate: "14deg" }} color="#E6C35A" />
        {/* A headphone cord curling across the floor. */}
        <span
          className={abs}
          style={{
            right: "-6%",
            bottom: "6%",
            width: "46cqi",
            maxWidth: 220,
            aspectRatio: "1.6",
            borderRadius: "50%",
            border: "3px solid rgba(20,16,26,.9)",
            borderTopColor: "transparent",
            borderLeftColor: "transparent",
            rotate: "-18deg",
            filter: "drop-shadow(0 4px 4px rgba(0,0,0,.4))",
          }}
          aria-hidden
        />
      </Layer>
      <Vignette strength={0.6} tint="8,4,14" />
    </>
  );
}

function ScratchScene({ accent, reduced }: SceneProps) {
  return (
    <>
      {/* The counter: deep green with a varnished edge, a shop light above. */}
      <span
        className={`${abs} inset-0`}
        style={{
          backgroundImage: `${TEXTURE_SOFT.paper}, linear-gradient(180deg, #123A33, #1B5045 50%, #123A33)`,
          backgroundSize: "260px 260px, auto",
        }}
        aria-hidden
      />
      <span
        className={`${abs} inset-0`}
        style={{
          background:
            "repeating-linear-gradient(90deg, rgba(255,255,255,.025) 0 2px, transparent 2px 7px)",
        }}
        aria-hidden
      />
      <Light at="50% 18%" size="70% 52%" color="rgba(255,250,220,.32)" />
      {/* Light glinting along the counter edge. */}
      {!reduced ? (
        <motion.span
          className={`${abs} inset-x-0 bottom-[12%] h-[2px]`}
          style={{
            background: "linear-gradient(90deg, transparent, rgba(255,240,190,.8), transparent)",
            backgroundSize: "40% 100%",
            backgroundRepeat: "no-repeat",
          }}
          animate={{ backgroundPositionX: ["-40%", "140%"] }}
          transition={{ duration: 3.5, repeat: Infinity, repeatDelay: 3 }}
          aria-hidden
        />
      ) : null}
      <Layer depth={-4} className={`${abs} inset-0`}>
        {/* Ticket stubs from earlier tries. */}
        {[
          [-6, 8, -18],
          [78, 6, 14],
        ].map(([x, y, r], i) => (
          <span
            key={i}
            className={abs}
            style={{
              left: `${x}%`,
              top: `${y}%`,
              width: "30cqi",
              maxWidth: 150,
              aspectRatio: "1.8",
              rotate: `${r}deg`,
              background: `linear-gradient(140deg, color-mix(in oklab, ${accent} 50%, #fff), ${accent})`,
              opacity: 0.32,
              borderRadius: 6,
              boxShadow: "0 8px 14px rgba(0,0,0,.35)",
              maskImage:
                "radial-gradient(circle at 0 50%, transparent 8px, #000 9px), radial-gradient(circle at 100% 50%, transparent 8px, #000 9px)",
              WebkitMaskComposite: "source-in",
              maskComposite: "intersect",
            }}
            aria-hidden
          />
        ))}
      </Layer>
      <Layer depth={7} className={`${abs} inset-0`}>
        <Coin style={{ left: "8%", bottom: "16%" }} />
        <Coin style={{ left: "16%", bottom: "12%", rotate: "30deg" }} size="9cqi" />
        <Coin style={{ right: "10%", bottom: "20%" }} size="8cqi" />
      </Layer>
      <Vignette strength={0.55} tint="2,12,10" />
    </>
  );
}

export const SCENES: Partial<Record<StyleId, (p: SceneProps) => React.ReactNode>> = {
  scrapbook: ScrapbookScene,
  storybook: StorybookScene,
  comic: ComicScene,
  bento: BentoScene,
  hunt: HuntScene,
  zine: ZineScene,
  mixtape: MixtapeScene,
  scratch: ScratchScene,
};
