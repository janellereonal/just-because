/**
 * Photobooth frames, drawn on a canvas. Every frame is original art made of simple shapes,
 * coloured from the gift's palette, with room for a short message on the photo.
 *
 * The output is always 1080 x 1350 (4:5), the shape gift layouts show photos in.
 */
import { PHOTOBOOTH_COPY } from "@/copy/strings";

export const OUT_W = 1080;
export const OUT_H = 1350;

export type FrameId = "polaroid" | "film" | "confetti" | "hearts" | "postcard" | "clean";
export type BoothPalette = { background: string; primary: string; accent: string };
export type Rect = { x: number; y: number; w: number; h: number };

export const FRAMES: { id: FrameId; name: string }[] = [
  { id: "polaroid", name: PHOTOBOOTH_COPY.frames.polaroid },
  { id: "film", name: PHOTOBOOTH_COPY.frames.film },
  { id: "confetti", name: PHOTOBOOTH_COPY.frames.confetti },
  { id: "hearts", name: PHOTOBOOTH_COPY.frames.hearts },
  { id: "postcard", name: PHOTOBOOTH_COPY.frames.postcard },
  { id: "clean", name: PHOTOBOOTH_COPY.frames.clean },
];

export const MESSAGE_MAX = 60;

/** Where the photo (or the 2x2 grid of photos) goes in each frame. */
export function photoWindow(frame: FrameId): Rect {
  switch (frame) {
    case "polaroid":
      return { x: 64, y: 64, w: 952, h: 1000 };
    case "film":
      return { x: 150, y: 80, w: 780, h: 960 };
    case "confetti":
    case "hearts":
      return { x: 96, y: 96, w: 888, h: 960 };
    case "postcard":
      return { x: 72, y: 150, w: 690, h: 930 };
    case "clean":
      return { x: 0, y: 0, w: OUT_W, h: OUT_H };
  }
}

/** Where the message is written. */
export function messageBox(frame: FrameId): Rect {
  switch (frame) {
    case "polaroid":
      return { x: 80, y: 1090, w: 920, h: 200 };
    case "film":
      return { x: 150, y: 1070, w: 780, h: 220 };
    case "confetti":
    case "hearts":
      return { x: 110, y: 1080, w: 860, h: 210 };
    case "postcard":
      return { x: 72, y: 1110, w: 936, h: 190 };
    case "clean":
      return { x: 80, y: 1080, w: 920, h: 210 };
  }
}

/** The photo rects inside a window: one, or a 2x2 grid with a small gap. */
export function photoSlots(win: Rect, count: number, gap = 14): Rect[] {
  if (count <= 1) return [win];
  const w = (win.w - gap) / 2;
  const h = (win.h - gap) / 2;
  return [0, 1, 2, 3].map((i) => ({ x: win.x + (i % 2) * (w + gap), y: win.y + Math.floor(i / 2) * (h + gap), w, h }));
}

/** Source crop so an image covers a rect without stretching (centred, like object-fit: cover). */
export function coverCrop(srcW: number, srcH: number, dst: Rect) {
  const scale = Math.max(dst.w / srcW, dst.h / srcH);
  const w = dst.w / scale;
  const h = dst.h / scale;
  return { sx: (srcW - w) / 2, sy: (srcH - h) / 2, sw: w, sh: h };
}

/**
 * Wraps a message into at most `maxLines` lines that fit `width`, shrinking the font until it
 * does. `measure` returns a line's width at a font size, so this works without a canvas in tests.
 */
export function fitMessage(
  text: string,
  width: number,
  measure: (line: string, size: number) => number,
  { start = 76, min = 34, maxLines = 2 } = {},
): { lines: string[]; size: number } {
  const words = text.trim().split(/\s+/).filter(Boolean);
  if (!words.length) return { lines: [], size: start };
  for (let size = start; size >= min; size -= 4) {
    const lines: string[] = [];
    let line = "";
    let ok = true;
    for (const word of words) {
      const next = line ? `${line} ${word}` : word;
      if (measure(next, size) <= width) line = next;
      else if (!line) {
        ok = false; // one word wider than the box: try smaller
        break;
      } else {
        lines.push(line);
        line = word;
      }
    }
    if (ok && line) lines.push(line);
    if (ok && lines.length <= maxLines) return { lines, size };
  }
  // Still too long at the smallest size: keep what fits and end with an ellipsis.
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    const next = line ? `${line} ${word}` : word;
    if (measure(next, min) <= width) line = next;
    else {
      lines.push(line || word);
      line = line ? word : "";
      if (lines.length === maxLines) break;
    }
  }
  if (lines.length < maxLines && line) lines.push(line);
  const last = lines.length - 1;
  if (last >= 0 && words.join(" ") !== lines.join(" ")) lines[last] = `${lines[last]!.replace(/\s*\S+$/, "")}…`;
  return { lines: lines.slice(0, maxLines), size: min };
}

/** A small seeded random, so a frame's confetti looks the same every time it's drawn. */
function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

function roundRect(ctx: CanvasRenderingContext2D, r: Rect, radius: number) {
  ctx.beginPath();
  ctx.roundRect(r.x, r.y, r.w, r.h, radius);
}

