/**
 * Checks every clay figure for left/right symmetry: pairs of parts (ears, eye patches, cheeks,
 * paws, feet) should mirror each other across the face's center line. Prints parts whose mirror
 * twin is a little off (position, size or tilt), and how far the face (SVG eyes and cheeks)
 * sits from the body's own center.
 *   bun tools/art/symmetry.ts [id]
 */
import * as THREE from "three";
import { CLAY } from "@/lib/clay/scene";
import { CHARACTERS } from "@/themes/_shared/cast/library";

const only = process.argv[2];
/** Left/right differences that are meant to be there. */
const ON_PURPOSE: Record<string, string> = {
  giraffe: "spots are random on purpose",
  whale: "the spout sits over the blowhole, not the face",
  candle: "wax drips are random on purpose",
  person: "the hair has a side parting",
  "tzu-pom": "paw fluff is jittered like the coat",
};
const TOL_FIND = 6; // how far apart a "twin" may be and still count as one (box units)
const TOL_OK = 0.35; // anything closer than this is symmetric

type Part = { i: number; x: number; y: number; z: number; sx: number; sy: number; sz: number; rz: number; ry: number; color: string; kind: string };

function parts(obj: THREE.Object3D): Part[] {
  const out: Part[] = [];
  obj.updateMatrixWorld(true);
  obj.traverse((o) => {
    const m = o as THREE.Mesh;
    if (!m.isMesh) return;
    const p = new THREE.Vector3();
    const q = new THREE.Quaternion();
    const s = new THREE.Vector3();
    m.matrixWorld.decompose(p, q, s);
    const e = new THREE.Euler().setFromQuaternion(q);
    m.geometry.computeBoundingBox();
    const bb = m.geometry.boundingBox!.clone().applyMatrix4(m.matrixWorld);
    const c = bb.getCenter(new THREE.Vector3());
    const mat = m.material as THREE.MeshPhysicalMaterial;
    out.push({ i: out.length, x: c.x + 60, y: 60 - c.y, z: c.z, sx: s.x, sy: s.y, sz: s.z, rz: e.z, ry: e.y, color: mat.color?.getHexString() ?? "?", kind: m.geometry.type });
  });
  return out;
}

const f = (n: number) => n.toFixed(1);
let problems = 0;
for (const [id, recipe] of Object.entries(CLAY)) {
  if (only && id !== only) continue;
  if (/^(orn-|xtree)/.test(id)) continue;
  const spec = CHARACTERS.find((c) => c.id === id);
  if (!spec) continue;
  const face = spec.clay ?? spec;
  const axis = (face.eyes.l[0] + face.eyes.r[0]) / 2;
  const g = new THREE.Group();
  for (const o of recipe(spec.colors) as THREE.Object3D[]) g.add(o);
  const ps = parts(g);
  const notes: string[] = [];
  // Face itself: eyes level, cheeks mirrored, mouth on the center line.
  if (Math.abs(face.eyes.l[1] - face.eyes.r[1]) > 0.01) notes.push(`eyes not level: ${face.eyes.l[1]} vs ${face.eyes.r[1]}`);
  if (face.cheeks) {
    const cAxis = (face.cheeks.l[0] + face.cheeks.r[0]) / 2;
    if (Math.abs(cAxis - axis) > 0.01) notes.push(`cheeks centered on ${f(cAxis)}, eyes on ${f(axis)}`);
    if (Math.abs(face.cheeks.l[1] - face.cheeks.r[1]) > 0.01) notes.push(`cheeks not level`);
  }
  if (face.mouth && Math.abs(face.mouth[0] - axis) > 0.01) notes.push(`mouth at x ${face.mouth[0]}, eyes centered on ${f(axis)}`);
  // Parts with a near-mirror twin that isn't exact.
  const used = new Set<number>();
  // Fluff (sheep wool, Shih Tzu coats) is many jittered clumps of one color on purpose: skip it.
  const perColor = new Map<string, number>();
  for (const p of ps) perColor.set(p.color + p.kind, (perColor.get(p.color + p.kind) ?? 0) + 1);
  for (const p of ps) if ((perColor.get(p.color + p.kind) ?? 0) > 10) used.add(p.i);
  for (const a of ps) {
    if (used.has(a.i) || Math.abs(a.x - axis) < 1.2) continue;
    let best: Part | null = null;
    let bestD = Infinity;
    for (const b of ps) {
      if (b.i === a.i || used.has(b.i) || b.color !== a.color || b.kind !== a.kind) continue;
      if (Math.sign(b.x - axis) === Math.sign(a.x - axis)) continue;
      const d = Math.hypot(b.x - (2 * axis - a.x), b.y - a.y, b.z - a.z);
      if (d < bestD) {
        bestD = d;
        best = b;
      }
    }
    if (!best || bestD > TOL_FIND) continue;
    used.add(a.i).add(best.i);
    const size = Math.max(Math.abs(a.sx - best.sx), Math.abs(a.sy - best.sy), Math.abs(a.sz - best.sz));
    const tilt = Math.abs(a.rz + best.rz);
    if (bestD > TOL_OK || size > 0.05 || tilt > 0.02) {
      const [l, r] = a.x < best.x ? [a, best] : [best, a];
      notes.push(
        `${l.kind.replace("Geometry", "")} #${l.i}/#${r.i} #${l.color}: left (${f(l.x)},${f(l.y)}) right (${f(r.x)},${f(r.y)}), gaps from center ${f(axis - l.x)} vs ${f(r.x - axis)}` +
          (size > 0.05 ? `, size ${f(l.sx)}x${f(l.sy)} vs ${f(r.sx)}x${f(r.sy)}` : "") +
          (tilt > 0.02 ? `, tilt ${l.rz.toFixed(2)} vs ${r.rz.toFixed(2)}` : ""),
      );
    }
  }
  if (notes.length && ON_PURPOSE[id] && !only) {
    console.log(`\n${id}: ${notes.length} difference(s), on purpose (${ON_PURPOSE[id]})`);
  } else if (notes.length) {
    problems += notes.length;
    console.log(`\n${id} (face center x=${f(axis)})`);
    for (const n of notes) console.log(`  - ${n}`);
  }
}
console.log(`\n${problems} things to look at`);
