/**
 * The 3D hero object for each occasion: balloons and a cake for birthdays,
 * hearts for Valentine's, a globe and a paper plane for send-offs, and so on.
 * Built from simple shapes in the same soft clay look as Bo. Lazy-loaded,
 * pauses when off screen or when the tab is hidden, and stays still under
 * prefers-reduced-motion.
 *
 * Stills of every scene live in public/themes3d/<kind>.webp (see
 * scripts/render-theme-stills.md); cards and previews use those instead of
 * a live canvas so a gallery never opens a dozen WebGL contexts.
 */
import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import type { ThemeKind } from "@/lib/themeKind";

export type ThemeSceneColors = { accent: string; primary: string; background: string };

export type ThemeScene = {
  ready: Promise<void>;
  setPaused: (paused: boolean) => void;
  snapshot: () => string;
  dispose: () => void;
  /** Tap at canvas coords (-1..1). The piece under the finger reacts, the rest follow. Returns true if a piece was hit. */
  poke: (nx: number, ny: number) => boolean;
  /** Drag to spin: radians per second added to the spin. */
  fling: (velocity: number) => void;
  /** Turn the whole scene by this many radians right now (while dragging). */
  turn: (radians: number) => void;
  /** A big happy reaction: everything jumps, the occasion does its thing. */
  celebrate: () => void;
  /** Birthday candles: blow them out (true if there were any). Relight with relight(). */
  blowOut: () => boolean;
  relight: () => void;
};

export function webglAvailable() {
  try {
    const c = document.createElement("canvas");
    return !!(c.getContext("webgl2") || c.getContext("webgl"));
  } catch {
    return false;
  }
}

/* ---------- materials ---------- */

const clay = (color: THREE.ColorRepresentation, roughness = 0.55) =>
  new THREE.MeshStandardMaterial({ color, roughness, metalness: 0 });
const gloss = (color: THREE.ColorRepresentation) =>
  new THREE.MeshPhysicalMaterial({
    color,
    roughness: 0.18,
    metalness: 0,
    clearcoat: 1,
    clearcoatRoughness: 0.12,
  });
const metal = (color: THREE.ColorRepresentation, roughness = 0.22) =>
  new THREE.MeshStandardMaterial({ color, roughness, metalness: 1 });
const GOLD = 0xe9b949;
const SILVER = 0xdfe3ea;
const WHITE = 0xfffaf4;

/** A theme color softened toward pastel so objects stay cute on any palette. */
function soft(hex: string, amount = 0.25) {
  return new THREE.Color(hex).lerp(new THREE.Color(0xffffff), amount);
}

/* ---------- shapes ---------- */

function roundedBox(w: number, h: number, d: number, r: number, seg = 6) {
  const g = new THREE.BoxGeometry(w, h, d, seg, seg, seg);
  const p = g.attributes["position"] as THREE.BufferAttribute;
  const v = new THREE.Vector3();
  const c = new THREE.Vector3();
  const dir = new THREE.Vector3();
  const [ix, iy, iz] = [w / 2 - r, h / 2 - r, d / 2 - r];
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i);
    c.set(
      Math.max(-ix, Math.min(ix, v.x)),
      Math.max(-iy, Math.min(iy, v.y)),
      Math.max(-iz, Math.min(iz, v.z)),
    );
    dir.copy(v).sub(c);
    if (dir.lengthSq() > 0) dir.normalize();
    else dir.set(0, 1, 0);
    p.setXYZ(i, c.x + dir.x * r, c.y + dir.y * r, c.z + dir.z * r);
  }
  g.computeVertexNormals();
  return g;
}

function extrude(shape: THREE.Shape, depth: number, bevel: number) {
  const g = new THREE.ExtrudeGeometry(shape, {
    depth,
    bevelEnabled: true,
    bevelThickness: bevel,
    bevelSize: bevel,
    bevelSegments: 8,
    curveSegments: 24,
  });
  g.center();
  return g;
}

function heartShape() {
  const s = new THREE.Shape();
  s.moveTo(0, -0.9);
  s.bezierCurveTo(-0.15, -0.7, -1, -0.25, -1, 0.3);
  s.bezierCurveTo(-1, 0.8, -0.5, 1.05, 0, 0.6);
  s.bezierCurveTo(0.5, 1.05, 1, 0.8, 1, 0.3);
  s.bezierCurveTo(1, -0.25, 0.15, -0.7, 0, -0.9);
  return s;
}

function starShape(points = 5, outer = 1, inner = 0.45) {
  const s = new THREE.Shape();
  for (let i = 0; i <= points * 2; i++) {
    const r = i % 2 ? inner : outer;
    const a = (i / (points * 2)) * Math.PI * 2 + Math.PI / 2;
    const x = Math.cos(a) * r;
    const y = Math.sin(a) * r;
    if (i === 0) s.moveTo(x, y);
    else s.lineTo(x, y);
  }
  return s;
}

const heart = (color: THREE.ColorRepresentation, size = 1, shiny = true) => {
  const m = new THREE.Mesh(extrude(heartShape(), 0.35, 0.18), shiny ? gloss(color) : clay(color));
  m.scale.setScalar(size);
  return m;
};

const star = (color: THREE.ColorRepresentation, size = 1, mat?: THREE.Material) => {
  const m = new THREE.Mesh(extrude(starShape(), 0.22, 0.1), mat ?? metal(color, 0.3));
  m.scale.setScalar(size);
  return m;
};

function balloon(color: THREE.Color) {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.SphereGeometry(0.62, 48, 32), gloss(color));
  body.scale.set(1, 1.18, 1);
  const knot = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.16, 16), gloss(color));
  knot.position.y = -0.78;
  knot.rotation.x = Math.PI;
  const curve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, -0.84, 0),
    new THREE.Vector3(0.12, -1.3, 0.05),
    new THREE.Vector3(-0.08, -1.8, 0),
    new THREE.Vector3(0.06, -2.3, 0),
  ]);
  const string = new THREE.Mesh(new THREE.TubeGeometry(curve, 30, 0.012, 6), clay(0xffffff));
  g.add(body, knot, string);
  return g;
}