function heart(ctx: CanvasRenderingContext2D, x: number, y: number, s: number) {
  ctx.beginPath();
  ctx.moveTo(x, y + s * 0.3);
  ctx.bezierCurveTo(x, y, x - s * 0.5, y, x - s * 0.5, y + s * 0.3);
  ctx.bezierCurveTo(x - s * 0.5, y + s * 0.6, x, y + s * 0.8, x, y + s);
  ctx.bezierCurveTo(x, y + s * 0.8, x + s * 0.5, y + s * 0.6, x + s * 0.5, y + s * 0.3);
  ctx.bezierCurveTo(x + s * 0.5, y, x, y, x, y + s * 0.3);
  ctx.closePath();
}

/** True when a colour is dark enough to need light text on it. */
export function isDark(hex: string) {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return false;
  const n = parseInt(m[1]!, 16);
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  return 0.2126 * r + 0.7152 * g + 0.0722 * b < 140;
}

export type DrawInput = {
  frame: FrameId;
  photos: CanvasImageSource[];
  /** Natural sizes of `photos`, same order. */
  sizes: { w: number; h: number }[];
  message: string;
  palette: BoothPalette;
  /** A resolved font-family list (no CSS variables), for the message. */
  font: string;
};

/** Draws the whole framed photo onto a 1080 x 1350 canvas context. */
export function drawBooth(ctx: CanvasRenderingContext2D, input: DrawInput) {
  const { frame, photos, sizes, message, palette, font } = input;
  const W = OUT_W;
  const H = OUT_H;
  const win = photoWindow(frame);
  const slots = photoSlots(win, photos.length >= 4 ? 4 : 1, frame === "clean" ? 6 : 14);
  ctx.save();
  ctx.clearRect(0, 0, W, H);

  // Background and frame body.
  const paper = {
    polaroid: "#FFFDF8",
    film: "#151312",
    confetti: palette.background,
    hearts: palette.background,
    postcard: "#F6EFE3",
    clean: "#111111",
  }[frame];
  ctx.fillStyle = paper;
  ctx.fillRect(0, 0, W, H);

  if (frame === "hearts") {
    // A soft wash of the accent behind everything.
    ctx.globalAlpha = 0.18;
    ctx.fillStyle = palette.accent;
    ctx.fillRect(0, 0, W, H);
    ctx.globalAlpha = 1;
  }

  // Photos.
  slots.forEach((slot, i) => {
    const img = photos[i % photos.length];
    const size = sizes[i % sizes.length];
    if (!img || !size) return;
    const c = coverCrop(size.w, size.h, slot);
    ctx.save();
    roundRect(ctx, slot, frame === "confetti" || frame === "hearts" ? 28 : frame === "film" ? 10 : 4);
    ctx.clip();
    ctx.drawImage(img, c.sx, c.sy, c.sw, c.sh, slot.x, slot.y, slot.w, slot.h);
    ctx.restore();
  });

  // Decorations.
  const rand = rng(frame.length * 97 + 11);
  if (frame === "polaroid") {
    ctx.strokeStyle = "rgba(43,37,34,0.08)";
    ctx.lineWidth = 2;
    ctx.strokeRect(win.x, win.y, win.w, win.h);
  }
  if (frame === "film") {
    ctx.fillStyle = "#FBF8F2";
    for (let y = 40; y < H - 30; y += 92) {
      for (const x of [44, W - 44 - 54]) {
        ctx.beginPath();
        ctx.roundRect(x, y, 54, 58, 10);
        ctx.fill();
      }
    }
    ctx.fillStyle = "#E8B04B";
    ctx.font = `600 26px "JetBrains Mono", ui-monospace, monospace`;
    ctx.textAlign = "left";
    ctx.textBaseline = "alphabetic";
    ctx.fillText("JB  400", win.x, H - 34);
    ctx.textAlign = "right";
    ctx.fillText("▸ 01A", win.x + win.w, H - 34);
  }
  if (frame === "confetti") {
    const colors = [palette.accent, palette.primary, "#FFD166", "#7CC6A4"];
    // Only around the edges: never over the photo or the message.
    const box = messageBox(frame);
    const clear = (x: number, y: number) => {
      const inWin = x > win.x - 14 && x < win.x + win.w + 14 && y > win.y - 14 && y < win.y + win.h + 14;
      const inMsg = x > box.x - 20 && x < box.x + box.w + 20 && y > box.y - 10 && y < box.y + box.h + 10;
      return !inWin && !inMsg;
    };
    for (let i = 0, tries = 0; i < 90 && tries < 4000; tries += 1) {
      const x = rand() * W;
      const y = rand() * H;
      if (!clear(x, y)) continue;
      i += 1;
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(rand() * Math.PI);
      ctx.fillStyle = colors[i % colors.length]!;
      const k = i % 3;
      if (k === 0) {
        ctx.beginPath();
        ctx.arc(0, 0, 9 + rand() * 9, 0, Math.PI * 2);
        ctx.fill();
      } else if (k === 1) ctx.fillRect(-14, -5, 28, 10);
      else {
        ctx.beginPath();
        ctx.moveTo(0, -13);
        ctx.lineTo(12, 10);
        ctx.lineTo(-12, 10);
        ctx.closePath();
        ctx.fill();
      }
      ctx.restore();
    }
  }
  if (frame === "hearts") {
    const spots = [
      [70, 70, 70], [W - 80, 60, 56], [W - 60, 520, 44], [40, 640, 52], [W - 110, 1000, 74],
      [120, 1010, 46], [W / 2, 40, 40], [250, 52, 30], [W - 260, 1060, 34],
    ];
    spots.forEach(([x, y, s], i) => {
      ctx.save();
      ctx.translate(x!, y!);
      ctx.rotate((rand() - 0.5) * 0.6);
      heart(ctx, 0, -s! / 2, s!);
      ctx.fillStyle = i % 3 === 2 ? palette.primary : palette.accent;
      ctx.fill();
      ctx.lineWidth = 6;
      ctx.strokeStyle = "#FFFFFF";
      ctx.stroke();
      ctx.restore();
    });
  }
  if (frame === "postcard") {
    // Stamp with a perforated edge, then a round postmark with wavy lines.
    const st = { x: 800, y: 150, w: 200, h: 240 };
    ctx.fillStyle = "#FFFFFF";
    ctx.fillRect(st.x - 12, st.y - 12, st.w + 24, st.h + 24);
    ctx.fillStyle = "#F6EFE3";
    for (let x = st.x - 12; x <= st.x + st.w + 12; x += 24) {
      ctx.beginPath();
      ctx.arc(x, st.y - 12, 7, 0, Math.PI * 2);
      ctx.arc(x, st.y + st.h + 12, 7, 0, Math.PI * 2);
      ctx.fill();
    }
    for (let y = st.y - 12; y <= st.y + st.h + 12; y += 24) {
      ctx.beginPath();
      ctx.arc(st.x - 12, y, 7, 0, Math.PI * 2);
      ctx.arc(st.x + st.w + 12, y, 7, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = palette.accent;
    ctx.fillRect(st.x, st.y, st.w, st.h);
    ctx.save();
    heart(ctx, st.x + st.w / 2, st.y + 70, 90);
    ctx.fillStyle = isDark(palette.accent) ? "#FBF8F2" : "#2B2522";
    ctx.fill();
    ctx.restore();
    ctx.strokeStyle = "rgba(43,37,34,0.55)";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(845, 470, 70, 0, Math.PI * 2);
    ctx.stroke();
    for (let k = 0; k < 4; k += 1) {
      ctx.beginPath();
      for (let x = 780; x <= 1030; x += 10) {
        const y = 560 + k * 26 + Math.sin(x / 18) * 7;
        if (x === 780) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
    ctx.fillStyle = "rgba(43,37,34,0.6)";
    ctx.font = `600 24px "JetBrains Mono", ui-monospace, monospace`;
    ctx.textAlign = "left";
    ctx.textBaseline = "alphabetic";
    ctx.fillText(PHOTOBOOTH_COPY.postcardMark, 72, 112);
    // Address lines on the right.
    ctx.strokeStyle = "rgba(43,37,34,0.25)";
    ctx.lineWidth = 3;
    for (let k = 0; k < 4; k += 1) {
      ctx.beginPath();
      ctx.moveTo(800, 760 + k * 80);
      ctx.lineTo(1010, 760 + k * 80);
      ctx.stroke();
    }
  }
  if (frame === "clean" && message.trim()) {
    const g = ctx.createLinearGradient(0, H * 0.62, 0, H);
    g.addColorStop(0, "rgba(0,0,0,0)");
    g.addColorStop(1, "rgba(0,0,0,0.62)");
    ctx.fillStyle = g;
    ctx.fillRect(0, H * 0.62, W, H * 0.38);
  }

  // The message.
  const box = messageBox(frame);
  const ink =
    frame === "film" || frame === "clean"
      ? "#FFFFFF"
      : frame === "polaroid" || frame === "postcard"
        ? "#2B2522"
        : isDark(palette.background)
          ? "#FBF8F2"
          : palette.primary;
  ctx.fillStyle = ink;
  ctx.textAlign = frame === "postcard" ? "left" : "center";
  ctx.textBaseline = "middle";
  const measure = (line: string, size: number) => {
    ctx.font = `600 ${size}px ${font}`;
    return ctx.measureText(line).width;
  };
  const { lines, size } = fitMessage(message, box.w, measure, { maxLines: 2 });
  ctx.font = `600 ${size}px ${font}`;
  const lh = size * 1.18;
  const top = box.y + box.h / 2 - ((lines.length - 1) * lh) / 2;
  const x = frame === "postcard" ? box.x : box.x + box.w / 2;
  if (frame === "clean") {
    // Over a photo: a soft shadow keeps it readable on light pictures too.
    ctx.shadowColor = "rgba(0,0,0,0.55)";
    ctx.shadowBlur = 18;
    ctx.shadowOffsetY = 2;
  }
  lines.forEach((line, i) => ctx.fillText(line, x, top + i * lh));
  ctx.restore();
}
