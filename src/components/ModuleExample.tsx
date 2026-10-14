import type { ModuleType } from "@/lib/gift";

type Tone = { bg: string; ink: string; accent: string };

const DEFAULT_TONE: Tone = { bg: "#fffdf8", ink: "#2b2724", accent: "#b4552f" };

function Frame({ children, tone }: { children: React.ReactNode; tone: Tone }) {
  return (
    <div
      className="rounded-xl p-3 text-[10px] leading-tight"
      style={{ backgroundColor: tone.bg, color: tone.ink, border: `1px solid ${tone.ink}1a` }}
    >
      {children}
    </div>
  );
}

/** Tiny schematic mockup of what a module looks like on the finished page. */
export function ModuleExample({
  type,
  tone = DEFAULT_TONE,
}: {
  type: ModuleType;
  tone?: Tone;
}) {
  if (type === "letters") {
    return (
      <Frame tone={tone}>
        <p className="italic">“Happy birthday, twin!”</p>
        <p className="mt-2" style={{ color: tone.accent }}>
          Sam
        </p>
      </Frame>
    );
  }
  if (type === "photobooth") {
    return (
      <Frame tone={tone}>
        <div
          className="aspect-[4/3] w-full rounded-md"
          style={{ backgroundColor: `${tone.ink}14` }}
        />
        <div className="mt-2 h-1.5 w-2/3 rounded-full" style={{ backgroundColor: `${tone.ink}1f` }} />
      </Frame>
    );
  }
  if (type === "songs") {
    return (
      <Frame tone={tone}>
        <div className="flex items-center gap-2">
          <div className="size-8 rounded-md" style={{ backgroundColor: `${tone.ink}1a` }} />
          <div className="flex-1">
            <p className="font-medium">Our song</p>
            <div
              className="mt-1 h-1 w-1/2 rounded-full"
              style={{ backgroundColor: `${tone.ink}1f` }}
            />
          </div>
          <span
            className="grid size-5 place-items-center rounded-full text-[8px]"
            style={{ backgroundColor: tone.accent, color: tone.bg }}
          >
            ▶
          </span>
        </div>
      </Frame>
    );
  }
  if (type === "wordcloud") {
    return (
      <Frame tone={tone}>
        <div className="flex flex-wrap items-baseline justify-center gap-x-2 gap-y-1">
          <span className="text-[14px] font-semibold" style={{ color: tone.accent }}>
            kind
          </span>
          <span className="text-[9px]">funny</span>
          <span className="text-[12px]">loyal</span>
          <span className="text-[8px]">warm</span>
          <span className="text-[11px]" style={{ color: tone.accent }}>
            brave
          </span>
        </div>
      </Frame>
    );
  }
  if (type === "voice") {
    return (
      <Frame tone={tone}>
        <div className="flex items-center gap-2">
          <span
            className="grid size-6 place-items-center rounded-full text-[8px]"
            style={{ backgroundColor: tone.accent, color: tone.bg }}
          >
            ▶
          </span>
          <div className="flex flex-1 items-end gap-[2px]">
            {[6, 12, 8, 16, 10, 14, 7, 11, 5, 13, 9, 6].map((h, i) => (
              <span
                key={i}
                className="w-[3px] rounded-full"
                style={{ height: h, backgroundColor: `${tone.ink}33` }}
              />
            ))}
          </div>
        </div>
        <p className="mt-2" style={{ color: tone.accent }}>
          Alex
        </p>
      </Frame>
    );
  }
  if (type === "countdown") {
    return (
      <Frame tone={tone}>
        <p className="text-center text-[18px] font-semibold" style={{ color: tone.accent }}>
          12
        </p>
        <p className="mt-1 text-center tracking-[0.12em] uppercase">days to go</p>
      </Frame>
    );
  }
  if (type === "tree") {
    return (
      <Frame tone={tone}>
        <div className="relative mx-auto h-28 w-24">
          <div className="absolute bottom-0 left-1/2 h-5 w-3 -translate-x-1/2" style={{ backgroundColor: tone.ink }} />
          <div className="absolute inset-x-1 top-1 h-24" style={{ backgroundColor: tone.ink, clipPath: "polygon(50% 0, 100% 100%, 0 100%)", opacity: 0.82 }} />
          {[[48, 22, "★"], [29, 54, "♥"], [66, 62, "●"]].map(([left, top, glyph]) => (
            <span key={String(glyph)} className="absolute grid size-5 place-items-center rounded-full text-[9px]" style={{ left: `${left}%`, top: `${top}%`, backgroundColor: tone.bg, color: tone.accent }}>{glyph}</span>
          ))}
        </div>
      </Frame>
    );
  }
  return (
    <Frame tone={tone}>
      <div className="grid grid-cols-7 gap-[3px]">
        {Array.from({ length: 21 }).map((_, i) => (
          <span
            key={i}
            className="aspect-square rounded-[3px]"
            style={{
              backgroundColor: [3, 9, 14].includes(i) ? tone.accent : `${tone.ink}14`,
            }}
          />
        ))}
      </div>
    </Frame>
  );
}