function giftBox(boxColor: THREE.ColorRepresentation, ribbon: THREE.ColorRepresentation, size = 1) {
  const g = new THREE.Group();
  const box = new THREE.Mesh(roundedBox(1.2, 1, 1.2, 0.12), clay(boxColor));
  const lid = new THREE.Mesh(roundedBox(1.32, 0.28, 1.32, 0.1), clay(boxColor));
  lid.position.y = 0.6;
  const r = clay(ribbon, 0.4);
  const b1 = new THREE.Mesh(new THREE.BoxGeometry(0.22, 1.32, 1.26), r);
  b1.position.y = 0.08;
  const b2 = new THREE.Mesh(new THREE.BoxGeometry(1.26, 1.32, 0.22), r);
  b2.position.y = 0.08;
  const loopG = new THREE.TorusGeometry(0.24, 0.07, 14, 32);
  const l1 = new THREE.Mesh(loopG, r);
  l1.position.set(-0.2, 0.92, 0);
  l1.rotation.set(0, 0, 0.6);
  const l2 = l1.clone();
  l2.position.x = 0.2;
  l2.rotation.z = -0.6;
  g.add(box, lid, b1, b2, l1, l2);
  g.scale.setScalar(size);
  return g;
}

function cake(top: THREE.ColorRepresentation, frost: THREE.ColorRepresentation, candles = true) {
  const g = new THREE.Group();
  const base = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 0.75, 48), clay(top));
  const icing = new THREE.Mesh(new THREE.CylinderGeometry(1.04, 1.04, 0.16, 48), clay(frost, 0.4));
  icing.position.y = 0.4;
  const tier = new THREE.Mesh(new THREE.CylinderGeometry(0.66, 0.66, 0.55, 48), clay(frost, 0.45));
  tier.position.y = 0.75;
  g.add(base, icing, tier);
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2;
    const drop = new THREE.Mesh(new THREE.SphereGeometry(0.11, 16, 12), clay(frost, 0.4));
    drop.position.set(Math.cos(a) * 1.0, 0.3, Math.sin(a) * 1.0);
    drop.scale.y = 1.5;
    g.add(drop);
  }
  const candleColors = candles ? [0xff8fb1, 0x8fd3ff, 0xffd166] : [];
  candleColors.forEach((c, i) => {
    const x = (i - 1) * 0.32;
    const candle = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.45, 16), clay(c));
    candle.position.set(x, 1.24, 0);
    const flame = new THREE.Mesh(
      new THREE.SphereGeometry(0.07, 16, 12),
      new THREE.MeshStandardMaterial({
        color: 0xffd36b,
        emissive: 0xffb02e,
        emissiveIntensity: 1.6,
      }),
    );
    flame.scale.y = 1.7;
    flame.position.set(x, 1.55, 0);
    flame.userData["flicker"] = true;
    g.add(candle, flame);
  });
  return g;
}

function paperPlane(color: THREE.ColorRepresentation) {
  const v = new Float32Array([
    // left wing
    0, 0, 1.3, -0.95, 0, -0.7, 0, 0.02, -0.55,
    // right wing
    0, 0, 1.3, 0, 0.02, -0.55, 0.95, 0, -0.7,
    // keel
    0, 0, 1.3, 0, -0.32, -0.6, 0, 0.02, -0.55,
  ]);
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.BufferAttribute(v, 3));
  g.computeVertexNormals();
  const m = new THREE.MeshStandardMaterial({
    color,
    roughness: 0.6,
    side: THREE.DoubleSide,
    flatShading: true,
  });
  return new THREE.Mesh(g, m);
}

function globe(sea: THREE.ColorRepresentation, land: THREE.ColorRepresentation) {
  const g = new THREE.Group();
  const ball = new THREE.Mesh(new THREE.SphereGeometry(1, 48, 32), gloss(sea));
  g.add(ball);
  const blobs: [number, number, number][] = [
    [0.4, 0.5, 0.42],
    [-0.6, 0.2, 0.36],
    [0.1, -0.5, 0.3],
    [-0.2, 0.75, 0.22],
    [0.75, -0.2, 0.26],
    [-0.7, -0.45, 0.24],
  ];
  for (const [lat, lon, r] of blobs) {
    const b = new THREE.Mesh(new THREE.SphereGeometry(r, 24, 16), clay(land, 0.7));
    const p = new THREE.Vector3().setFromSphericalCoords(0.93, Math.PI / 2 - lat, lon * 3);
    b.position.copy(p);
    b.scale.set(1, 1, 0.35);
    b.lookAt(0, 0, 0);
    g.add(b);
  }
  const ring = new THREE.Mesh(new THREE.TorusGeometry(1.45, 0.025, 8, 96), metal(GOLD));
  ring.rotation.x = Math.PI / 2.4;
  g.add(ring);
  return g;
}

function suitcase(color: THREE.ColorRepresentation) {
  const g = new THREE.Group();
  const body = new THREE.Mesh(roundedBox(1.3, 0.95, 0.5, 0.12), clay(color));
  const handle = new THREE.Mesh(
    new THREE.TorusGeometry(0.2, 0.05, 12, 24, Math.PI),
    clay(0x3a3030),
  );
  handle.position.y = 0.48;
  const strap = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.98, 0.54), clay(0x8a5a3c));
  strap.position.x = -0.3;
  const strap2 = strap.clone();
  strap2.position.x = 0.3;
  const sticker = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.02, 24), clay(0xffd166));
  sticker.rotation.x = Math.PI / 2;
  sticker.position.set(0.02, -0.12, 0.26);
  g.add(body, handle, strap, strap2, sticker);
  return g;
}

