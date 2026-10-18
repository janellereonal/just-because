/**
 * The editor's sticker canvas: the stickers on the opening, placed by hand.
 *
 * Tap (or click, or Tab to) a sticker to select it. A selected sticker gets a dashed frame, an
 * x to delete it, a handle on top to turn it and a handle in the corner to resize it, plus a
 * toolbar with a plain button for every gesture (smaller, bigger, turn, bring to front, undo,
 * delete). Mouse and touch go through the same pointer events; two fingers on a sticker
 * resize and turn it at once. Keys: arrows move, + and - resize, [ and ] turn,
 * Delete/Backspace removes, Escape lets go, Ctrl/Cmd+Z undoes.
 *
 * A gesture only changes this component's own copy of the sticker while it runs, and hands the
 * finished sticker to `onChange` once at the end, so every drag is one step to undo.
 * Stack order is the list order (last on top); "Bring to front" moves a sticker to the end.
 */
import { useEffect, useRef, useState } from "react";
import { BringToFront, Check, Minus, Plus, RotateCcw, RotateCw, Trash2, Undo2, X } from "lucide-react";
import { STICKER_COPY } from "@/copy/strings";
import { STICKER_SIZE, STICKER_TURN, stickerBoxCss, stickerFontCss, type IntroSticker } from "@/lib/intro";

type Update = (prev: IntroSticker[]) => IntroSticker[];

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
const clampPos = (v: number) => clamp(v, 0.03, 0.97);
const clampSize = (s: number) => Math.round(clamp(s, STICKER_SIZE.min, STICKER_SIZE.max) * 100) / 100;
/** Degrees kept in -180..180, snapping to straight (and every 45°) when close. */
function clampTurn(r: number) {
  let d = ((((r + 180) % 360) + 360) % 360) - 180;
  const snap = Math.round(d / 45) * 45;
  if (Math.abs(d - snap) < 4) d = snap;
  return clamp(Math.round(d), -STICKER_TURN, STICKER_TURN);
}
const nameOf = (s: IntroSticker) => (s.url ? STICKER_COPY.picture : (s.emoji ?? STICKER_COPY.picture));

function isTyping() {
  const el = document.activeElement as HTMLElement | null;
  return !!el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.tagName === "SELECT" || el.isContentEditable);
}

