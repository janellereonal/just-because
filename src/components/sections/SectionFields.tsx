/**
 * Form fields for the newer sections on the contribute page (and the
 * creator's own notes). Controlled: the page keeps `data`, `text` and `file`.
 */
import { useEffect, useRef, useState } from "react";
import { SECTION_COPY } from "@/copy/strings";
import { OPEN_WHEN_PROMPTS, SUPERLATIVE_PROMPTS, type NewSectionType } from "@/lib/sections";
import { toLocalInput } from "@/lib/time";
import { noteTextLimit } from "@/lib/limits";
import { CharCount } from "@/components/ui/CharCount";

type Props = {
  type: NewSectionType;
  data: Record<string, unknown>;
  onData: (next: Record<string, unknown>) => void;
  text: string;
  onText: (v: string) => void;
  file: File | null;
  onFile: (f: File | null) => void;
  fieldStyle: React.CSSProperties;
  accent: string;
  onAccent: string;
};

const label = "mt-4 block text-sm font-medium";
const input = "mt-2 w-full rounded-xl px-4 py-3 text-sm outline-none";

export function SectionFields(p: Props) {
  const set = (k: string, v: unknown) => p.onData({ ...p.data, [k]: v });
  const textMax = noteTextLimit(p.type);
  const count = <CharCount value={p.text} max={textMax} className="mt-1 block text-right" />;
  const s = (k: string) => (typeof p.data[k] === "string" ? (p.data[k] as string) : "");
  const chips = (list: string[], key: string) => (
    <div className="mt-2 flex flex-wrap gap-1.5">
      {list.map((x) => (
        <button
          key={x}
          type="button"
          onClick={() => set(key, x)}
          className="rounded-full px-3 py-1.5 text-xs"
          style={s(key) === x ? { background: p.accent, color: p.onAccent } : { ...p.fieldStyle }}
        >
          {x}
        </button>
      ))}
    </div>
  );

  switch (p.type) {
    case "openwhen":
      return (
        <>
          <label className={label}>{SECTION_COPY.openwhen.whenLabel}…</label>
          <input
            value={s("when")}
            maxLength={80}
            onChange={(e) => set("when", e.target.value)}
            placeholder={SECTION_COPY.openwhen.whenPlaceholder}
            className={input}
            style={p.fieldStyle}
          />
          {chips(OPEN_WHEN_PROMPTS, "when")}
          <label className={label}>The letter</label>
          <textarea
            rows={5}
            value={p.text}
            maxLength={textMax}
            onChange={(e) => p.onText(e.target.value)}
            placeholder={SECTION_COPY.openwhen.textPlaceholder}
            className={input}
            style={p.fieldStyle}
          />
          {count}
        </>
      );
    case "capsule": {
      const min = toLocalInput(new Date(Date.now() + 86400000).toISOString());
      return (
        <>
          <label className={label}>{SECTION_COPY.capsule.dateLabel}</label>
          <input
            type="datetime-local"
            min={min}
            value={toLocalInput(s("unlock_at") || null)}
            onChange={(e) =>
              set("unlock_at", e.target.value ? new Date(e.target.value).toISOString() : "")
            }
            className={input}
            style={p.fieldStyle}
          />
          <div className="mt-2 flex flex-wrap gap-1.5">
            {[
              ["In a month", 30],
              ["In 6 months", 182],
              ["In a year", 365],
              ["In 5 years", 1826],
            ].map(([l, days]) => (
              <button
                key={l as string}
                type="button"
                onClick={() =>
                  set("unlock_at", new Date(Date.now() + (days as number) * 86400000).toISOString())
                }
                className="rounded-full px-3 py-1.5 text-xs"
                style={p.fieldStyle}
              >
                {l}
              </button>
            ))}
          </div>
          <p className="mt-1 text-xs opacity-70">
            It stays locked until then, in their own time zone.
          </p>
          <label className={label}>Your note</label>
          <textarea
            rows={5}
            value={p.text}
            maxLength={textMax}
            onChange={(e) => p.onText(e.target.value)}
            placeholder={SECTION_COPY.capsule.textPlaceholder}
            className={input}
            style={p.fieldStyle}
          />
          {count}
          <FilePick
            accept="image/*"
            label="Add a photo (optional)"
            file={p.file}
            onFile={p.onFile}
            style={p.fieldStyle}
          />
        </>
      );
    }
    case "superlatives":
      return (
        <>
          <label className={label}>{SECTION_COPY.superlatives.awardLabel}</label>
          <input
            value={s("award")}
            maxLength={90}
            onChange={(e) => set("award", e.target.value)}
            placeholder={SECTION_COPY.superlatives.awardPlaceholder}
            className={input}
            style={p.fieldStyle}
          />
          <p className="mt-3 text-xs opacity-70">{SECTION_COPY.superlatives.pickOne}</p>
          {chips(SUPERLATIVE_PROMPTS, "award")}
          <label className={label}>Why?</label>
          <input
            value={p.text}
            maxLength={textMax}
            onChange={(e) => p.onText(e.target.value)}
            placeholder={SECTION_COPY.superlatives.reasonPlaceholder}
            className={input}
            style={p.fieldStyle}
          />
          {count}
        </>
      );
    case "quiz": {
      const wrong = Array.isArray(p.data["wrong"]) ? (p.data["wrong"] as string[]) : ["", ""];
      return (
        <>
          <label className={label}>{SECTION_COPY.quiz.questionLabel}</label>
          <input
            value={s("question")}
            maxLength={140}
            onChange={(e) => set("question", e.target.value)}
            placeholder={SECTION_COPY.quiz.questionPlaceholder}
            className={input}
            style={p.fieldStyle}
          />
          <label className={label}>{SECTION_COPY.quiz.answerLabel}</label>
          <input
            value={s("answer")}
            maxLength={80}
            onChange={(e) => set("answer", e.target.value)}
            className={input}
            style={p.fieldStyle}
          />
          <label className={label}>{SECTION_COPY.quiz.wrongLabel}</label>
          {[0, 1, 2].map((i) => (
            <input
              key={i}
              value={wrong[i] ?? ""}
              maxLength={80}
              onChange={(e) => {
                const next = [...wrong];
                next[i] = e.target.value;
                set("wrong", next);
              }}
              placeholder={i === 2 ? "One more (optional)" : `Wrong answer ${i + 1}`}
              className={input}
              style={p.fieldStyle}
            />
          ))}
        </>
      );
    }
    case "map":
      return (
        <>
          <label className={label}>{SECTION_COPY.map.placeLabel}</label>
          <input
            value={s("place")}
            maxLength={80}
            onChange={(e) => set("place", e.target.value)}
            placeholder={SECTION_COPY.map.placePlaceholder}
            className={input}
            style={p.fieldStyle}
          />
          <label className={label}>The memory</label>
          <textarea
            rows={4}
            value={p.text}
            maxLength={textMax}
            onChange={(e) => p.onText(e.target.value)}
            placeholder={SECTION_COPY.map.textPlaceholder}
            className={input}
            style={p.fieldStyle}
          />
          {count}
        </>
      );
    case "coupons":
      return (
        <>
          <label className={label}>{SECTION_COPY.coupons.titleLabel}</label>
          <input
            value={s("title")}
            maxLength={60}
            onChange={(e) => set("title", e.target.value)}
            placeholder={SECTION_COPY.coupons.titlePlaceholder}
            className={input}
            style={p.fieldStyle}
          />
          <label className={label}>{SECTION_COPY.coupons.fineLabel}</label>
          <input
            value={s("fine_print")}
            maxLength={140}
            onChange={(e) => set("fine_print", e.target.value)}
            placeholder={SECTION_COPY.coupons.finePlaceholder}
            className={input}
            style={p.fieldStyle}
          />
        </>
      );
    case "video":
      return (
        <>
          <FilePick
            accept="video/mp4,video/quicktime,video/webm"
            label={SECTION_COPY.video.pick}
            hint={SECTION_COPY.video.hint}
            file={p.file}
            onFile={p.onFile}
            style={p.fieldStyle}
            video
          />
          <label className={label}>Caption</label>
          <input
            value={p.text}
            maxLength={textMax}
            onChange={(e) => p.onText(e.target.value)}
            placeholder={SECTION_COPY.video.textPlaceholder}
            className={input}
            style={p.fieldStyle}
          />
          {count}
        </>
      );
    case "doodle":
      return (
        <>
          <label className={label}>{SECTION_COPY.doodle.prompt}</label>
          <DoodlePad onFile={p.onFile} accent={p.accent} style={p.fieldStyle} />
          <label className={label}>Sign it</label>
          <input
            value={p.text}
            maxLength={textMax}
            onChange={(e) => p.onText(e.target.value)}
            placeholder={SECTION_COPY.doodle.textPlaceholder}
            className={input}
            style={p.fieldStyle}
          />
          {count}
        </>
      );
  }
}