function bauble(color: THREE.ColorRepresentation, size = 1) {
  const g = new THREE.Group();
  const ball = new THREE.Mesh(new THREE.SphereGeometry(0.6, 48, 32), gloss(color));
  const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.18, 0.18, 24), metal(GOLD));
  cap.position.y = 0.64;
  const hook = new THREE.Mesh(new THREE.TorusGeometry(0.09, 0.025, 8, 20), metal(GOLD));
  hook.position.y = 0.8;
  const band = new THREE.Mesh(new THREE.TorusGeometry(0.6, 0.035, 10, 64), metal(GOLD));
  band.rotation.x = Math.PI / 2;
  g.add(ball, cap, hook, band);
  g.scale.setScalar(size);
  return g;
}

function tree(green: THREE.ColorRepresentation) {
  const g = new THREE.Group();
  const tiers = [
    [1.0, 0.95, 0],
    [0.8, 0.85, 0.62],
    [0.56, 0.7, 1.15],
  ] as const;
  for (const [r, h, y] of tiers) {
    const cone = new THREE.Mesh(new THREE.ConeGeometry(r, h, 32), clay(green));
    cone.position.y = y;
    g.add(cone);
  }
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.18, 0.4, 16), clay(0x8a5a3c));
  trunk.position.y = -0.62;
  const top = star(GOLD, 0.26);
  top.position.y = 1.72;
  g.add(trunk, top);
  const lights = [0xff6b6b, 0xffd166, 0x8fd3ff, 0xffffff];
  for (let i = 0; i < 14; i++) {
    const t = i / 14;
    const y = -0.2 + t * 1.5;
    const r = 0.95 - t * 0.6;
    const a = t * Math.PI * 5;
    const bulb = new THREE.Mesh(
      new THREE.SphereGeometry(0.055, 12, 10),
      new THREE.MeshStandardMaterial({
        color: lights[i % 4],
        emissive: lights[i % 4],
        emissiveIntensity: 0.9,
      }),
    );
    bulb.position.set(Math.cos(a) * r, y, Math.sin(a) * r);
    bulb.userData["twinkle"] = i;
    g.add(bulb);
  }
  return g;
}

function bone(color: THREE.ColorRepresentation) {
  const g = new THREE.Group();
  const m = clay(color, 0.6);
  const shaft = new THREE.Mesh(new THREE.CapsuleGeometry(0.2, 1.3, 8, 24), m);
  shaft.rotation.z = Math.PI / 2;
  g.add(shaft);
  for (const x of [-0.85, 0.85]) {
    for (const y of [-0.2, 0.2]) {
      const k = new THREE.Mesh(new THREE.SphereGeometry(0.28, 24, 16), m);
      k.position.set(x, y, 0);
      g.add(k);
    }
  }
  return g;
}

function paw(color: THREE.ColorRepresentation) {
  const g = new THREE.Group();
  const m = clay(color, 0.5);
  const pad = new THREE.Mesh(new THREE.SphereGeometry(0.55, 32, 24), m);
  pad.scale.set(1.1, 0.9, 0.45);
  g.add(pad);
  const toes: [number, number][] = [
    [-0.62, 0.62],
    [-0.22, 0.88],
    [0.22, 0.88],
    [0.62, 0.62],
  ];
  for (const [x, y] of toes) {
    const t = new THREE.Mesh(new THREE.SphereGeometry(0.24, 24, 16), m);
    t.position.set(x, y, 0);
    t.scale.set(0.9, 1.1, 0.5);
    g.add(t);
  }
  return g;
}

function tennisBall() {
  const g = new THREE.Group();
  const ball = new THREE.Mesh(new THREE.SphereGeometry(0.5, 40, 28), clay(0xd7ec4a, 0.85));
  const seam = new THREE.Mesh(new THREE.TorusGeometry(0.5, 0.025, 8, 64), clay(0xffffff, 0.5));
  seam.rotation.set(0.5, 0.3, 0);
  seam.scale.set(1, 0.6, 1);
  g.add(ball, seam);
  return g;
}

function discoBall() {
  const g = new THREE.Group();
  const ball = new THREE.Mesh(
    new THREE.IcosahedronGeometry(1, 3),
    new THREE.MeshStandardMaterial({
      color: SILVER,
      metalness: 1,
      roughness: 0.12,
      flatShading: true,
    }),
  );
  const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.16, 0.18, 16), metal(GOLD));
  cap.position.y = 1.04;
  const cord = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 2.2, 6), clay(0x222222));
  cord.position.y = 2.2;
  g.add(ball, cap, cord);
  return g;
}

function champagne() {
  const g = new THREE.Group();
  const profile = [
    [0, 0],
    [0.42, 0],
    [0.42, 0.04],
    [0.06, 0.1],
    [0.05, 0.9],
    [0.22, 1.05],
    [0.3, 1.6],
    [0.32, 2.1],
    [0.3, 2.1],
  ].map(([x, y]) => new THREE.Vector2(x, y));
  const glass = new THREE.Mesh(
    new THREE.LatheGeometry(profile, 48),
    new THREE.MeshPhysicalMaterial({
      color: 0xfff7e6,
      roughness: 0.08,
      transparent: true,
      opacity: 0.55,
      clearcoat: 1,
      side: THREE.DoubleSide,
    }),
  );
  const wine = new THREE.Mesh(
    new THREE.CylinderGeometry(0.29, 0.21, 0.75, 32),
    new THREE.MeshStandardMaterial({
      color: 0xf5d27a,
      roughness: 0.2,
      transparent: true,
      opacity: 0.85,
    }),
  );
  wine.position.y = 1.55;
  g.add(glass, wine);
  for (let i = 0; i < 6; i++) {
    const bubble = new THREE.Mesh(new THREE.SphereGeometry(0.03, 8, 6), clay(0xffffff, 0.2));
    bubble.position.set((Math.random() - 0.5) * 0.3, 1.25 + i * 0.12, 0);
    bubble.userData["bubble"] = i;
    g.add(bubble);
  }
  g.position.y = -1;
  return g;
}