export function StickerCanvas({
  stickers,
  host,
  onChange,
  onUndo,
  canUndo = false,
}: {
  stickers: IntroSticker[];
  /** The opening's box: positions are fractions of it. */
  host: React.RefObject<HTMLDivElement | null>;
  onChange: (update: Update) => void;
  onUndo?: (() => void) | undefined;
  canUndo?: boolean | undefined;
}) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [said, setSaid] = useState("");
  const selected = stickers.find((s) => s.id === selectedId) ?? null;
  /** Set when a tap outside only lets go of a sticker, so that tap doesn't also open the gift. */
  const swallowClick = useRef(false);

  const update = (id: string, patch: Partial<IntroSticker>) =>
    onChange((prev) => prev.map((s) => (s.id === id ? { ...s, ...patch } : s)));
  const remove = (id: string) => {
    onChange((prev) => prev.filter((s) => s.id !== id));
    setSelectedId(null);
    setSaid(STICKER_COPY.removed);
  };
  const toFront = (id: string) =>
    onChange((prev) => {
      const s = prev.find((x) => x.id === id);
      return s && prev[prev.length - 1]?.id !== id ? [...prev.filter((x) => x.id !== id), s] : prev;
    });

  // A tap anywhere outside the stickers and their toolbar lets go of the selected one.
  useEffect(() => {
    if (!selectedId) return;
    const onDown = (e: PointerEvent) => {
      const t = e.target as Element | null;
      if (t?.closest("[data-sticker], [data-sticker-tools]")) return;
      setSelectedId(null);
      if (host.current?.contains(t)) swallowClick.current = true;
    };
    document.addEventListener("pointerdown", onDown, true);
    return () => document.removeEventListener("pointerdown", onDown, true);
  }, [selectedId, host]);

  useEffect(() => {
    const el = host.current;
    if (!el) return;
    const onClick = (e: MouseEvent) => {
      if (!swallowClick.current) return;
      swallowClick.current = false;
      e.stopPropagation();
      e.preventDefault();
    };
    el.addEventListener("click", onClick, true);
    return () => el.removeEventListener("click", onClick, true);
  }, [host]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (isTyping()) return;
      if ((e.metaKey || e.ctrlKey) && !e.shiftKey && e.key.toLowerCase() === "z") {
        if (canUndo && onUndo) {
          e.preventDefault();
          onUndo();
        }
        return;
      }
      if (!selected || e.metaKey || e.ctrlKey || e.altKey) return;
      const step = e.shiftKey ? 0.05 : 0.01;
      const k = e.key;
      if (k === "Delete" || k === "Backspace") remove(selected.id);
      else if (k === "Escape") setSelectedId(null);
      else if (k === "ArrowLeft") update(selected.id, { x: clampPos(selected.x - step) });
      else if (k === "ArrowRight") update(selected.id, { x: clampPos(selected.x + step) });
      else if (k === "ArrowUp") update(selected.id, { y: clampPos(selected.y - step) });
      else if (k === "ArrowDown") update(selected.id, { y: clampPos(selected.y + step) });
      else if (k === "+" || k === "=") update(selected.id, { s: clampSize(selected.s * 1.1) });
      else if (k === "-" || k === "_") update(selected.id, { s: clampSize(selected.s / 1.1) });
      else if (k === "]") update(selected.id, { r: clampTurn(selected.r + 15) });
      else if (k === "[") update(selected.id, { r: clampTurn(selected.r - 15) });
      else return;
      e.preventDefault();
      e.stopPropagation();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected, canUndo, onUndo]);

  return (
    <>
      {stickers.map((st, i) => (
        <EditableSticker
          key={st.id}
          sticker={st}
          z={i}
          host={host}
          selected={st.id === selectedId}
          onSelect={() => setSelectedId(st.id)}
          onCommit={(next) => update(st.id, { x: next.x, y: next.y, r: next.r, s: next.s })}
          onRemove={() => remove(st.id)}
        />
      ))}

      {selected ? (
        <div
          data-sticker-tools=""
          role="toolbar"
          aria-label={`${nameOf(selected)} sticker`}
          className="absolute bottom-3 left-1/2 z-[40] flex -translate-x-1/2 items-center gap-0.5 rounded-full bg-white/95 p-1 text-[#2B2522] shadow-[0_10px_30px_-10px_rgba(0,0,0,.45)] ring-1 ring-black/10"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => e.stopPropagation()}
        >
          <Tool label={STICKER_COPY.smaller} onClick={() => update(selected.id, { s: clampSize(selected.s / 1.15) })}>
            <Minus className="size-4" />
          </Tool>
          <Tool label={STICKER_COPY.bigger} onClick={() => update(selected.id, { s: clampSize(selected.s * 1.15) })}>
            <Plus className="size-4" />
          </Tool>
          <Tool label={STICKER_COPY.turnLeft} onClick={() => update(selected.id, { r: clampTurn(selected.r - 15) })}>
            <RotateCcw className="size-4" />
          </Tool>
          <Tool label={STICKER_COPY.turnRight} onClick={() => update(selected.id, { r: clampTurn(selected.r + 15) })}>
            <RotateCw className="size-4" />
          </Tool>
          <Tool label={STICKER_COPY.front} onClick={() => toFront(selected.id)}>
            <BringToFront className="size-4" />
          </Tool>
          <Tool label={STICKER_COPY.undo} onClick={() => onUndo?.()} disabled={!canUndo}>
            <Undo2 className="size-4" />
          </Tool>
          <button
            type="button"
            onClick={() => remove(selected.id)}
            className="ml-0.5 inline-flex h-8 items-center gap-1 rounded-full bg-[#B42318] px-3 text-xs font-medium text-white"
          >
            <Trash2 className="size-3.5" aria-hidden />
            {STICKER_COPY.remove}
          </button>
          <Tool label={STICKER_COPY.done} onClick={() => setSelectedId(null)} className="max-sm:hidden">
            <Check className="size-4" />
          </Tool>
        </div>
      ) : canUndo && onUndo ? (
        <div data-sticker-tools="" className="absolute bottom-3 left-3 z-[40]" onPointerDown={(e) => e.stopPropagation()} onClick={(e) => e.stopPropagation()}>
          <button
            type="button"
            onClick={onUndo}
            className="inline-flex h-8 items-center gap-1 rounded-full bg-white/95 px-3 text-xs font-medium text-[#2B2522] shadow ring-1 ring-black/10"
          >
            <Undo2 className="size-3.5" aria-hidden />
            {STICKER_COPY.undo}
          </button>
        </div>
      ) : null}
      <span className="sr-only" aria-live="polite">
        {said}
      </span>
    </>
  );
}

function Tool({
  label,
  onClick,
  disabled,
  className = "",
  children,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className={`grid size-8 place-items-center rounded-full hover:bg-black/5 disabled:opacity-35 ${className}`}
    >
      {children}
    </button>
  );
}

