/**
 * The clay modelling kit: matte material and soft shapes, all in the shared
 * 120x120 character box (x right, y down, z towards the viewer). Recipes in
 * scene.ts, animals.ts and objects.ts are built from these.
 */
import * as THREE from "three";
import { mergeVertices } from "three/examples/jsm/utils/BufferGeometryUtils.js";

/* ---------- materials ---------- */

const mats = new Map<string, THREE.Material>();
/** Matte clay: rough, a soft sheen at grazing angles, no hard highlight. */
export function clay(hex: string, opts: { rough?: number; sheen?: number; gloss?: number } = {}) {
  const key = `${hex}|${opts.rough ?? ""}|${opts.sheen ?? ""}|${opts.gloss ?? ""}`;
  let m = mats.get(key);
  if (!m) {
    m = new THREE.MeshPhysicalMaterial({
      color: new THREE.Color(hex),
      roughness: opts.rough ?? 0.62,
      metalness: 0,
      sheen: opts.sheen ?? 0.3,
      sheenRoughness: 0.75,
      sheenColor: new THREE.Color("#ffffff"),
      clearcoat: opts.gloss ?? 0.04,
      clearcoatRoughness: 0.6,
    });
    mats.set(key, m);
  }
  return m;
}

/* ---------- shapes (all in box units) ---------- */

export type V3 = [number, number, number];
/** Box coords (y down) to world (y up). */
export const W = (x: number, y: number, z = 0) => new THREE.Vector3(x - 60, 60 - y, z);

export function mesh(g: THREE.BufferGeometry, m: THREE.Material) {
  const o = new THREE.Mesh(g, m);
  o.castShadow = true;
  o.receiveShadow = true;
  return o;
}

/** An ellipsoid: width, height and depth in box units, centered at (x, y, z). */
export function blob(at: V3, size: V3, color: string, rot: V3 = [0, 0, 0], opts?: Parameters<typeof clay>[1]) {
  const o = mesh(new THREE.SphereGeometry(0.5, 72, 54), clay(color, opts));
  o.position.copy(W(...at));
  o.scale.set(...size);
  o.rotation.set(rot[0], rot[1], -rot[2]);
  return o;
}

/**
 * An egg/bean body: round on top, wide and a little flat at the bottom, the
 * shape most of the figures share. `bulge` pushes the widest point down.
 */
export function egg(at: V3, w: number, h: number, d: number, color: string, { bulge = 0.18, flat = 0.22 } = {}) {
  const pts: THREE.Vector2[] = [];
  const N = 64;
  for (let i = 0; i <= N; i++) {
    const t = i / N; // 0 bottom .. 1 top
    const y = t * 2 - 1;
    // Superellipse profile, widest a little below the middle, flattened underneath.
    const yy = (y + bulge) / (1 + bulge * Math.sign(y + bulge));
    let r = Math.pow(Math.max(0, 1 - Math.pow(Math.abs(yy), 2.3)), 1 / 2.3);
    if (t < flat) r *= 1 - Math.pow((flat - t) / flat, 3) * 0.08;
    pts.push(new THREE.Vector2(Math.max(0.0001, r) * 0.5, y * 0.5));
  }
  const g = new THREE.LatheGeometry(pts, 96);
  const o = mesh(g, clay(color));
  o.position.copy(W(...at));
  o.scale.set(w, h, d);
  return o;
}

/** A capsule (arms, legs, ears) from one point to another, radius r. */
export function limb(a: V3, b: V3, r: number, color: string) {
  const A = W(...a);
  const B = W(...b);
  const len = Math.max(0.01, A.distanceTo(B));
  const o = mesh(new THREE.CapsuleGeometry(r, len, 16, 36), clay(color));
  o.position.copy(A.clone().add(B).multiplyScalar(0.5));
  o.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), B.clone().sub(A).normalize());
  return o;
}