function ring(color: THREE.ColorRepresentation, withStone: boolean) {
  const g = new THREE.Group();
  const band = new THREE.Mesh(new THREE.TorusGeometry(0.62, 0.11, 24, 96), metal(color, 0.18));
  g.add(band);
  if (withStone) {
    const setting = new THREE.Mesh(
      new THREE.CylinderGeometry(0.1, 0.16, 0.14, 12),
      metal(color, 0.2),
    );
    setting.position.y = 0.74;
    const stone = new THREE.Mesh(
      new THREE.OctahedronGeometry(0.24, 0),
      new THREE.MeshPhysicalMaterial({
        color: 0xeaf6ff,
        roughness: 0.02,
        metalness: 0.1,
        clearcoat: 1,
        flatShading: true,
      }),
    );
    stone.scale.y = 1.15;
    stone.position.y = 0.95;
    g.add(setting, stone);
  }
  return g;
}

function flower(petal: THREE.ColorRepresentation, center: THREE.ColorRepresentation, size = 1) {
  const g = new THREE.Group();
  const pm = clay(petal, 0.5);
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    const p = new THREE.Mesh(new THREE.SphereGeometry(0.34, 24, 16), pm);
    p.scale.set(1, 0.55, 0.28);
    p.position.set(Math.cos(a) * 0.36, Math.sin(a) * 0.36, 0);
    p.rotation.z = a;
    g.add(p);
  }
  const c = new THREE.Mesh(new THREE.SphereGeometry(0.2, 24, 16), clay(center, 0.6));
  c.scale.z = 0.6;
  c.position.z = 0.06;
  g.add(c);
  g.scale.setScalar(size);
  return g;
}

function photoFrame(
  frame: THREE.ColorRepresentation,
  photoA: THREE.ColorRepresentation,
  photoB: THREE.ColorRepresentation,
) {
  const g = new THREE.Group();
  const border = new THREE.Mesh(roundedBox(1.5, 1.85, 0.16, 0.06), metal(frame, 0.3));
  const mat = new THREE.Mesh(new THREE.BoxGeometry(1.24, 1.58, 0.05), clay(WHITE, 0.8));
  mat.position.z = 0.07;
  const sky = new THREE.Mesh(new THREE.PlaneGeometry(1.0, 1.32), clay(photoA, 0.9));
  sky.position.z = 0.1;
  const hill = new THREE.Mesh(new THREE.CircleGeometry(0.62, 32, 0, Math.PI), clay(photoB, 0.9));
  hill.position.set(0, -0.66, 0.11);
  const sun = new THREE.Mesh(new THREE.CircleGeometry(0.16, 24), clay(0xffe19a, 0.6));
  sun.position.set(0.22, 0.32, 0.11);
  const h = heart(0xff6f91, 0.12);
  h.position.set(-0.12, -0.15, 0.16);
  g.add(border, mat, sky, hill, sun, h);
  return g;
}

function teacup(color: THREE.ColorRepresentation) {
  const g = new THREE.Group();
  const profile = [
    [0, 0.02],
    [0.3, 0],
    [0.42, 0.12],
    [0.58, 0.55],
    [0.62, 0.62],
    [0.56, 0.62],
    [0.52, 0.56],
    [0.36, 0.16],
    [0, 0.14],
  ].map(([x, y]) => new THREE.Vector2(x, y));
  const cup = new THREE.Mesh(new THREE.LatheGeometry(profile, 48), gloss(color));
  const handle = new THREE.Mesh(
    new THREE.TorusGeometry(0.17, 0.045, 12, 24, Math.PI * 1.3),
    gloss(color),
  );
  handle.position.set(0.6, 0.36, 0);
  handle.rotation.z = -Math.PI / 2.2;
  const saucer = new THREE.Mesh(new THREE.CylinderGeometry(0.85, 0.55, 0.08, 48), gloss(WHITE));
  saucer.position.y = -0.03;
  const tea = new THREE.Mesh(new THREE.CircleGeometry(0.52, 32), clay(0xc98f5a, 0.3));
  tea.rotation.x = -Math.PI / 2;
  tea.position.y = 0.5;
  g.add(cup, handle, saucer, tea);
  return g;
}

function envelope(paper: THREE.ColorRepresentation, seal: THREE.ColorRepresentation) {
  const g = new THREE.Group();
  const body = new THREE.Mesh(roundedBox(1.7, 1.1, 0.12, 0.05), clay(paper, 0.7));
  const flapShape = new THREE.Shape();
  flapShape.moveTo(-0.85, 0);
  flapShape.lineTo(0.85, 0);
  flapShape.lineTo(0, -0.62);
  flapShape.lineTo(-0.85, 0);
  const flap = new THREE.Mesh(
    extrude(flapShape, 0.02, 0.02),
    clay(new THREE.Color(paper as THREE.ColorRepresentation).multiplyScalar(0.94), 0.7),
  );
  flap.position.set(0, 0.32, 0.09);
  const s = heart(seal, 0.16, true);
  s.position.set(0, 0.05, 0.14);
  g.add(body, flap, s);
  return g;
}

/* ---------- compositions ---------- */

type Piece = {
  obj: THREE.Object3D;
  /** float amplitude, speed and phase */
  bob?: number;
  spin?: number;
  phase?: number;
  /** orbit around the scene's y axis (paper plane) */
  orbit?: { radius: number; speed: number; y: number };
};