type Gesture =
  | { kind: "move"; start: IntroSticker; sx: number; sy: number; moved: boolean }
  | { kind: "resize"; start: IntroSticker; d0: number }
  | { kind: "turn"; start: IntroSticker; a0: number }
  | { kind: "pinch"; start: IntroSticker; d0: number; a0: number };

function EditableSticker({
  sticker,
  z,
  host,
  selected,
  onSelect,
  onCommit,
  onRemove,
}: {
  sticker: IntroSticker;
  z: number;
  host: React.RefObject<HTMLDivElement | null>;
  selected: boolean;
  onSelect: () => void;
  onCommit: (next: IntroSticker) => void;
  onRemove: () => void;
}) {
  /** The sticker as it looks mid-gesture; null when nothing is happening. */
  const [live, setLive] = useState<IntroSticker | null>(null);
  const st = live ?? sticker;
  const liveRef = useRef<IntroSticker | null>(null);
  const gesture = useRef<Gesture | null>(null);
  const pointers = useRef(new Map<number, { x: number; y: number }>());

  const show = (next: IntroSticker) => {
    liveRef.current = next;
    setLive(next);
  };
  const finish = () => {
    const done = liveRef.current;
    gesture.current = null;
    liveRef.current = null;
    setLive(null);
    if (done && (done.x !== sticker.x || done.y !== sticker.y || done.r !== sticker.r || done.s !== sticker.s)) onCommit(done);
  };

  function box() {
    return host.current?.getBoundingClientRect() ?? null;
  }
  function center(s: IntroSticker) {
    const r = box();
    return r ? { x: r.left + s.x * r.width, y: r.top + s.y * r.height } : { x: 0, y: 0 };
  }
  const capture = (e: React.PointerEvent) => {
    try {
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    } catch {
      /* fine */
    }
  };
  /** Two fingers down: resize and turn together, from where the fingers are now. */
  function startPinch() {
    const [a, b] = [...pointers.current.values()];
    if (!a || !b) return;
    gesture.current = {
      kind: "pinch",
      start: liveRef.current ?? sticker,
      d0: Math.max(10, Math.hypot(b.x - a.x, b.y - a.y)),
      a0: Math.atan2(b.y - a.y, b.x - a.x),
    };
  }

  function onBodyDown(e: React.PointerEvent) {
    e.stopPropagation();
    onSelect();
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    capture(e);
    if (pointers.current.size >= 2) startPinch();
    else gesture.current = { kind: "move", start: sticker, sx: e.clientX, sy: e.clientY, moved: false };
  }
  function onBodyMove(e: React.PointerEvent) {
    if (!pointers.current.has(e.pointerId)) return;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const g = gesture.current;
    if (!g) return;
    if (g.kind === "pinch") {
      const [a, b] = [...pointers.current.values()];
      if (!a || !b) return;
      const d = Math.hypot(b.x - a.x, b.y - a.y);
      const ang = Math.atan2(b.y - a.y, b.x - a.x);
      show({ ...g.start, s: clampSize((g.start.s * d) / g.d0), r: clampTurn(g.start.r + ((ang - g.a0) * 180) / Math.PI) });
      return;
    }
    if (g.kind !== "move") return;
    if (!g.moved && Math.hypot(e.clientX - g.sx, e.clientY - g.sy) < 4) return;
    g.moved = true;
    const r = box();
    if (!r) return;
    show({ ...g.start, x: clampPos(g.start.x + (e.clientX - g.sx) / r.width), y: clampPos(g.start.y + (e.clientY - g.sy) / r.height) });
  }
  function onBodyUp(e: React.PointerEvent) {
    e.stopPropagation();
    pointers.current.delete(e.pointerId);
    if (pointers.current.size === 1 && gesture.current?.kind === "pinch") {
      // One finger lifted: carry on moving with the other one.
      const [rest] = [...pointers.current.values()];
      const cur = liveRef.current ?? sticker;
      if (rest) gesture.current = { kind: "move", start: cur, sx: rest.x, sy: rest.y, moved: true };
      return;
    }
    if (pointers.current.size === 0) finish();
  }

  function onHandleDown(kind: "resize" | "turn", e: React.PointerEvent) {
    e.stopPropagation();
    e.preventDefault();
    capture(e);
    const c = center(sticker);
    gesture.current =
      kind === "resize"
        ? { kind, start: sticker, d0: Math.max(8, Math.hypot(e.clientX - c.x, e.clientY - c.y)) }
        : { kind, start: sticker, a0: Math.atan2(e.clientY - c.y, e.clientX - c.x) };
  }
  function onHandleMove(e: React.PointerEvent) {
    const g = gesture.current;
    if (!g || (g.kind !== "resize" && g.kind !== "turn")) return;
    const c = center(g.start);
    if (g.kind === "resize") {
      show({ ...g.start, s: clampSize((g.start.s * Math.hypot(e.clientX - c.x, e.clientY - c.y)) / g.d0) });
    } else {
      const a = Math.atan2(e.clientY - c.y, e.clientX - c.x);
      show({ ...g.start, r: clampTurn(g.start.r + ((a - g.a0) * 180) / Math.PI) });
    }
  }
  function onHandleUp(e: React.PointerEvent) {
    e.stopPropagation();
    finish();
  }

  const size = stickerBoxCss(st.s);
  const handle = "absolute grid size-9 place-items-center touch-none";
  const dot = "grid size-6 place-items-center rounded-full bg-white text-[#2B2522] shadow-md ring-2 ring-[#2B2522]";
  return (
    <span
      data-sticker=""
      role="button"
      tabIndex={0}
      aria-pressed={selected}
      aria-label={STICKER_COPY.label(nameOf(st), selected)}
      aria-description={selected ? STICKER_COPY.keys : undefined}
      className="pointer-events-auto absolute cursor-grab touch-none select-none outline-none active:cursor-grabbing"
      style={{ left: `${st.x * 100}%`, top: `${st.y * 100}%`, width: size, height: size, transform: "translate(-50%,-50%)", zIndex: 3 + z + (selected ? 20 : 0) }}
      onFocus={onSelect}
      onPointerDown={onBodyDown}
      onPointerMove={onBodyMove}
      onPointerUp={onBodyUp}
      onPointerCancel={(e) => {
        pointers.current.delete(e.pointerId);
        if (pointers.current.size === 0) finish();
      }}
      onClick={(e) => e.stopPropagation()}
    >
      <span
        className="block size-full"
        style={{ animation: selected || live ? undefined : `jb-float ${5 + ((sticker.x * 10) % 3)}s ease-in-out ${-sticker.y * 4}s infinite` }}
      >
        <span className="relative grid size-full place-items-center" style={{ transform: `rotate(${st.r}deg)` }}>
          {st.url ? (
            <img
              src={st.url}
              alt=""
              draggable={false}
              className="size-full object-contain"
              style={{ filter: "drop-shadow(2px 0 0 #fff) drop-shadow(-2px 0 0 #fff) drop-shadow(0 2px 0 #fff) drop-shadow(0 -2px 0 #fff) drop-shadow(0 6px 8px rgba(0,0,0,.18))" }}
            />
          ) : (
            <span className="leading-none" style={{ fontSize: stickerFontCss(st.s), filter: "drop-shadow(0 5px 6px rgba(0,0,0,.18))" }}>
              {st.emoji}
            </span>
          )}
          {selected ? (
            <>
              <span aria-hidden className="pointer-events-none absolute -inset-2 rounded-xl border-2 border-dashed border-white shadow-[0_0_0_1px_rgba(0,0,0,.35)]" />
              {/* Stem up to the turn handle. */}
              <span aria-hidden className="pointer-events-none absolute -top-6 left-1/2 h-4 w-0.5 -translate-x-1/2 bg-white shadow-[0_0_0_1px_rgba(0,0,0,.25)]" />
              <button
                type="button"
                aria-label={STICKER_COPY.remove}
                title={STICKER_COPY.remove}
                className={`${handle} -top-6 -left-6`}
                onPointerDown={(e) => e.stopPropagation()}
                onClick={(e) => {
                  e.stopPropagation();
                  onRemove();
                }}
              >
                <span className="grid size-6 place-items-center rounded-full bg-[#B42318] text-white shadow-md ring-2 ring-white">
                  <X className="size-3.5" />
                </span>
              </button>
              <span
                role="presentation"
                title={STICKER_COPY.turn}
                className={`${handle} -top-[46px] left-1/2 -translate-x-1/2 cursor-grab`}
                onPointerDown={(e) => onHandleDown("turn", e)}
                onPointerMove={onHandleMove}
                onPointerUp={onHandleUp}
                onPointerCancel={onHandleUp}
              >
                <span className={dot}>
                  <RotateCw className="size-3.5" />
                </span>
              </span>
              <span
                role="presentation"
                title={STICKER_COPY.resize}
                className={`${handle} -right-6 -bottom-6 cursor-nwse-resize`}
                onPointerDown={(e) => onHandleDown("resize", e)}
                onPointerMove={onHandleMove}
                onPointerUp={onHandleUp}
                onPointerCancel={onHandleUp}
              >
                <span className={dot}>
                  <span className="size-2 rounded-sm bg-[#2B2522]" />
                </span>
              </span>
            </>
          ) : null}
        </span>
      </span>
    </span>
  );
}
