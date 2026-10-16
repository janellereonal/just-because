/**
 * The photobooth (flag photoboothCamera). Friends take a photo with their camera (or pick one
 * from their device), choose a frame, write a short message on it, and get back one framed
 * 1080 x 1350 JPEG that goes in like any other photo.
 *
 * Nothing leaves the device until they press "Use this photo"; the camera turns off as soon as
 * the booth closes or the photo is taken.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Camera, ImagePlus, RotateCcw, X } from "lucide-react";
import { PHOTOBOOTH_COPY as C } from "@/copy/strings";
import { readableInk } from "@/lib/palettes";
import {
  FRAMES,
  MESSAGE_MAX,
  OUT_H,
  OUT_W,
  drawBooth,
  type BoothPalette,
  type FrameId,
} from "@/lib/photobooth/frames";

type Shot = { src: HTMLCanvasElement | HTMLImageElement; w: number; h: number };
type CameraState = "starting" | "on" | "denied" | "none";

/** Turns a CSS font-family (which may use theme variables) into a list a canvas understands. */
function resolveFont(family: string): string {
  if (typeof document === "undefined") return "sans-serif";
  const probe = document.createElement("span");
  probe.style.fontFamily = family;
  probe.style.position = "absolute";
  probe.style.visibility = "hidden";
  document.body.appendChild(probe);
  const out = getComputedStyle(probe).fontFamily || "sans-serif";
  probe.remove();
  return out;
}