/** The livelier of the palette's two colors leads; pale or near-black ones get a gentle stand-in. */
function heroColors(colors: ThemeSceneColors) {
  const hsl = (hex: string) => {
    const o = { h: 0, s: 0, l: 0 };
    new THREE.Color(hex).getHSL(o);
    return o;
  };
  const score = (hex: string) => {
    const { s, l } = hsl(hex);
    return s * (1 - Math.abs(l - 0.55) * 1.4);
  };
  const [lead, other] =
    score(colors.accent) >= score(colors.primary)
      ? [colors.accent, colors.primary]
      : [colors.primary, colors.accent];
  const usable = (hex: string, fallback: number) => {
    const { s, l } = hsl(hex);
    return s < 0.15 || l < 0.18 || l > 0.92 ? new THREE.Color(fallback) : soft(hex, 0.15);
  };
  return { accent: usable(lead, 0xf28aa6), primary: usable(other, 0x8fa8ff) };
}

function compose(kind: ThemeKind, colors: ThemeSceneColors): { pieces: Piece[]; radius: number } {
  const { accent, primary } = heroColors(colors);
  const pieces: Piece[] = [];
  const at = (
    obj: THREE.Object3D,
    x: number,
    y: number,
    z: number,
    extra: Omit<Piece, "obj"> = {},
  ) => {
    obj.position.set(x, y, z);
    pieces.push({ obj, bob: 0.12, spin: 0, phase: Math.random() * 6, ...extra });
    return obj;
  };
  switch (kind) {
    case "birthday": {
      at(cake(accent, WHITE), 0, -1.1, 0, { bob: 0.04, spin: 0.15 });
      at(balloon(accent), -2.1, 0.9, -0.4, { bob: 0.18 });
      at(balloon(new THREE.Color(0xffd166)), -1.25, 1.55, -1.2, { bob: 0.16 });
      at(balloon(primary), 2.05, 1.1, -0.6, { bob: 0.2 });
      at(balloon(new THREE.Color(0x7ed7c1)), 1.3, 1.75, -1.4, { bob: 0.15 });
      at(giftBox(primary, 0xffd166, 0.55), 2.3, -1.25, 0.6, { spin: 0.25 }).rotation.y = 0.5;
      at(star(0xffd166, 0.22), -2.4, -1.0, 0.8, { spin: 0.8 });
      return { pieces, radius: 3.4 };
    }
    case "valentine": {
      at(heart(accent, 1.2), 0, 0.15, 0, { spin: 0.35, bob: 0.1 });
      at(heart(primary, 0.55), -2.1, 0.9, -0.6, { spin: -0.5 });
      at(heart(accent.clone().lerp(new THREE.Color(0xffffff), 0.45), 0.45), 2.0, 1.2, -0.8, {
        spin: 0.6,
      });
      at(heart(new THREE.Color(0xff8fab), 0.38), 1.7, -1.1, 0.6, { spin: -0.4 });
      const env = at(envelope(0xffe1e8, accent), -1.9, -1.0, 0.3, { bob: 0.08 });
      env.rotation.set(-0.15, 0.35, -0.12);
      return { pieces, radius: 3 };
    }
    case "voyage": {
      at(globe(new THREE.Color(0x7fb7e6), new THREE.Color(0x8fd18a)), 0, 0, 0, {
        spin: 0.18,
        bob: 0.06,
      });
      at(paperPlane(new THREE.Color(0xffffff).lerp(accent, 0.5)), 0, 0, 0, {
        orbit: { radius: 1.75, speed: 0.45, y: 0.55 },
        bob: 0.1,
        phase: 0.5,
      }).scale.setScalar(0.85);
      const s = at(suitcase(accent), 2.2, -1.25, 0.4, { bob: 0.08 });
      s.rotation.y = -0.5;
      at(star(GOLD, 0.2), -2.3, 1.2, -0.5, { spin: 0.6 });
      return { pieces, radius: 3 };
    }
    case "christmas": {
      at(tree(new THREE.Color(0x3f8f5f)), 0, -0.55, 0, { spin: 0.12, bob: 0.04 });
      at(bauble(accent, 0.75), -2.0, 0.7, 0.2, { spin: 0.4 });
      at(bauble(new THREE.Color(0xffd166), 0.55), 2.0, 1.0, -0.4, { spin: -0.4 });
      at(bauble(primary, 0.5), 1.8, -0.9, 0.6, { spin: 0.5 });
      at(giftBox(0xc0392b, 0xffd166, 0.5), -1.9, -1.2, 0.6, { spin: 0.2 }).rotation.y = -0.4;
      return { pieces, radius: 3 };
    }
    case "pets": {
      const b = at(bone(0xfff3df), 0, 0.2, 0, { spin: 0.25, bob: 0.12 });
      b.rotation.z = 0.25;
      at(paw(accent), -2.1, -0.6, 0.2, { spin: -0.2 });
      at(paw(primary), 2.1, 0.9, -0.4, { spin: 0.2 }).scale.setScalar(0.7);
      at(tennisBall(), 1.6, -1.2, 0.7, { spin: 1.0 });
      at(heart(new THREE.Color(0xff8fab), 0.3), -1.5, 1.3, -0.3, { spin: 0.5 });
      return { pieces, radius: 3 };
    }
    case "newyear": {
      at(discoBall(), 0, 0.15, 0, { spin: 0.35, bob: 0.06 });
      const glass1 = at(champagne(), -2.0, -0.8, 0.4, { bob: 0.06 });
      glass1.rotation.z = 0.18;
      const glass2 = at(champagne(), 2.0, -0.9, 0.3, { bob: 0.06 });
      glass2.rotation.z = -0.18;
      at(star(GOLD, 0.3), -1.6, 1.5, -0.5, { spin: 0.8 });
      at(star(GOLD, 0.2), 1.8, 1.4, -0.8, { spin: -0.9 });
      at(star(SILVER, 0.16), 2.6, 0.3, -1, { spin: 1.2 });
      return { pieces, radius: 3.1 };
    }
    case "anniversary": {
      const r1 = at(ring(GOLD, true), -0.25, 0.25, 0.4, { spin: 0.3, bob: 0.1 });
      r1.rotation.x = 0.3;
      const r2 = at(ring(0xf2d7a0, false), 0.55, 0.0, 0.2, { spin: -0.25, bob: 0.1 });
      r2.rotation.set(0.6, 0.9, 0.2);
      const f = at(photoFrame(GOLD, 0xbcd7f2, 0x9fcf9a), -2.1, -0.15, -0.6, { bob: 0.05 });
      f.rotation.set(0, 0.35, -0.06);
      at(heart(accent, 0.55), 2.0, 0.85, -0.4, { spin: 0.4 });
      at(heart(0xffc2cf, 0.32), 1.7, -1.15, 0.5, { spin: -0.5 });
      return { pieces, radius: 2.9 };
    }
    case "wedding": {
      const wc = at(cake(0xf1e6d6, WHITE, false), 0, -1.0, 0, { spin: 0.12, bob: 0.03 });
      wc.scale.setScalar(1.1);
      const sash = new THREE.Mesh(
        new THREE.CylinderGeometry(1.015, 1.015, 0.14, 48),
        clay(0xd8c49a, 0.4),
      );
      sash.position.y = -0.12;
      const sash2 = new THREE.Mesh(
        new THREE.CylinderGeometry(0.675, 0.675, 0.1, 48),
        clay(0xd8c49a, 0.4),
      );
      sash2.position.y = 0.6;
      wc.add(sash, sash2);
      const top = at(heart(accent, 0.22), 0, 0.85, 0, { spin: 0.5, bob: 0.03 });
      top.rotation.y = 0.3;
      const r1 = at(ring(GOLD, true), -2.0, 0.9, -0.3, { spin: 0.3, bob: 0.1 });
      r1.rotation.x = 0.3;
      r1.scale.setScalar(0.7);
      const r2 = at(ring(0xf6e3b5, false), -1.45, 0.75, -0.5, { spin: -0.25, bob: 0.1 });
      r2.rotation.set(0.5, 0.8, 0);
      r2.scale.setScalar(0.7);
      at(flower(WHITE, 0xffd166, 0.7), 2.0, 0.6, -0.3, { spin: 0.15 });
      at(
        flower(accent.clone().lerp(new THREE.Color(0xffffff), 0.45), 0xffd166, 0.55),
        2.1,
        -0.9,
        0.3,
        { spin: -0.15 },
      );
      at(flower(new THREE.Color(0xf5e6e8), 0xe9b949, 0.45), -2.0, -1.0, 0.5, { spin: 0.2 });
      return { pieces, radius: 2.9 };
    }
    case "bridal": {
      const cup = at(teacup(accent.clone().lerp(new THREE.Color(0xffffff), 0.4)), 0, -0.55, 0, {
        spin: 0.25,
        bob: 0.06,
      });
      cup.rotation.x = 0.35;
      cup.scale.setScalar(1.55);
      at(flower(accent, 0xffd166, 0.75), -2.1, 0.75, -0.2, { spin: 0.2 });
      at(flower(new THREE.Color(0xfff0f3), 0xffd166, 0.6), 2.0, 0.95, -0.5, { spin: -0.2 });
      at(flower(primary, WHITE, 0.5), 2.0, -1.0, 0.5, { spin: 0.3 });
      at(heart(0xffb3c6, 0.3), -1.7, -1.1, 0.5, { spin: 0.5 });
      for (let i = 0; i < 9; i++) {
        const pearl = new THREE.Mesh(new THREE.SphereGeometry(0.085, 20, 14), gloss(0xfff8f0));
        const a2 = Math.PI * 0.15 + (i / 8) * Math.PI * 0.7;
        at(pearl, Math.cos(a2) * 1.35, 0.95 - Math.sin(a2) * 0.35, 0.3, {
          bob: 0.04,
          phase: i * 0.35,
        });
      }
      return { pieces, radius: 3 };
    }
    default: {
      at(giftBox(accent, primary, 1), 0, -0.2, 0, { spin: 0.3, bob: 0.1 }).rotation.y = 0.5;
      at(heart(primary, 0.4), -1.8, 0.9, -0.4, { spin: 0.5 });
      at(star(GOLD, 0.25), 1.8, 1.0, -0.4, { spin: 0.7 });
      return { pieces, radius: 2.8 };
    }
  }
}