function FilePick({
  accept,
  label: l,
  hint,
  file,
  onFile,
  style,
  video = false,
}: {
  accept: string;
  label: string;
  hint?: string;
  file: File | null;
  onFile: (f: File | null) => void;
  style: React.CSSProperties;
  video?: boolean;
}) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    if (!file) return setUrl(null);
    const u = URL.createObjectURL(file);
    setUrl(u);
    return () => URL.revokeObjectURL(u);
  }, [file]);
  return (
    <label
      className="mt-4 flex cursor-pointer flex-col items-center gap-2 rounded-2xl border-2 border-dashed px-4 py-6 text-center text-sm"
      style={{ borderColor: `${String(style.color ?? "#000")}33` }}
    >
      <input
        type="file"
        accept={accept}
        className="sr-only"
        onChange={(e) => onFile(e.target.files?.[0] ?? null)}
      />
      {file && url ? (
        video ? (
          <video src={url} controls playsInline className="max-h-48 w-full rounded-xl" />
        ) : (
          <img src={url} alt="" className="h-24 w-24 rounded-xl object-cover" />
        )
      ) : null}
      <span className="font-medium">{file ? file.name : l}</span>
      {hint && !file ? <span className="text-xs opacity-70">{hint}</span> : null}
      {file ? <span className="underline opacity-70">Change</span> : null}
    </label>
  );
}