export function PhotoBooth({
  palette,
  fontFamily,
  onUse,
  onClose,
}: {
  palette: BoothPalette;
  fontFamily: string;
  onUse: (file: File) => void;
  onClose: () => void;
}) {
  const reduce = useReducedMotion();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const closeRef = useRef<HTMLButtonElement | null>(null);
  const [camera, setCamera] = useState<CameraState>("starting");
  const [mode, setMode] = useState<1 | 4>(1);
  const [shots, setShots] = useState<Shot[]>([]);
  const [count, setCount] = useState<number | null>(null);
  const [taking, setTaking] = useState<number | null>(null);
  const [flash, setFlash] = useState(0);
  const [frame, setFrame] = useState<FrameId>("polaroid");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const font = useMemo(() => resolveFont(fontFamily), [fontFamily]);
  const editing = shots.length > 0 && taking === null;
  const ink = readableInk(palette.accent);

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }, []);

  const startCamera = useCallback(async () => {
    setCamera("starting");
    if (!navigator.mediaDevices?.getUserMedia) return setCamera("none");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 1280 } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => undefined);
      }
      setCamera("on");
    } catch (e) {
      setCamera(e instanceof DOMException && e.name === "NotAllowedError" ? "denied" : "none");
    }
  }, []);

  useEffect(() => {
    void startCamera();
    return stopCamera;
  }, [startCamera, stopCamera]);

  // After a retake the <video> mounts again; give it the stream if it doesn't have it.
  useEffect(() => {
    const v = videoRef.current;
    if (editing || !v || !streamRef.current || v.srcObject === streamRef.current) return;
    v.srcObject = streamRef.current;
    void v.play().catch(() => undefined);
  }, [editing, camera]);

  // Esc closes; focus starts on the close button so keyboards land inside the booth.
  useEffect(() => {
    closeRef.current?.focus();
    const key = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", key);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", key);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  // Load the message font before drawing, so the first preview isn't in a fallback font.
  const [fontReady, setFontReady] = useState(false);
  useEffect(() => {
    let alive = true;
    void (document.fonts?.load(`600 64px ${font}`) ?? Promise.resolve()).finally(() => alive && setFontReady(true));
    return () => {
      alive = false;
    };
  }, [font]);

  // Redraw the framed photo whenever anything changes.
  useEffect(() => {
    const c = canvasRef.current;
    if (!c || !editing) return;
    const ctx = c.getContext("2d");
    if (!ctx) return;
    drawBooth(ctx, {
      frame,
      photos: shots.map((s) => s.src),
      sizes: shots.map((s) => ({ w: s.w, h: s.h })),
      message,
      palette,
      font,
    });
  }, [editing, shots, frame, message, palette, font, fontReady]);

  /** One frame from the camera, mirrored like the preview (it's a mirror booth). */
  function grab(): Shot | null {
    const v = videoRef.current;
    if (!v || !v.videoWidth) return null;
    const c = document.createElement("canvas");
    c.width = v.videoWidth;
    c.height = v.videoHeight;
    const ctx = c.getContext("2d");
    if (!ctx) return null;
    ctx.translate(c.width, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(v, 0, 0);
    return { src: c, w: c.width, h: c.height };
  }

  const wait = (ms: number) => new Promise((r) => window.setTimeout(r, ms));

  async function shoot() {
    if (camera !== "on" || taking !== null) return;
    const taken: Shot[] = [];
    for (let i = 0; i < mode; i += 1) {
      setTaking(i + 1);
      for (const n of [3, 2, 1]) {
        setCount(n);
        await wait(reduce ? 450 : 700);
      }
      setCount(null);
      const s = grab();
      if (s) taken.push(s);
      setFlash((f) => f + 1);
      await wait(reduce ? 150 : 450);
    }
    setTaking(null);
    if (taken.length) {
      stopCamera();
      setShots(taken);
    }
  }

  function fromDevice(file: File | undefined) {
    if (!file || !file.type.startsWith("image/")) return;
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      stopCamera();
      setShots([{ src: img, w: img.naturalWidth, h: img.naturalHeight }]);
    };
    img.src = url;
  }

  function retake() {
    setShots([]);
    void startCamera();
  }

  async function use() {
    const c = canvasRef.current;
    if (!c || busy) return;
    setBusy(true);
    const blob = await new Promise<Blob | null>((r) => c.toBlob(r, "image/jpeg", 0.9));
    setBusy(false);
    if (!blob) return;
    onUse(new File([blob], "photobooth.jpg", { type: "image/jpeg" }));
  }

  const chip = (on: boolean) =>
    `rounded-full px-3.5 py-2 text-sm font-medium transition-colors ${on ? "bg-white text-ink ring-2 ring-white" : "bg-white/10 text-cream ring-1 ring-white/20 hover:bg-white/20"}`;

  return (
    <motion.div
      role="dialog"
      aria-modal="true"
      aria-label={C.title}
      className="fixed inset-0 z-[90] flex flex-col bg-[#171412]/95 text-cream backdrop-blur-sm"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <div className="flex items-center justify-between px-4 pt-4 sm:px-6">
        <p className="font-mono text-[11px] tracking-[0.18em] uppercase opacity-80">{C.title}</p>
        <button
          ref={closeRef}
          type="button"
          onClick={onClose}
          aria-label={C.close}
          className="grid size-11 place-items-center rounded-full bg-white/10 hover:bg-white/20"
        >
          <X className="size-5" />
        </button>
      </div>

      <div className="mx-auto flex w-full max-w-5xl min-h-0 flex-1 flex-col items-center gap-5 overflow-y-auto px-4 pt-3 pb-6 sm:px-6 lg:flex-row lg:items-start lg:justify-center lg:gap-10 lg:pt-8">
        {/* The booth window: live camera, or the framed result. */}
        <div className="relative w-full max-w-[420px] shrink-0">
          <div className="relative aspect-[4/5] w-full overflow-hidden rounded-[22px] bg-black shadow-2xl ring-1 ring-white/10">
            {!editing ? (
              <>
                <video
                  ref={videoRef}
                  playsInline
                  muted
                  className="size-full object-cover"
                  style={{ transform: "scaleX(-1)", opacity: camera === "on" ? 1 : 0 }}
                />
                {mode === 4 && camera === "on" ? (
                  <div aria-hidden className="pointer-events-none absolute inset-0 grid grid-cols-2 grid-rows-2">
                    {[0, 1, 2, 3].map((i) => (
                      <span key={i} className={`border border-white/25 ${taking === i + 1 ? "bg-white/10" : ""}`} />
                    ))}
                  </div>
                ) : null}
                {camera !== "on" ? (
                  <div className="absolute inset-0 grid place-items-center p-6 text-center">
                    <div>
                      <Camera className="mx-auto size-8 opacity-70" aria-hidden />
                      <p className="mt-3 text-sm leading-relaxed opacity-85">
                        {camera === "starting" ? C.starting : camera === "denied" ? C.denied : C.noCamera}
                      </p>
                    </div>
                  </div>
                ) : null}
                <AnimatePresence>
                  {count !== null ? (
                    <motion.span
                      key={`${taking}-${count}`}
                      className="absolute inset-0 grid place-items-center font-display text-[120px] font-semibold text-white drop-shadow-[0_6px_24px_rgba(0,0,0,.45)]"
                      initial={reduce ? { opacity: 0 } : { scale: 1.6, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ type: "spring", stiffness: 420, damping: 22 }}
                      aria-live="assertive"
                    >
                      {count}
                    </motion.span>
                  ) : null}
                </AnimatePresence>
                {taking !== null ? (
                  <span className="absolute top-3 left-1/2 -translate-x-1/2 rounded-full bg-black/55 px-3 py-1 text-xs font-medium">
                    {C.shooting(taking, mode)}
                  </span>
                ) : null}
                <AnimatePresence>
                  {flash ? (
                    <motion.span
                      key={flash}
                      aria-hidden
                      className="pointer-events-none absolute inset-0 bg-white"
                      initial={{ opacity: reduce ? 0.35 : 0.95 }}
                      animate={{ opacity: 0 }}
                      transition={{ duration: reduce ? 0.2 : 0.45 }}
                    />
                  ) : null}
                </AnimatePresence>
              </>
            ) : (
              <canvas
                ref={canvasRef}
                width={OUT_W}
                height={OUT_H}
                role="img"
                aria-label={message.trim() ? `${C.previewAlt}: ${message.trim()}` : C.previewAlt}
                className="size-full"
              />
            )}
          </div>
        </div>

        {/* Controls. */}
        <div className="w-full max-w-[420px] lg:pt-2">
          {!editing ? (
            <>
              <div className={`flex justify-center gap-2 lg:justify-start ${camera === "denied" || camera === "none" ? "hidden" : ""}`} role="radiogroup" aria-label={C.title}>
                {([1, 4] as const).map((m) => (
                  <button key={m} type="button" role="radio" aria-checked={mode === m} disabled={taking !== null} onClick={() => setMode(m)} className={chip(mode === m)}>
                    {m === 1 ? C.one : C.four}
                  </button>
                ))}
              </div>
              {camera === "denied" || camera === "none" ? (
                // No camera: picking a photo from the device becomes the main button.
                <label
                  className="mt-5 flex min-h-14 cursor-pointer items-center justify-center gap-2.5 rounded-full px-7 text-base font-semibold shadow-lg lg:inline-flex"
                  style={{ background: palette.accent, color: ink }}
                >
                  <ImagePlus className="size-5" aria-hidden /> {C.fromDevice}
                  <input type="file" accept="image/*" className="sr-only" onChange={(e) => fromDevice(e.target.files?.[0])} />
                </label>
              ) : (
                <>
                  <div className="mt-5 flex justify-center lg:justify-start">
                    <motion.button
                      type="button"
                      onClick={() => void shoot()}
                      disabled={camera !== "on" || taking !== null}
                      whileTap={reduce ? {} : { scale: 0.94 }}
                      transition={{ type: "spring", stiffness: 500, damping: 26 }}
                      className="inline-flex min-h-14 items-center gap-2.5 rounded-full px-7 text-base font-semibold shadow-lg disabled:opacity-50"
                      style={{ background: palette.accent, color: ink }}
                    >
                      <Camera className="size-5" aria-hidden /> {mode === 1 ? C.shoot : C.shootFour}
                    </motion.button>
                  </div>
                  <label className="mt-5 flex cursor-pointer items-center justify-center gap-2 text-sm underline underline-offset-4 opacity-85 hover:opacity-100 lg:justify-start">
                    <ImagePlus className="size-4" aria-hidden />
                    {C.fromDevice}
                    <input type="file" accept="image/*" className="sr-only" onChange={(e) => fromDevice(e.target.files?.[0])} />
                  </label>
                </>
              )}
            </>
          ) : (
            <>
              <p className="text-sm font-medium">{C.framesLabel}</p>
              <div className="mt-2 flex flex-wrap gap-2" role="radiogroup" aria-label={C.framesLabel}>
                {FRAMES.map((f) => (
                  <button key={f.id} type="button" role="radio" aria-checked={frame === f.id} onClick={() => setFrame(f.id)} className={chip(frame === f.id)}>
                    {f.name}
                  </button>
                ))}
              </div>
              <label className="mt-5 block text-sm font-medium" htmlFor="booth-message">
                {C.messageLabel}
              </label>
              <input
                id="booth-message"
                value={message}
                maxLength={MESSAGE_MAX}
                onChange={(e) => setMessage(e.target.value)}
                placeholder={C.messagePlaceholder}
                className="mt-2 w-full rounded-xl bg-white/95 px-4 py-3 text-sm text-ink outline-none placeholder:text-ink/40 focus:ring-2 focus:ring-white/60"
              />
              <span className="mt-1 block text-right text-xs opacity-60">
                {[...message].length}/{MESSAGE_MAX}
              </span>
              <div className="mt-5 flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={() => void use()}
                  disabled={busy}
                  className="inline-flex min-h-12 items-center rounded-full px-6 text-sm font-semibold shadow-lg disabled:opacity-60"
                  style={{ background: palette.accent, color: ink }}
                >
                  {busy ? C.making : C.use}
                </button>
                <button type="button" onClick={retake} className="inline-flex min-h-12 items-center gap-2 rounded-full bg-white/10 px-5 text-sm font-medium hover:bg-white/20">
                  <RotateCcw className="size-4" aria-hidden /> {camera === "on" || camera === "starting" ? C.retake : C.startOver}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </motion.div>
  );
}