/* ---------- the scene ---------- */

export function createThemeScene(
  canvas: HTMLCanvasElement,
  kind: ThemeKind,
  colors: ThemeSceneColors,
  { still = false }: { still?: boolean } = {},
): ThemeScene {
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: true,
    preserveDrawingBuffer: still,
    powerPreference: "low-power",
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.NeutralToneMapping;
  renderer.toneMappingExposure = 1.05;

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  const env = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environment = env;
  scene.add(new THREE.HemisphereLight(0xffffff, 0xf3dce6, 1.6));
  const key = new THREE.DirectionalLight(0xfff4ec, 2.0);
  key.position.set(3, 5, 6);
  scene.add(key);
  const rim = new THREE.DirectionalLight(0xe7dcff, 1.0);
  rim.position.set(-5, 2, -4);
  scene.add(rim);

  const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 100);
  const root = new THREE.Group();
  scene.add(root);
  const { pieces } = compose(kind, colors);
  for (const p of pieces) root.add(p.obj);
  // Center the cluster and measure it, so every occasion fills the frame the same way.
  const box = new THREE.Box3().setFromObject(root);
  const center = box.getCenter(new THREE.Vector3());
  for (const p of pieces) p.obj.position.sub(center);
  const size = box.getSize(new THREE.Vector3());
  const bases = pieces.map((p) => p.obj.position.clone());
  const baseRot = pieces.map((p) => p.obj.rotation.clone());
  const baseScale = pieces.map((p) => p.obj.scale.clone());
  /* Play: per-piece jumps and heartbeats, a spin you can fling, sparkle boosts. */
  const jumps = pieces.map(() => ({ t0: -10, amp: 0, spins: 0 }));
  const beats = pieces.map(() => -10);
  let spinAngle = 0;
  let spinVel = 0;
  let boostUntil = -10;
  let clock = 0;
  let lastT = 0;
  const puffs: { mesh: THREE.Mesh; t0: number; dx: number }[] = [];
  const raycaster = new THREE.Raycaster();
  /** The biggest piece: the heart, the cake, the globe… it does the occasion's special move. */
  let star = 0;
  {
    let best = -1;
    pieces.forEach((p, i) => {
      const sz = new THREE.Box3().setFromObject(p.obj).getSize(new THREE.Vector3()).length();
      if (sz > best && !p.orbit) {
        best = sz;
        star = i;
      }
    });
  }

  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  let w = 0;
  let h = 0;
  function resize() {
    const rect = canvas.getBoundingClientRect();
    const nw = Math.max(1, Math.round(rect.width));
    const nh = Math.max(1, Math.round(rect.height));
    if (nw === w && nh === h) return;
    w = nw;
    h = nh;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    // Fit the cluster's box, with room for bobbing and the orbiting plane.
    const t = Math.tan((camera.fov * Math.PI) / 360);
    const fitH = (size.y / 2 + 0.35) / t;
    const fitW = (size.x / 2 + 0.35) / (t * camera.aspect);
    camera.position.set(0, 0.15, Math.max(fitH, fitW) + size.z / 2);
    camera.lookAt(0, 0, 0);
    camera.updateProjectionMatrix();
  }

  const pointer = { x: 0, y: 0, tx: 0, ty: 0 };
  const onPointer = (e: PointerEvent) => {
    pointer.tx = (e.clientX / window.innerWidth - 0.5) * 2;
    pointer.ty = (e.clientY / window.innerHeight - 0.5) * 2;
  };
  if (!still && !reduce) window.addEventListener("pointermove", onPointer, { passive: true });

  function pose(t: number) {
    clock = t;
    const dt = Math.min(0.05, Math.max(0, t - lastT));
    lastT = t;
    pointer.x += (pointer.tx - pointer.x) * 0.05;
    pointer.y += (pointer.ty - pointer.y) * 0.05;
    spinAngle += spinVel * dt;
    spinVel *= Math.pow(0.18, dt);
    // Ease back toward facing front once the fling dies down.
    if (Math.abs(spinVel) < 0.6) {
      const target = Math.round(spinAngle / (Math.PI * 2)) * Math.PI * 2;
      spinAngle += (target - spinAngle) * Math.min(1, dt * 2.2);
    }
    root.rotation.y = pointer.x * 0.25 + spinAngle;
    root.rotation.x = pointer.y * 0.12;
    const boost = t < boostUntil ? 1 : 0;
    pieces.forEach((p, i) => {
      const base = bases[i]!;
      const r0 = baseRot[i]!;
      const s0 = baseScale[i]!;
      const ph = p.phase ?? 0;
      // Jump with squash and stretch.
      const j = jumps[i]!;
      const jk = (t - j.t0) / 0.7;
      let lift = 0;
      let sy = 1;
      let extraSpin = 0;
      if (jk >= 0 && jk < 1) {
        lift = Math.sin(Math.PI * jk) * j.amp;
        sy = jk < 0.12 ? 1 - jk * 1.6 : jk > 0.9 ? 1 - (1 - jk) * 2 : 1 + Math.sin(Math.PI * jk) * 0.12;
        extraSpin = j.spins * Math.PI * 2 * (1 - Math.pow(1 - jk, 3));
      }
      // Heartbeat: two quick pulses.
      const bk = (t - beats[i]!) / 0.75;
      let pulse = 1;
      if (bk >= 0 && bk < 1) pulse = 1 + 0.22 * Math.max(0, Math.sin(bk * Math.PI * 4)) * (1 - bk * 0.5);
      p.obj.scale.set(s0.x * pulse * (2 - sy) ** 0.5, s0.y * pulse * sy, s0.z * pulse * (2 - sy) ** 0.5);
      if (p.orbit) {
        const a = t * p.orbit.speed * (1 + boost * 2.5) + ph;
        p.obj.position.set(
          Math.cos(a) * p.orbit.radius - center.x,
          p.orbit.y + Math.sin(t * 1.3) * 0.15 - center.y,
          Math.sin(a) * p.orbit.radius - center.z,
        );
        p.obj.rotation.set(0.55, -a, 0.25 + Math.sin(t * 1.3) * 0.2);
        return;
      }
      p.obj.position.y = base.y + Math.sin(t * 1.1 + ph) * (p.bob ?? 0) + lift;
      p.obj.rotation.y = r0.y + t * (p.spin ?? 0) * 0.6 + extraSpin;
      p.obj.rotation.z = r0.z + Math.sin(t * 0.7 + ph) * 0.05;
    });
    root.traverse((o) => {
      if (o.userData["flicker"])
        o.scale.set(1 + Math.sin(t * 17) * 0.08, 1.7 + Math.sin(t * 13) * 0.2, 1);
      if (o.userData["twinkle"] !== undefined) {
        const m = (o as THREE.Mesh).material as THREE.MeshStandardMaterial;
        m.emissiveIntensity =
          0.5 + 0.6 * (0.5 + 0.5 * Math.sin(t * (3 + boost * 9) + Number(o.userData["twinkle"]))) + boost * 0.8;
      }
      if (o.userData["bubble"] !== undefined) {
        const k = Number(o.userData["bubble"]);
        o.position.y = 1.2 + ((t * 0.35 + k * 0.15) % 0.85) * (1 + boost);
      }
    });
    for (let i = puffs.length - 1; i >= 0; i--) {
      const puff = puffs[i]!;
      const k = (t - puff.t0) / 1.6;
      if (k >= 1) {
        puff.mesh.parent?.remove(puff.mesh);
        puff.mesh.geometry.dispose();
        (puff.mesh.material as THREE.Material).dispose();
        puffs.splice(i, 1);
        continue;
      }
      puff.mesh.position.y += dt * 0.6;
      puff.mesh.position.x += dt * puff.dx;
      puff.mesh.scale.setScalar(0.4 + k * 1.6);
      (puff.mesh.material as THREE.MeshStandardMaterial).opacity = 0.55 * (1 - k);
    }
  }

  function jump(i: number, amp: number, delay = 0, spins = 0) {
    const j = jumps[i];
    if (!j) return;
    j.t0 = clock + delay;
    j.amp = amp;
    j.spins = spins;
  }

  /** Each occasion's special move, done by its main piece. */
  function signature(i: number) {
    switch (kind) {
      case "valentine":
      case "anniversary":
        beats[i] = clock;
        jump(i, 0.12);
        break;
      case "voyage":
        spinVel += 7;
        boostUntil = clock + 2.2;
        break;
      case "christmas":
      case "newyear":
        boostUntil = clock + 2.5;
        jump(i, 0.4, 0, 1);
        break;
      case "pets":
        jump(i, 0.55);
        jump(i, 0.3, 0.75);
        break;
      default:
        jump(i, 0.45, 0, 1);
    }
  }

  let raf = 0;
  let paused = false;
  // Start where the pre-rendered still was taken (t = 1.2s), so the fade from still to live doesn't jump.
  const start = performance.now() - 1200;
  function frame() {
    raf = 0;
    if (paused) return;
    resize();
    pose((performance.now() - start) / 1000);
    renderer.render(scene, camera);
    if (!reduce && !still) raf = requestAnimationFrame(frame);
  }
  const onVisibility = () => setPaused(document.hidden);
  document.addEventListener("visibilitychange", onVisibility);

  function setPaused(next: boolean) {
    paused = next;
    if (!paused && !raf) raf = requestAnimationFrame(frame);
  }

  resize();
  pose(1.2);
  renderer.render(scene, camera);
  if (!still && !reduce) raf = requestAnimationFrame(frame);

  const live = () => !reduce && !still;
  return {
    ready: Promise.resolve(),
    setPaused,
    poke(nx, ny) {
      if (!live()) return false;
      raycaster.setFromCamera(new THREE.Vector2(nx, -ny), camera);
      const hits = raycaster.intersectObjects(root.children, true);
      let hit = -1;
      if (hits[0]) {
        let o: THREE.Object3D | null = hits[0].object;
        while (o && hit < 0) {
          const found = pieces.findIndex((p) => p.obj === o);
          if (found >= 0) hit = found;
          o = o.parent;
        }
      }
      if (hit < 0) return false;
      if (hit === star) signature(hit);
      else jump(hit, 0.5, 0, Math.random() < 0.5 ? 1 : 0);
      pieces.forEach((_, i) => {
        if (i !== hit) jump(i, 0.12, 0.08 + Math.random() * 0.15);
      });
      return true;
    },
    fling(velocity) {
      if (!live()) return;
      spinVel += Math.max(-14, Math.min(14, velocity));
    },
    turn(radians) {
      if (!live()) return;
      spinAngle += radians;
      spinVel = 0;
    },
    celebrate() {
      if (!live()) return;
      pieces.forEach((_, i) => jump(i, 0.35 + Math.random() * 0.25, i * 0.07, i === star ? 1 : 0));
      if (kind === "valentine" || kind === "anniversary") beats[star] = clock + 0.3;
      boostUntil = clock + 2.5;
      spinVel += 4;
    },
    blowOut() {
      let any = false;
      root.traverse((o) => {
        if (!o.userData["flicker"] || !o.visible) return;
        any = true;
        o.visible = false;
        const wp = o.getWorldPosition(new THREE.Vector3());
        for (let k = 0; k < 3; k++) {
          const mesh = new THREE.Mesh(
            new THREE.SphereGeometry(0.06, 12, 10),
            new THREE.MeshStandardMaterial({ color: 0xdedede, transparent: true, opacity: 0.5, roughness: 1 }),
          );
          scene.add(mesh);
          mesh.position.copy(wp).add(new THREE.Vector3(0, 0.05 + k * 0.08, 0));
          puffs.push({ mesh, t0: clock + k * 0.12, dx: (Math.random() - 0.5) * 0.3 });
        }
      });
      return any;
    },
    relight() {
      root.traverse((o) => {
        if (o.userData["flicker"]) o.visible = true;
      });
    },
    snapshot() {
      resize();
      pose(1.2);
      renderer.render(scene, camera);
      return canvas.toDataURL("image/webp", 0.86);
    },
    dispose() {
      cancelAnimationFrame(raf);
      window.removeEventListener("pointermove", onPointer);
      document.removeEventListener("visibilitychange", onVisibility);
      scene.traverse((o) => {
        const m = o as THREE.Mesh;
        if (m.geometry) m.geometry.dispose();
        const mat = m.material;
        if (Array.isArray(mat)) mat.forEach((x) => x.dispose());
        else if (mat) (mat as THREE.Material).dispose();
      });
      env.dispose();
      pmrem.dispose();
      renderer.dispose();
    },
  };
}