/** A rounded cone (cat and fox ears). */
export function cone(at: V3, w: number, h: number, d: number, color: string, tilt = 0) {
  const pts: THREE.Vector2[] = [];
  for (let i = 0; i <= 40; i++) {
    const t = i / 40;
    const r = Math.sin(Math.acos(1 - Math.min(1, t * 1.05))) * (1 - t) ** 0.85 * 0.5 + 0.0001;
    pts.push(new THREE.Vector2(r, t - 0.5));
  }
  const o = mesh(new THREE.LatheGeometry(pts, 48), clay(color));
  o.position.copy(W(...at));
  o.scale.set(w, h, d);
  o.rotation.z = -tilt;
  return o;
}

/** A torus (cup handle, rings). */
export function torus(at: V3, R: number, r: number, color: string, rot: V3 = [0, 0, 0], arc = Math.PI * 2) {
  const o = mesh(new THREE.TorusGeometry(R, r, 28, 72, arc), clay(color));
  o.position.copy(W(...at));
  o.rotation.set(rot[0], rot[1], -rot[2]);
  return o;
}

/** A pillowy extrusion of a 2D outline (box coords, y down). */
export function pillow(outline: [number, number][], depth: number, color: string, z = 0, bevel = 4) {
  const s = new THREE.Shape(outline.map(([x, y]) => new THREE.Vector2(x - 60, 60 - y)));
  const g = new THREE.ExtrudeGeometry(s, { depth, bevelEnabled: true, bevelThickness: bevel, bevelSize: bevel * 0.9, bevelSegments: 12, curveSegments: 48 });
  g.translate(0, 0, z - depth / 2);
  const merged = mergeVertices(g);
  merged.computeVertexNormals();
  return mesh(merged, clay(color));
}

/** Little balls of clay scattered over an ellipsoid's surface: fur, fluff, curls. */
export function fluff(
  center: V3,
  radii: V3,
  { count, size, color, seed = 1, front = 0.15, from = 0, to = Math.PI * 2, rows = 1 }: { count: number; size: [number, number]; color: string; seed?: number; front?: number; from?: number; to?: number; rows?: number },
) {
  const g = new THREE.Group();
  let s = seed * 9301 + 49297;
  const rnd = () => ((s = (s * 9301 + 49297) % 233280) / 233280);
  for (let r = 0; r < rows; r++) {
    for (let i = 0; i < count; i++) {
      const a = from + ((to - from) * (i + rnd() * 0.6)) / count;
      const tilt = (r / Math.max(1, rows)) * 0.9 - 0.3 + rnd() * 0.2;
      const x = center[0] + Math.cos(a) * radii[0] * Math.cos(tilt);
      const y = center[1] + Math.sin(a) * radii[1] * Math.cos(tilt);
      const z = center[2] + radii[2] * (front + Math.sin(tilt) * 0.5);
      const k = size[0] + rnd() * (size[1] - size[0]);
      g.add(blob([x, y, z], [k, k * 0.92, k * 0.9], color));
    }
  }
  return g;
}

/** A tapering tube of clay along a few points (tails), rounded at both ends. */
export function tube(points: V3[], r0: number, r1: number, color: string) {
  const curve = new THREE.CatmullRomCurve3(points.map((p) => W(...p)));
  const seg = 64;
  const radial = 28;
  const g = new THREE.TubeGeometry(curve, seg, 1, radial, false);
  const pos = g.attributes["position"]!;
  const v = new THREE.Vector3();
  for (let i = 0; i <= seg; i++) {
    const t = i / seg;
    const c = curve.getPointAt(t);
    const r = r0 + (r1 - r0) * t;
    for (let j = 0; j <= radial; j++) {
      const k = i * (radial + 1) + j;
      v.fromBufferAttribute(pos, k).sub(c).multiplyScalar(r).add(c);
      pos.setXYZ(k, v.x, v.y, v.z);
    }
  }
  g.computeVertexNormals();
  const end0 = curve.getPointAt(0);
  const end1 = curve.getPointAt(1);
  const cap = (p: THREE.Vector3, r: number) => {
    const m = mesh(new THREE.SphereGeometry(r, 32, 24), clay(color));
    m.position.copy(p);
    return m;
  };
  return [mesh(g, clay(color)), cap(end0, r0), cap(end1, r1)];
}