/** A small drawing pad. Each finished stroke updates the PNG the form will upload. */
function DoodlePad({
  onFile,
  accent,
  style,
}: {
  onFile: (f: File | null) => void;
  accent: string;
  style: React.CSSProperties;
}) {
  const ref = useRef<HTMLCanvasElement | null>(null);
  const strokes = useRef<{ color: string; w: number; pts: [number, number][] }[]>([]);
  const drawing = useRef(false);
  const [color, setColor] = useState("#2B2522");
  const [count, setCount] = useState(0);
  const colors = ["#2B2522", accent, "#E8577E", "#2F6FA8", "#3E9C6B", "#F2B233"];

  function redraw() {
    const c = ref.current;
    const ctx = c?.getContext("2d");
    if (!c || !ctx) return;
    ctx.fillStyle = "#FFFEFA";
    ctx.fillRect(0, 0, c.width, c.height);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    for (const s of strokes.current) {
      ctx.strokeStyle = s.color;
      ctx.lineWidth = s.w;
      ctx.beginPath();
      s.pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
      if (s.pts.length === 1) ctx.lineTo(s.pts[0]![0] + 0.1, s.pts[0]![1]);
      ctx.stroke();
    }
  }
  useEffect(redraw, []);

  function point(e: React.PointerEvent): [number, number] {
    const c = ref.current!;
    const r = c.getBoundingClientRect();
    return [
      ((e.clientX - r.left) / r.width) * c.width,
      ((e.clientY - r.top) / r.height) * c.height,
    ];
  }
  function commit() {
    setCount(strokes.current.length);
    if (!strokes.current.length) return onFile(null);
    ref.current?.toBlob(
      (b) => b && onFile(new File([b], "doodle.png", { type: "image/png" })),
      "image/png",
    );
  }

  return (
    <div className="mt-2">
      <canvas
        ref={ref}
        width={600}
        height={600}
        className="aspect-square w-full touch-none rounded-2xl"
        style={{
          boxShadow: `inset 0 0 0 1px ${String(style.color ?? "#000")}22`,
          cursor: "crosshair",
        }}
        aria-label="Drawing pad"
        onPointerDown={(e) => {
          (e.currentTarget as HTMLCanvasElement).setPointerCapture(e.pointerId);
          drawing.current = true;
          strokes.current.push({ color, w: 9, pts: [point(e)] });
          redraw();
        }}
        onPointerMove={(e) => {
          if (!drawing.current) return;
          strokes.current[strokes.current.length - 1]!.pts.push(point(e));
          redraw();
        }}
        onPointerUp={() => {
          drawing.current = false;
          commit();
        }}
        onPointerCancel={() => {
          drawing.current = false;
          commit();
        }}
      />
      <div className="mt-2 flex items-center gap-2">
        {colors.map((c) => (
          <button
            key={c}
            type="button"
            aria-label={`Use ${c}`}
            onClick={() => setColor(c)}
            className="size-7 rounded-full"
            style={{
              background: c,
              boxShadow: color === c ? "0 0 0 2px #fff, 0 0 0 4px #2B2522" : "none",
            }}
          />
        ))}
        <span className="flex-1" />
        <button
          type="button"
          disabled={!count}
          onClick={() => {
            strokes.current.pop();
            redraw();
            commit();
          }}
          className="text-xs underline disabled:opacity-40"
        >
          {SECTION_COPY.doodle.undo}
        </button>
        <button
          type="button"
          disabled={!count}
          onClick={() => {
            strokes.current = [];
            redraw();
            commit();
          }}
          className="text-xs underline disabled:opacity-40"
        >
          {SECTION_COPY.doodle.clear}
        </button>
      </div>
    </div>
  );
}