/** A tail that curls up and over, from the back of the body. */
export function curl(at: V3, r: number, color: string, lift = 1) {
  const [x, y, z] = at;
  return tube(
    [
      [x, y, z],
      [x + 10, y - 4, z - 2],
      [x + 15, y - 16 * lift, z - 3],
      [x + 11, y - 26 * lift, z - 3],
      [x + 5, y - 27 * lift, z - 2],
    ],
    r,
    r * 0.75,
    color,
  );
}

export type ClayRecipe = (c: { primary: string; secondary: string; skin: string }) => THREE.Object3D[];

export const feet = (y: number, color: string, xs = [46, 74], size: V3 = [17, 10, 16]) => xs.map((x) => blob([x, y, 10], size, color));


export function shade(hex: string, amt: number) {
  const n = parseInt(hex.slice(1), 16);
  const r = Math.max(0, Math.min(255, (n >> 16) + amt));
  const g = Math.max(0, Math.min(255, ((n >> 8) & 255) + amt));
  const b = Math.max(0, Math.min(255, (n & 255) + amt));
  return `#${((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1)}`;
}


/** A lathe (pots, cups, candles): profile points [radius, y] in -0.5..0.5, scaled to w x h x d. */
export function lathe(profile: [number, number][], at: V3, size: V3, color: string, tiltX = 0, opts?: Parameters<typeof clay>[1]) {
  const o = mesh(new THREE.LatheGeometry(profile.map(([r, y]) => new THREE.Vector2(Math.max(0.0001, r), y)), 96), clay(color, opts));
  o.position.copy(W(...at));
  o.scale.set(...size);
  o.rotation.x = tiltX;
  return o;
}

/** A rounded box (robots, cameras, suitcases). */
export function rbox(at: V3, size: V3, radius: number, color: string, rot: V3 = [0, 0, 0], opts?: Parameters<typeof clay>[1]) {
  const [w, h, d] = size;
  const r = Math.min(radius, w / 2, h / 2, d / 2) - 0.01;
  const s = new THREE.Shape();
  const x0 = -w / 2 + r;
  const y0 = -h / 2 + r;
  s.absarc(x0, y0, r, Math.PI, Math.PI * 1.5, false);
  s.absarc(-x0, y0, r, Math.PI * 1.5, Math.PI * 2, false);
  s.absarc(-x0, -y0, r, 0, Math.PI * 0.5, false);
  s.absarc(x0, -y0, r, Math.PI * 0.5, Math.PI, false);
  const g = new THREE.ExtrudeGeometry(s, { depth: Math.max(0.01, d - 2 * r), bevelEnabled: true, bevelThickness: r, bevelSize: r * 0.98, bevelSegments: 10, curveSegments: 24 });
  g.translate(0, 0, -(d - 2 * r) / 2);
  const merged = mergeVertices(g);
  merged.computeVertexNormals();
  const o = mesh(merged, clay(color, opts));
  o.position.copy(W(...at));
  o.rotation.set(rot[0], rot[1], -rot[2]);
  return o;
}

/** A rounded star or flower outline (points, inner radius ratio). */
export function starOutline(cx: number, cy: number, R: number, k: number, points = 5, rot = -Math.PI / 2): [number, number][] {
  const out: [number, number][] = [];
  const N = points * 2;
  for (let i = 0; i < N * 6; i++) {
    const a = rot + (i / (N * 6)) * Math.PI * 2;
    // Smooth blend between the outer and inner radius, so the tips are soft.
    const t = (Math.cos(a * points - rot * points) + 1) / 2;
    const r = R * (k + (1 - k) * Math.pow(t, 1.6));
    out.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]);
  }
  return out;
}

/** A heart outline in box coords. */
export function heartOutline(cx: number, cy: number, s: number): [number, number][] {
  const out: [number, number][] = [];
  for (let i = 0; i < 120; i++) {
    const t = (i / 120) * Math.PI * 2;
    const x = 16 * Math.sin(t) ** 3;
    const y = -(13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t));
    out.push([cx + (x / 17) * s, cy + (y / 17) * s]);
  }
  return out;
}

/** Glossy dark bits: noses, pupils on stalks, lenses. */
export const GLOSS = { rough: 0.35, gloss: 0.6 };
