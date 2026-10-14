/**
 * Bo in 3D: a soft, clay-like gift box. Loaded only in the browser (dynamic import
 * from components/Bo3D.tsx).
 *
 * Bo is modeled in Spline and exported to /models/bo.glb with named parts (body, lid,
 * bow, arm_left, arm_right, leg_left, leg_right, eyes, cheeks, mouth). If that file is
 * missing or fails to load, the same Bo is built here from simple shapes instead.
 *
 *   const bo = createBoScene(canvas, { lidColor: "#F6A5B9", notes: true });
 *   await bo.ready;
 *   bo.setMood("wave");          // "idle" | "wave" | "celebrate"
 *   bo.setStory(1.6);            // optional scroll story, 0..4 (see storyFrame)
 *   bo.setAccessory("party_hat");
 *   bo.setPose({ squash: 0.8 }); // hops, flips and flails (see BoPose)
 *   bo.dispose();
 */
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import type { BoAccessory } from "./accessories";

export type BoMood = "idle" | "wave" | "celebrate";

/** Cute faces. "smile" is the resting face; the others play for a moment. */
export type BoFace = "smile" | "wink" | "happy" | "surprised" | "blep" | "love" | "dizzy" | "sleepy" | "yawn";

/** "stage" shows Bo standing on a soft shadow; "buddy" is a tight, groundless frame for the hopping mascot. */
export type BoFraming = "stage" | "buddy";

export type BoSceneOptions = {
  lidColor?: string;
  /** Floating pastel notes around Bo (and used by the story). */
  notes?: boolean;
  /** Follow the pointer with a gentle head turn. */
  followPointer?: boolean;
  mood?: BoMood;
  framing?: BoFraming;
  /** Pull a cute face (wink, blep, heart eyes...) every few seconds. Default true. */
  cute?: boolean;
};

/** Live pose knobs, layered on top of the mood/story animation. All default to "standing still". */
export type BoPose = {
  /** 1 = normal. Below 1 squashes, above 1 stretches (volume kept). Pivots at the feet. */
  squash: number;
  /** 0..1 airborne: arms up, feet tucked. */
  tuck: number;
  /** 0..1 arms windmill (wobbling on an edge, scrambling). */
  flail: number;
  /** 0..1 little legs run. */
  run: number;
  /** Forward flip, radians, around Bo's middle. */
  flip: number;
  /** Side lean, radians, around Bo's middle. */
  lean: number;
  /** Yaw in radians to face where he's going; null follows the pointer. */
  turn: number | null;
  /** 0..1 holding a little note in front of him. */
  hold: number;
  /** Lid open angle in radians (pops up at the back hinge). */
  lid: number;
  /** 0..1 both arms up (cheering). */
  cheer: number;
  /** -1..1 points one arm out to that side (0 = not pointing). */
  point: number;
  /** Bow spin speed, turns per second (dizzy). */
  bowSpin: number;
  /** Where the eyes look, -1..1 each way; null follows the pointer. */
  look: [number, number] | null;
};

export type BoScene = {
  /** Resolves once Bo is on screen (the Spline model, or the built-in fallback). */
  ready: Promise<void>;
  setLidColor: (hex: string) => void;
  setMood: (mood: BoMood) => void;
  /** 0 hero, 1 pick a theme, 2 friends add notes, 3 wrap it up, 4 they open it. */
  setStory: (value: number | null) => void;
  /** Read the story value every frame (e.g. from scroll), without React re-renders. */
  setStorySource: (source: (() => number | null) | null) => void;
  /** A small prop on the lid for the current theme, or null for none. */
  setAccessory: (name: BoAccessory | null) => void;
  setPose: (pose: Partial<BoPose>) => void;
  /** Pull a face for a moment (ms), then go back to smiling. "smile" clears it. */
  setFace: (face: BoFace, ms?: number) => void;
  /** Render right now and return the frame as an image (for still renders of Bo). */
  snapshot: (type?: string, quality?: number) => string;
  /** The bow flops, like after a landing. */
  wiggleBow: () => void;
  /** Where Bo's feet are on the canvas, as 0..1 fractions of its width and height. */
  feetPoint: () => { x: number; y: number };
  setPaused: (paused: boolean) => void;
  dispose: () => void;
};

const BO_MODEL_URL = "/models/bo.glb";
const ACCESSORY_URL = (name: BoAccessory) => `/models/accessories/${name}.glb`;
/** Bo's height in scene units (feet to bow), the size the Spline model is scaled to. */
const BO_HEIGHT = 2.45;
const ACCESSORY_HEIGHT = 0.8;
const MODEL_TIMEOUT_MS = 4000;
/** Filled in at build time from public/models (see vite.config.ts). */
declare const __BO_MODEL_FILES__: string[];
const MODEL_FILES = new Set<string>(typeof __BO_MODEL_FILES__ === "undefined" ? [] : __BO_MODEL_FILES__);
/** Skip the request entirely when the file isn't in the build. */
function loadIfShipped(url: string) {
  return MODEL_FILES.has(url) ? loadGltf(url) : Promise.resolve(null);
}

const PASTELS = [0xffe8b0, 0xd5f0e3, 0xd9e8fb, 0xe6dcf7, 0xffd9c8, 0xfbd3dc];

/** A box whose corners are pushed onto spheres, so it reads as soft clay. */
function roundedBox(w: number, h: number, d: number, r: number, seg: number) {
  const g = new THREE.BoxGeometry(w, h, d, seg, seg, seg);
  const p = g.attributes["position"] as THREE.BufferAttribute;
  const n = g.attributes["normal"] as THREE.BufferAttribute;
  const v = new THREE.Vector3();
  const c = new THREE.Vector3();
  const dir = new THREE.Vector3();
  const ix = w / 2 - r;
  const iy = h / 2 - r;
  const iz = d / 2 - r;
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
    n.setXYZ(i, dir.x, dir.y, dir.z);
  }
  p.needsUpdate = true;
  n.needsUpdate = true;
  return g;
}

export function webglAvailable() {
  try {
    const c = document.createElement("canvas");
    return !!(c.getContext("webgl2") || c.getContext("webgl"));
  } catch {
    return false;
  }
}

const clay = (hex: THREE.ColorRepresentation, roughness = 0.62) =>
  new THREE.MeshStandardMaterial({ color: hex, roughness, metalness: 0 });

function addMesh(
  parent: THREE.Object3D,
  geo: THREE.BufferGeometry,
  mat: THREE.Material,
  x: number,
  y: number,
  z: number,
  shadow = true,
) {
  const m = new THREE.Mesh(geo, mat);
  m.position.set(x, y, z);
  m.castShadow = shadow;
  m.receiveShadow = shadow;
  parent.add(m);
  return m;
}

/* ---------- Loading the Spline files (shared by every Bo on the page) ---------- */

let modelPromise: Promise<THREE.Group | null> | null = null;
const accessoryFiles = new Map<BoAccessory, Promise<THREE.Group | null>>();

function loadGltf(url: string): Promise<THREE.Group | null> {
  return new GLTFLoader()
    .loadAsync(url)
    .then((gltf) => {
      // Shared between scenes: never dispose these geometries when one Bo goes away.
      gltf.scene.traverse((o) => {
        const m = o as THREE.Mesh;
        if (m.isMesh) m.geometry.userData["shared"] = true;
      });
      return gltf.scene;
    })
    .catch(() => null);
}

function loadBoModel() {
  modelPromise ??= loadIfShipped(BO_MODEL_URL);
  return modelPromise;
}

/** Swap exported materials for our matte clay, keeping each part's color (and any glow). */
function clayify(root: THREE.Object3D) {
  root.traverse((o) => {
    const mesh = o as THREE.Mesh;
    if (!mesh.isMesh) return;
    const src = (Array.isArray(mesh.material) ? mesh.material[0] : mesh.material) as THREE.MeshStandardMaterial | undefined;
    const shiny = /shine/i.test(mesh.name);
    const mat = clay(src?.color ?? 0xffffff, shiny ? 0.25 : /eye|mouth/i.test(mesh.name) ? 0.38 : 0.62);
    if (src?.emissive && src.emissive.getHex() !== 0) {
      mat.emissive.copy(src.emissive);
      mat.emissiveIntensity = src.emissiveIntensity ?? 1;
    }
    mesh.material = mat;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
  });
}

/** Scale and seat a loaded accessory so it stands on y=0 at the given height. */
function fitToHeight(obj: THREE.Object3D, height: number) {
  const holder = new THREE.Group();
  holder.add(obj);
  obj.position.set(0, 0, 0);
  obj.rotation.set(0, 0, 0);
  obj.scale.setScalar(1);
  obj.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(obj);
  const size = box.getSize(new THREE.Vector3());
  const s = height / Math.max(1e-6, size.y);
  obj.scale.setScalar(s);
  obj.position.set(-((box.min.x + box.max.x) / 2) * s, -box.min.y * s, -((box.min.z + box.max.z) / 2) * s);
  return holder;
}

/* ---------- The rig: the parts the animation drives ---------- */

type Rig = {
  root: THREE.Object3D;
  body: THREE.Object3D;
  lid: THREE.Object3D;
  lidRestY: number;
  bow: THREE.Object3D;
  arms: { pivot: THREE.Object3D; side: number }[];
  legs: { pivot: THREE.Object3D; side: number }[];
  /** Blinks by squashing these (used when the face parts aren't found). */
  eyes: { obj: THREE.Object3D; restY: number }[];
  face: FaceRig | null;
  held: THREE.Object3D;
  lidMat: THREE.MeshStandardMaterial | null;
  mount: THREE.Object3D;
  /** Rig-local units per scene unit (the Spline model is ~100x bigger before scaling). */
  unit: number;
  /** The loaded file, to look for accessories baked into it. */
  file: THREE.Group | null;
};

type FaceRig = {
  /** Per eye: the open parts (eye + shine), the closed ^ arc, the heart, and its rest height. */
  eyes: {
    open: THREE.Object3D[];
    openRest: THREE.Vector3[];
    closed: THREE.Object3D;
    closedRestY: number;
    heart: THREE.Object3D;
    spiral: THREE.Object3D;
    restY: number;
    /** How far the pupil may wander, in its parent's units. */
    reach: number;
  }[];
  smile: THREE.Object3D | null;
  smileRest: THREE.Vector3;
  o: THREE.Object3D;
  tongue: THREE.Object3D;
  cheeks: { obj: THREE.Object3D; rest: THREE.Vector3 }[];
};

/** Size of a mesh in its parent's units. */
function meshSize(m: THREE.Mesh) {
  m.geometry.computeBoundingBox();
  const size = m.geometry.boundingBox!.getSize(new THREE.Vector3());
  return size.multiply(m.scale);
}

function heartGeometry(w: number) {
  const s = w / 2;
  const h = new THREE.Shape();
  h.moveTo(0, -s * 0.9);
  h.bezierCurveTo(-s * 1.1, -s * 0.15, -s * 1.05, s * 0.85, -s * 0.5, s * 0.85);
  h.bezierCurveTo(-s * 0.15, s * 0.85, 0, s * 0.55, 0, s * 0.4);
  h.bezierCurveTo(0, s * 0.55, s * 0.15, s * 0.85, s * 0.5, s * 0.85);
  h.bezierCurveTo(s * 1.05, s * 0.85, s * 1.1, -s * 0.15, 0, -s * 0.9);
  const geo = new THREE.ExtrudeGeometry(h, { depth: s * 0.4, bevelEnabled: true, bevelSize: s * 0.12, bevelThickness: s * 0.12, bevelSegments: 3 });
  geo.center();
  return geo;
}

/**
 * Extra face parts (closed eyes, heart eyes, an "o" mouth, a tongue), sized and
 * placed from Bo's own eyes and mouth so they fit the Spline model and the built-in one.
 */
function buildFace(eyes: (THREE.Mesh | null)[], shines: (THREE.Object3D | null)[], mouth: THREE.Mesh | null, cheeks: THREE.Object3D[]): FaceRig | null {
  const heartMat = clay(0xf25c84, 0.45);
  const tongueMat = clay(0xf27a9b, 0.5);
  const out: FaceRig["eyes"] = [];
  eyes.forEach((eye, i) => {
    if (!eye?.parent) return;
    const size = meshSize(eye);
    const w = size.x;
    const arc = new THREE.Mesh(new THREE.TorusGeometry(w * 0.42, w * 0.12, 8, 24, Math.PI), eye.material);
    arc.position.copy(eye.position);
    arc.position.y -= size.y * 0.1;
    arc.position.z += size.z * 0.25;
    arc.visible = false;
    eye.parent.add(arc);
    const heart = new THREE.Mesh(heartGeometry(w * 1.35), heartMat);
    heart.position.copy(eye.position);
    heart.position.z += size.z * 0.3;
    heart.visible = false;
    eye.parent.add(heart);
    const spiralPts: THREE.Vector3[] = [];
    for (let k = 0; k <= 60; k++) {
      const a = (k / 60) * Math.PI * 5;
      const rr = (k / 60) * w * 0.5;
      spiralPts.push(new THREE.Vector3(Math.cos(a) * rr, Math.sin(a) * rr, 0));
    }
    const spiral = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(spiralPts), 60, w * 0.065, 6), eye.material);
    spiral.position.copy(eye.position);
    spiral.position.z += size.z * 0.3;
    spiral.visible = false;
    eye.parent.add(spiral);
    const open: THREE.Object3D[] = [eye];
    if (shines[i]) open.push(shines[i]!);
    out.push({
      open,
      openRest: open.map((o) => o.position.clone()),
      closed: arc,
      closedRestY: arc.position.y,
      heart,
      spiral,
      restY: eye.scale.y,
      reach: w * 0.22,
    });
  });
  if (out.length < 2) return null;

  const ref = mouth ?? (eyes[0] as THREE.Mesh);
  const parent = ref.parent!;
  const r = mouth ? meshSize(mouth).x / 2 : meshSize(ref).x * 0.5;
  const base = mouth ? mouth.position.clone() : new THREE.Vector3(0, ref.position.y - r * 1.4, ref.position.z);
  const inkMat = (mouth?.material ?? (eyes[0] as THREE.Mesh).material) as THREE.Material;
  const o = new THREE.Mesh(new THREE.TorusGeometry(r * 0.5, r * 0.2, 10, 24), inkMat);
  o.position.set(base.x, base.y - r * 0.55, base.z);
  o.visible = false;
  parent.add(o);
  const tongue = new THREE.Mesh(new THREE.SphereGeometry(r * 0.42, 16, 12), tongueMat);
  tongue.scale.set(1, 0.8, 0.45);
  tongue.position.set(base.x + r * 0.15, base.y - r * 1.15, base.z + r * 0.1);
  tongue.visible = false;
  parent.add(tongue);
  return {
    eyes: out,
    smile: mouth,
    smileRest: mouth ? mouth.scale.clone() : new THREE.Vector3(1, 1, 1),
    o,
    tongue,
    cheeks: cheeks.map((obj) => ({ obj, rest: obj.scale.clone() })),
  };
}

/** A little pastel note Bo can hold up. */
function buildHeldNote(unit: number) {
  const g = new THREE.Group();
  addMesh(g, roundedBox(0.62, 0.44, 0.05, 0.04, 2), clay(0xffe8b0), 0, 0, 0);
  const line = new THREE.BoxGeometry(0.38, 0.035, 0.01);
  const lineMat = clay(0xb9a9a1);
  addMesh(g, line, lineMat, 0, 0.07, 0.03, false);
  addMesh(g, line, lineMat, -0.05, -0.04, 0.03, false).scale.x = 0.7;
  addMesh(g, new THREE.SphereGeometry(0.05, 12, 8), clay(0xc2366b), 0.2, 0.13, 0.03, false).scale.z = 0.4;
  g.position.set(0, 0.86 * unit, 0.95 * unit);
  g.rotation.x = -0.15;
  g.scale.setScalar(unit);
  g.visible = false;
  return g;
}

function buildCodeRig(lidColor: THREE.Color): Rig {
  const root = new THREE.Group();
  const ink = clay(0x2b2522, 0.4);
  const white = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.3 });
  const lidMat = clay(lidColor.clone());
  const ribbonMat = clay(0xef7f99);
  const bodyMat = clay(0xfffaf4);
  const cheekMat = clay(0xf6a3b5);
  const shoeMat = clay(0xd9607d);

  const body = new THREE.Group();
  root.add(body);
  addMesh(body, roundedBox(1.6, 1.4, 1.4, 0.24, 8), bodyMat, 0, 1.0, 0);
  addMesh(body, roundedBox(0.3, 1.4, 1.44, 0.09, 4), ribbonMat, 0, 1.0, 0);
  // The opening on top of the box, seen when the lid lifts.
  addMesh(body, roundedBox(1.16, 0.02, 0.98, 0.01, 1), clay(0xc9939f, 0.9), 0, 1.716, 0, false);
  addMesh(body, roundedBox(0.96, 0.02, 0.78, 0.01, 1), clay(0xa97582, 0.95), 0, 1.722, 0, false);

  const face = new THREE.Group();
  face.position.set(0, 0, 0.72);
  body.add(face);
  const eyeGeo = new THREE.SphereGeometry(0.11, 24, 16);
  const shineGeo = new THREE.SphereGeometry(0.035, 12, 8);
  const cheekGeo = new THREE.SphereGeometry(0.12, 20, 12);
  const eyes: Rig["eyes"] = [];
  const eyeMeshes: THREE.Mesh[] = [];
  const shineMeshes: THREE.Mesh[] = [];
  const cheeks: THREE.Mesh[] = [];
  for (const x of [-0.36, 0.36]) {
    const eye = addMesh(face, eyeGeo, ink, x, 1.12, 0, false);
    eye.scale.set(1, 1.15, 0.55);
    eyes.push({ obj: eye, restY: 1.15 });
    eyeMeshes.push(eye);
    shineMeshes.push(addMesh(face, shineGeo, white, x + 0.035, 1.17, 0.06, false));
    const cheek = addMesh(face, cheekGeo, cheekMat, x * 1.5, 0.9, -0.01, false);
    cheek.scale.set(1, 0.62, 0.3);
    cheeks.push(cheek);
  }
  const smile = addMesh(face, new THREE.TorusGeometry(0.11, 0.028, 10, 28, Math.PI), ink, 0, 0.98, 0.03, false);
  smile.rotation.z = Math.PI;
  const faceRig = buildFace(eyeMeshes, shineMeshes, smile, cheeks);

  /* The lid hinges at the back so it can open. */
  const lidPivot = new THREE.Group();
  lidPivot.position.set(0, 1.66, -0.78);
  root.add(lidPivot);
  const lid = new THREE.Group();
  lid.position.set(0, 0.12, 0.78);
  lidPivot.add(lid);
  // A real lid: a thin top with walls around it, hollow underneath, so it reads as a cap when it opens.
  addMesh(lid, roundedBox(1.8, 0.12, 1.6, 0.06, 4), lidMat, 0, 0.13, 0);
  for (const z of [-0.75, 0.75]) addMesh(lid, roundedBox(1.8, 0.38, 0.1, 0.05, 3), lidMat, 0, 0, z);
  for (const x of [-0.85, 0.85]) addMesh(lid, roundedBox(0.1, 0.38, 1.6, 0.05, 3), lidMat, x, 0, 0);
  addMesh(lid, roundedBox(1.62, 0.02, 1.42, 0.01, 1), clay(0xe58aa2, 0.8), 0, 0.064, 0, false);
  addMesh(lid, roundedBox(0.32, 0.14, 1.62, 0.06, 3), ribbonMat, 0, 0.13, 0);
  for (const z of [-0.76, 0.76]) addMesh(lid, roundedBox(0.32, 0.4, 0.12, 0.05, 3), ribbonMat, 0, 0, z);
  const bow = new THREE.Group();
  bow.position.set(0, 0.32, 0);
  lid.add(bow);
  const loopGeo = new THREE.TorusGeometry(0.2, 0.085, 16, 36);
  for (const s of [-1, 1]) {
    const loop = addMesh(bow, loopGeo, ribbonMat, s * 0.23, 0.08, 0);
    loop.scale.set(1.15, 0.8, 0.7);
    loop.rotation.set(0, s * 0.45, s * 0.35);
  }
  addMesh(bow, new THREE.SphereGeometry(0.13, 20, 16), ribbonMat, 0, 0.02, 0);

  /* Arms (pivot at the shoulder) and legs (pivot at the hip) */
  const arms: Rig["arms"] = [];
  const legs: Rig["legs"] = [];
  for (const s of [-1, 1]) {
    const shoulder = new THREE.Group();
    shoulder.position.set(s * 0.82, 1.2, 0);
    root.add(shoulder);
    const arm = addMesh(shoulder, new THREE.CapsuleGeometry(0.075, 0.32, 8, 16), bodyMat, 0, -0.24, 0);
    addMesh(arm, new THREE.SphereGeometry(0.11, 18, 12), bodyMat, 0, -0.24, 0);
    arms.push({ pivot: shoulder, side: s });
    const hip = new THREE.Group();
    hip.position.set(s * 0.36, 0.32, 0);
    root.add(hip);
    addMesh(hip, new THREE.CapsuleGeometry(0.075, 0.2, 8, 16), ink, 0, -0.12, 0);
    const shoe = addMesh(hip, new THREE.SphereGeometry(0.15, 20, 14), shoeMat, 0, -0.27, 0.07);
    shoe.scale.set(1, 0.55, 1.45);
    legs.push({ pivot: hip, side: s });
  }

  const mount = new THREE.Group();
  mount.position.set(-0.52, 0.31, 0.93);
  lidPivot.add(mount);

  const held = buildHeldNote(1);
  root.add(held);

  return { root, body, lid: lidPivot, lidRestY: lidPivot.position.y, bow, arms, legs, eyes, face: faceRig, held, lidMat, mount, unit: 1, file: null };
}

/** Build the rig from the Spline export, or null if the parts we drive aren't there. */
function rigFromModel(file: THREE.Group, lidColor: THREE.Color): Rig | null {
  const copy = file.clone(true);
  const bo = copy.getObjectByName("Bo") ?? copy;
  const find = (name: string) => bo.getObjectByName(name) ?? null;
  const body = find("body");
  const lid = find("lid");
  if (!body || !lid) return null;
  const bow = find("bow") ?? lid;

  clayify(bo);
  bo.removeFromParent();
  bo.position.set(0, 0, 0);
  bo.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(bo);
  const height = box.max.y - box.min.y;
  if (!(height > 0)) return null;
  const s = BO_HEIGHT / height;
  const root = new THREE.Group();
  bo.scale.setScalar(s);
  bo.position.set(-((box.min.x + box.max.x) / 2) * s, -box.min.y * s, -((box.min.z + box.max.z) / 2) * s);
  root.add(bo);
  const unit = 1 / s;

  const arms: Rig["arms"] = [];
  const legs: Rig["legs"] = [];
  for (const [name, side] of [
    ["left", -1],
    ["right", 1],
  ] as const) {
    const arm = find(`arm_${name}`);
    if (arm) arms.push({ pivot: arm, side });
    const leg = find(`leg_${name}`);
    if (leg) legs.push({ pivot: leg, side });
  }
  const eyesNode = find("eyes");
  const eyes = eyesNode ? [{ obj: eyesNode, restY: eyesNode.scale.y }] : [];

  let lidMat: THREE.MeshStandardMaterial | null = null;
  const lidBox = (find("lid_box") as THREE.Mesh | null) ?? null;
  if (lidBox?.isMesh) {
    lidMat = lidBox.material as THREE.MeshStandardMaterial;
    lidMat.color.copy(lidColor);
  }

  // The accessory seat: on top of the lid, beside the bow (same spot as the built-in Bo).
  const mount = new THREE.Group();
  mount.position.set(-0.52 * unit, 0.31 * unit, 0.93 * unit);
  lid.add(mount);

  const mesh = (name: string) => {
    const o = find(name) as THREE.Mesh | null;
    return o?.isMesh ? o : null;
  };
  const faceRig = buildFace(
    [mesh("eye_left"), mesh("eye_right")],
    [find("eye_left_shine"), find("eye_right_shine")],
    mesh("mouth"),
    [find("cheek_left"), find("cheek_right")].filter((c): c is THREE.Object3D => !!c),
  );
  const held = buildHeldNote(unit);
  bo.add(held);

  return { root, body, lid, lidRestY: lid.position.y, bow, arms, legs, eyes, face: faceRig, held, lidMat, mount, unit, file };
}

/* ---------- Built-in accessories (used until the Spline ones are exported) ---------- */

function buildAccessory(name: BoAccessory): THREE.Group {
  const g = new THREE.Group();
  const m = (hex: number, rough = 0.62) => clay(hex, rough);
  switch (name) {
    case "party_hat": {
      addMesh(g, new THREE.ConeGeometry(0.22, 0.56, 32), m(0xc9b6f2), 0, 0.3, 0);
      addMesh(g, new THREE.TorusGeometry(0.21, 0.035, 10, 32), m(0xffd27a), 0, 0.04, 0).rotation.x = Math.PI / 2;
      addMesh(g, new THREE.SphereGeometry(0.08, 16, 12), m(0xfbd3dc, 0.7), 0, 0.6, 0);
      break;
    }
    case "heart": {
      const red = m(0xf27a9b, 0.55);
      for (const s of [-1, 1]) addMesh(g, new THREE.SphereGeometry(0.15, 24, 16), red, s * 0.1, 0.34, 0).scale.z = 0.66;
      const tip = addMesh(g, roundedBox(0.3, 0.3, 0.19, 0.08, 4), red, 0, 0.22, 0);
      tip.rotation.z = Math.PI / 4;
      break;
    }
    case "suitcase": {
      addMesh(g, roundedBox(0.54, 0.38, 0.22, 0.07, 4), m(0xf4a98a), 0, 0.19, 0);
      addMesh(g, new THREE.TorusGeometry(0.1, 0.022, 8, 20, Math.PI), m(0x2b2522, 0.45), 0, 0.38, 0);
      for (const s of [-1, 1]) addMesh(g, roundedBox(0.06, 0.39, 0.23, 0.02, 2), m(0xffe8b0), s * 0.13, 0.19, 0);
      break;
    }
    case "santa_hat": {
      const cone = addMesh(g, new THREE.ConeGeometry(0.24, 0.56, 32), m(0xe04e5e, 0.7), 0, 0.32, 0);
      cone.rotation.z = -0.18;
      addMesh(g, new THREE.TorusGeometry(0.24, 0.06, 12, 36), m(0xfffaf4, 0.85), 0, 0.05, 0).rotation.x = Math.PI / 2;
      addMesh(g, new THREE.SphereGeometry(0.085, 16, 12), m(0xfffaf4, 0.85), 0.1, 0.6, 0);
      break;
    }
    case "paw": {
      const tan = m(0xc9a08b, 0.65);
      addMesh(g, new THREE.SphereGeometry(0.17, 24, 16), tan, 0, 0.16, 0).scale.set(1, 0.82, 0.36);
      for (const [x, y] of [
        [-0.17, 0.34],
        [-0.06, 0.42],
        [0.06, 0.42],
        [0.17, 0.34],
      ] as const) {
        addMesh(g, new THREE.SphereGeometry(0.065, 16, 12), tan, x, y, 0).scale.set(0.92, 1.08, 0.75);
      }
      break;
    }
    case "sparkler": {
      addMesh(g, new THREE.CylinderGeometry(0.02, 0.02, 0.52, 10), m(0x9a8f88, 0.45), 0, 0.26, 0);
      const glow = new THREE.MeshStandardMaterial({ color: 0xffd27a, emissive: 0xffc94d, emissiveIntensity: 0.6, roughness: 0.5 });
      const star = new THREE.Shape();
      for (let i = 0; i < 10; i++) {
        const a = (i / 10) * Math.PI * 2 + Math.PI / 2;
        const r = i % 2 === 0 ? 0.17 : 0.08;
        if (i === 0) star.moveTo(Math.cos(a) * r, Math.sin(a) * r);
        else star.lineTo(Math.cos(a) * r, Math.sin(a) * r);
      }
      const geo = new THREE.ExtrudeGeometry(star, { depth: 0.06, bevelEnabled: true, bevelSize: 0.02, bevelThickness: 0.02, bevelSegments: 2 });
      geo.center();
      addMesh(g, geo, glow, 0, 0.58, 0);
      break;
    }
    case "rosette": {
      const berry = m(0xc2366b);
      const pleats = new THREE.Shape();
      for (let i = 0; i < 28; i++) {
        const a = (i / 28) * Math.PI * 2;
        const r = i % 2 === 0 ? 0.26 : 0.21;
        if (i === 0) pleats.moveTo(Math.cos(a) * r, Math.sin(a) * r);
        else pleats.lineTo(Math.cos(a) * r, Math.sin(a) * r);
      }
      const geo = new THREE.ExtrudeGeometry(pleats, { depth: 0.05, bevelEnabled: true, bevelSize: 0.015, bevelThickness: 0.015, bevelSegments: 2 });
      geo.center();
      addMesh(g, geo, berry, 0, 0.4, 0);
      addMesh(g, new THREE.CylinderGeometry(0.15, 0.15, 0.06, 32), m(0xfbd3dc), 0, 0.4, 0.04).rotation.x = Math.PI / 2;
      for (const s of [-1, 1]) {
        const tail = addMesh(g, roundedBox(0.11, 0.3, 0.03, 0.012, 2), berry, s * 0.07, 0.12, -0.02);
        tail.rotation.z = s * 0.25;
      }
      break;
    }
    case "flower": {
      addMesh(g, new THREE.CylinderGeometry(0.025, 0.025, 0.26, 10), m(0x9fd8c2), 0, 0.13, 0);
      const petal = new THREE.SphereGeometry(0.09, 16, 12);
      const petalMat = m(0xfffaf4, 0.65);
      for (let i = 0; i < 5; i++) {
        const a = (i / 5) * Math.PI * 2 + Math.PI / 2;
        addMesh(g, petal, petalMat, Math.cos(a) * 0.12, 0.38 + Math.sin(a) * 0.12, 0).scale.z = 0.45;
      }
      addMesh(g, new THREE.SphereGeometry(0.065, 16, 12), m(0xffd27a), 0, 0.38, 0.03).scale.z = 0.7;
      const leaf = addMesh(g, new THREE.SphereGeometry(0.07, 12, 8), m(0x9fd8c2), 0.08, 0.17, 0);
      leaf.scale.set(1, 0.5, 0.3);
      leaf.rotation.z = 0.5;
      break;
    }
  }
  return g;
}

/** The Spline accessory if there is one (baked into bo.glb, or its own file), else the built-in one. */
async function loadAccessory(name: BoAccessory, rig: Rig): Promise<THREE.Object3D> {
  let source = rig.file?.getObjectByName(`acc_${name}`) ?? null;
  if (!source) {
    let p = accessoryFiles.get(name);
    if (!p) {
      p = loadIfShipped(ACCESSORY_URL(name));
      accessoryFiles.set(name, p);
    }
    source = await p;
  }
  if (source) {
    const copy = source.clone(true);
    clayify(copy);
    return fitToHeight(copy, ACCESSORY_HEIGHT * rig.unit);
  }
  const built = buildAccessory(name);
  built.scale.setScalar(rig.unit * (ACCESSORY_HEIGHT / 0.62));
  return built;
}

/* ---------- The scene ---------- */

export function createBoScene(canvas: HTMLCanvasElement, options: BoSceneOptions = {}): BoScene {
  const framing: BoFraming = options.framing ?? "stage";
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: "low-power" });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.NeutralToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.shadowMap.enabled = framing === "stage";
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 100);

  scene.add(new THREE.HemisphereLight(0xffffff, 0xf6dbe4, 2.6));
  const key = new THREE.DirectionalLight(0xfff4ec, 2.2);
  key.position.set(3.5, 6, 4.5);
  key.castShadow = framing === "stage";
  key.shadow.mapSize.set(1024, 1024);
  Object.assign(key.shadow.camera, { left: -4, right: 4, top: 4, bottom: -4 });
  key.shadow.radius = 6;
  scene.add(key);
  const rim = new THREE.DirectionalLight(0xe7dcff, 1.1);
  rim.position.set(-4, 3, -3);
  scene.add(rim);

  if (framing === "stage") {
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(30, 30), new THREE.ShadowMaterial({ opacity: 0.13 }));
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    scene.add(ground);
  }

  let baseLid = new THREE.Color(options.lidColor ?? "#F6A5B9");

  /* Flipper spins around Bo's middle; bo sits inside it with its origin at the feet. */
  const MIDDLE = 1.2;
  const flipper = new THREE.Group();
  flipper.position.y = MIDDLE;
  scene.add(flipper);
  const bo = new THREE.Group();
  bo.position.y = -MIDDLE;
  flipper.add(bo);
  let rig: Rig | null = null;

  /* Notes and confetti */
  type Note = { g: THREE.Group; a: number; rest: THREE.Vector3; high: THREE.Vector3; spin: number };
  const notes: Note[] = [];
  if (options.notes) {
    const noteGeo = roundedBox(0.56, 0.4, 0.05, 0.035, 2);
    const lineGeo = new THREE.BoxGeometry(0.34, 0.035, 0.01);
    const lineMat = clay(0xb9a9a1);
    // Angles keep every note off to the sides or behind, never in front of Bo or through his lid.
    const ANGLES = [0.12, 0.62, 2.52, 3.02, 3.75, 5.6];
    PASTELS.forEach((col, i) => {
      const g = new THREE.Group();
      addMesh(g, noteGeo, clay(col), 0, 0, 0);
      addMesh(g, lineGeo, lineMat, 0, 0.06, 0.03, false);
      addMesh(g, lineGeo, lineMat, -0.05, -0.04, 0.03, false).scale.x = 0.7;
      const a = ANGLES[i]!;
      scene.add(g);
      notes.push({
        g,
        a,
        rest: new THREE.Vector3(Math.cos(a) * 2.35, 1.05 + (i % 3) * 0.55, Math.sin(a) * 1.35 - 0.25),
        high: new THREE.Vector3(Math.cos(a) * 1.9, 2.9 + (i % 2) * 0.55, Math.sin(a) * 1.0),
        spin: 0.4 + (i % 3) * 0.2,
      });
    });
  }
  const confetti: { m: THREE.Mesh; x: number; z: number; off: number; sp: number; rot: number }[] = [];
  if (framing === "stage") {
    const bitGeo = new THREE.BoxGeometry(0.07, 0.07, 0.015);
    for (let i = 0; i < 46; i++) {
      const m = new THREE.Mesh(bitGeo, clay(PASTELS[i % PASTELS.length]!));
      m.visible = false;
      scene.add(m);
      confetti.push({
        m,
        x: (Math.random() - 0.5) * 4.6,
        z: (Math.random() - 0.5) * 2.4,
        off: Math.random() * 3,
        sp: 0.5 + Math.random() * 0.6,
        rot: Math.random() * 6,
      });
    }
  }

  /* Sizing */
  const placeCamera = (lift = 0) => {
    if (framing === "buddy") {
      camera.position.set(0, 1.5, 7.4);
      camera.lookAt(0, 1.3, 0);
    } else {
      camera.position.set(0, 2.15 + lift * 0.7, (notes.length ? 7.6 : 6.4) + lift * 0.9);
      camera.lookAt(0, 1.15 + lift * 0.75, 0);
    }
  };
  const resize = () => {
    const box = canvas.parentElement ?? canvas;
    const w = Math.max(1, box.clientWidth);
    const h = Math.max(1, box.clientHeight);
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.fov = framing === "buddy" ? 30 : w / h < 0.9 ? 40 : 32;
    camera.updateProjectionMatrix();
  };
  resize();
  placeCamera();
  const ro = new ResizeObserver(resize);
  ro.observe(canvas.parentElement ?? canvas);

  let mx = 0;
  let my = 0;
  let lastMove = 0;
  const onMove = (e: PointerEvent) => {
    // Throttled: one read per frame is plenty.
    if (e.timeStamp - lastMove < 32) return;
    lastMove = e.timeStamp;
    mx = (e.clientX / Math.max(1, window.innerWidth)) * 2 - 1;
    my = (e.clientY / Math.max(1, window.innerHeight)) * 2 - 1;
  };
  if (options.followPointer !== false) window.addEventListener("pointermove", onMove, { passive: true });

  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const clamp = (x: number) => Math.max(0, Math.min(1, x));
  const ease = (x: number) => {
    const c = clamp(x);
    return c * c * (3 - 2 * c);
  };
  const lilac = new THREE.Color(0xc9b6f2);
  const mint = new THREE.Color(0x9fd8c2);
  const butter = new THREE.Color(0xffd27a);
  const tmp = new THREE.Color();
  const v3 = new THREE.Vector3();
  // Where notes go in and come out: the opening on top of the box.
  const mouth = new THREE.Vector3(0, 1.62, 0.05);

  const pose: BoPose = { squash: 1, tuck: 0, flail: 0, run: 0, flip: 0, lean: 0, turn: null, hold: 0, lid: 0, cheer: 0, point: 0, bowSpin: 0, look: null };
  let bowKick = -10;

  /* Cute faces: one at a time, for a moment, then back to the smile. */
  const CUTE: [BoFace, number][] = [
    ["wink", 0.38],
    ["happy", 0.24],
    ["blep", 0.2],
    ["love", 0.18],
  ];
  let face: BoFace = "smile";
  let faceSince = 0;
  let faceUntil = 0;
  let nextCute = performance.now() + 1800 + Math.random() * 2500;
  let nextBlink = performance.now() + 2500;
  let lookX = 0;
  let lookY = 0;
  const pullFace = (next: BoFace, ms: number, now = performance.now()) => {
    face = next;
    faceSince = now;
    faceUntil = next === "smile" ? 0 : now + ms;
  };
  const pickCute = () => {
    let roll = Math.random();
    for (const [f, w] of CUTE) {
      roll -= w;
      if (roll <= 0) return f;
    }
    return "wink" as BoFace;
  };

  /* Accessory: one at a time, pops on with a little overshoot. */
  type Worn = { name: BoAccessory; obj: THREE.Object3D; born: number; leaving: number };
  const worn: Worn[] = [];
  let wantAccessory: BoAccessory | null = null;
  let accessoryToken = 0;
  const applyAccessory = async () => {
    const token = ++accessoryToken;
    const now = performance.now();
    for (const w of worn) if (!w.leaving) w.leaving = now;
    if (!rig || !wantAccessory) return;
    const name = wantAccessory;
    const obj = await loadAccessory(name, rig);
    if (token !== accessoryToken || !rig || disposed) return;
    obj.rotation.z = 0.16;
    obj.scale.multiplyScalar(0.001);
    obj.userData["fullScale"] = obj.scale.x * 1000;
    rig.mount.add(obj);
    worn.push({ name, obj, born: performance.now(), leaving: 0 });
  };
  const animateAccessories = (now: number) => {
    for (let i = worn.length - 1; i >= 0; i--) {
      const w = worn[i]!;
      const full = w.obj.userData["fullScale"] as number;
      if (w.leaving) {
        const k = 1 - clamp((now - w.leaving) / 180);
        w.obj.scale.setScalar(Math.max(0.001, full * k));
        if (k <= 0) {
          w.obj.removeFromParent();
          disposeTree(w.obj);
          worn.splice(i, 1);
        }
      } else {
        const k = clamp((now - w.born) / 420);
        // Back-out overshoot.
        const c = 2.2;
        const pop = reduce ? 1 : 1 + (c + 1) * Math.pow(k - 1, 3) + c * Math.pow(k - 1, 2);
        w.obj.scale.setScalar(Math.max(0.001, full * pop));
      }
    }
  };

  let mood: BoMood = options.mood ?? "wave";
  let story: number | null = null;
  let storySource: (() => number | null) | null = null;
  let P = 0;
  let turn = 0;
  let paused = false;
  let disposed = false;
  let raf = 0;
  const t0 = performance.now();
  let moodSince = t0;

  const frame = (now: number) => {
    raf = requestAnimationFrame(frame);
    if (paused || !rig) return;
    update(now);
  };

  function update(now: number) {
    if (!rig) return;
    const r = rig;
    const u = r.unit;
    const t = (now - t0) / 1000;
    const idle = reduce ? 0 : 1;
    if (storySource) story = storySource();
    const target = story ?? (mood === "celebrate" ? 4 : 0);
    P += (target - P) * (story === null ? 0.06 : 0.12);

    /* 1: dress up, the lid tries on theme colors */
    const dress = story === null ? 0 : clamp(P);
    if (dress <= 0 || dress >= 1) tmp.copy(baseLid);
    else if (dress < 0.33) tmp.copy(baseLid).lerp(lilac, ease(dress / 0.33));
    else if (dress < 0.66) tmp.copy(lilac).lerp(mint, ease((dress - 0.33) / 0.33));
    else tmp.copy(mint).lerp(butter, ease((dress - 0.66) / 0.17)).lerp(baseLid, ease((dress - 0.83) / 0.17));
    r.lidMat?.color.copy(tmp);

    /* 2: notes fly in. 3: lid closes and Bo spins. 4: lid pops and notes float out. */
    const openIn = ease((P - 0.95) / 0.25) * (1 - ease((P - 2.05) / 0.3));
    const notesIn = ease((P - 1.15) / 0.85);
    const spin = ease((P - 2.2) / 0.7);
    const openOut = ease((P - 3.05) / 0.35);
    const notesOut = ease((P - 3.15) / 0.6);

    r.lid.rotation.x = -Math.max(openIn * 1.25, openOut * 1.95, pose.lid);
    r.lid.position.y = r.lidRestY + (openOut * 0.25 + Math.sin(t * 3) * 0.03 * openOut) * u;

    // The bow puffs during the spin and flops after a landing.
    const kick = (now - bowKick) / 1000;
    const flop = kick < 1.2 && !reduce ? Math.exp(-kick * 5) : 0;
    r.bow.scale.setScalar(1 + Math.sin(Math.PI * spin) * 0.35 + flop * Math.sin(kick * 22) * 0.12);
    r.bow.rotation.z = flop * Math.sin(kick * 26) * 0.4;
    r.bow.rotation.y = pose.bowSpin ? t * pose.bowSpin * Math.PI * 2 : 0;

    const hop = Math.sin(Math.PI * spin) * 0.35;
    bo.position.y = -MIDDLE + idle * Math.sin(t * 2.1) * 0.05 * (1 - pose.tuck) + hop;
    turn += (mx * 0.45 - turn) * 0.05;
    bo.rotation.y = pose.turn ?? turn + spin * Math.PI * 2;
    bo.rotation.x = my * 0.06;
    const sq = Math.max(0.3, pose.squash);
    const side = 1 / Math.sqrt(sq);
    bo.scale.set(side, sq, side);
    flipper.rotation.x = pose.flip;
    flipper.rotation.z = pose.lean;
    r.body.scale.set(1 + hop * 0.12, 1 - hop * 0.1, 1 + hop * 0.12);

    // A blink every few seconds, and now and then a cute face.
    if (face !== "smile" && now > faceUntil) pullFace("smile", 0, now);
    if (options.cute !== false && face === "smile" && now > nextCute) {
      pullFace(pickCute(), 1100 + Math.random() * 600, now);
      nextCute = now + 3800 + Math.random() * 4200;
    }
    if (now > nextBlink + 140) nextBlink = now + 3000 + Math.random() * 3000;
    const blink = idle && now > nextBlink ? 0.15 : 1;
    // Pupils drift toward the pointer (or wherever the page says to look).
    const lx = pose.look ? pose.look[0] : mx;
    const ly = pose.look ? pose.look[1] : my;
    lookX += (Math.max(-1, Math.min(1, lx)) - lookX) * 0.15;
    lookY += (Math.max(-1, Math.min(1, ly)) - lookY) * 0.15;
    const fr = r.face;
    if (fr) {
      const faceIn = clamp((now - faceSince) / 90);
      const surprised = face === "surprised";
      const sleepy = face === "sleepy" || face === "yawn";
      fr.eyes.forEach((e, i) => {
        const closed = face === "happy" || sleepy || ((face === "wink" || face === "blep") && i === 1);
        const heart = face === "love";
        const dizzy = face === "dizzy";
        e.open.forEach((o, k) => {
          o.visible = !closed && !heart && !dizzy;
          o.position.set(e.openRest[k]!.x + lookX * e.reach, e.openRest[k]!.y - lookY * e.reach * 0.7, e.openRest[k]!.z);
        });
        e.closed.visible = closed;
        // Sleepy eyes droop (a little cup) instead of the happy arch.
        e.closed.rotation.z = sleepy ? Math.PI : 0;
        e.closed.position.y = e.closedRestY + (sleepy ? -e.reach * 1.2 : 0);
        e.heart.visible = heart;
        e.spiral.visible = dizzy;
        if (dizzy) e.spiral.rotation.z = -t * 9 * (i === 0 ? 1 : -1);
        e.open[0]!.scale.y = e.restY * (surprised ? 1.18 : blink);
        if (heart) e.heart.scale.setScalar((0.6 + 0.4 * faceIn) * (1 + Math.sin(t * 9) * 0.07 * idle));
      });
      if (fr.smile) {
        fr.smile.visible = !surprised && face !== "yawn" && face !== "dizzy";
        const grin = face === "happy" ? 1.35 : face === "love" ? 1.15 : 1;
        fr.smile.scale.copy(fr.smileRest).multiplyScalar(grin);
      }
      fr.o.visible = surprised || face === "yawn" || face === "dizzy";
      fr.o.scale.setScalar(face === "yawn" ? 1.5 + Math.sin(t * 3) * 0.15 : face === "dizzy" ? 0.7 : 1);
      fr.tongue.visible = face === "blep";
      const blush = face === "love" || face === "happy" ? 1.25 : 1;
      for (const c of fr.cheeks) c.obj.scale.copy(c.rest).multiplyScalar(blush);
    } else {
      for (const e of r.eyes) e.obj.scale.y = e.restY * blink;
    }
    // A little head tilt with a wink or a blep.
    if (face === "wink" || face === "blep") flipper.rotation.z += 0.09 * clamp((now - faceSince) / 160);

    r.held.visible = pose.hold > 0.5;

    const waveFor = mood === "wave" ? Math.max(0, 1 - (now - moodSince) / 4000) * (story === null ? 1 : 1 - clamp(P * 2)) : 0;
    for (const { pivot, side: s } of r.arms) {
      const wave = s > 0 ? Math.max(waveFor, story === null && mood === "wave" ? 0.15 : 0) : 0;
      const up = Math.max(wave, openOut, pose.tuck * 0.8, pose.cheer);
      const flap = reduce ? 0 : Math.sin(t * (openOut > 0.5 ? 8 : 6) + (s > 0 ? 0 : 1.5)) * 0.32;
      const windmill = pose.flail * Math.sin(t * 15 + (s > 0 ? 0 : Math.PI)) * 0.9;
      const pointing = Math.sign(pose.point) === s ? Math.abs(pose.point) : 0;
      const holdUp = pose.hold * (1 - up);
      pivot.rotation.z = s * (0.18 + up * 2.3 + pose.flail * 1.4 + windmill + (up > 0.1 ? flap * up : Math.sin(t * 2) * 0.05 * idle)) - s * holdUp * 0.1;
      pivot.rotation.x = -holdUp * 1.15 - pointing * 0.5;
      if (pointing) pivot.rotation.z += s * pointing * 1.3;
    }
    for (const { pivot, side: s } of r.legs) {
      const stride = pose.run * Math.sin(t * 18 + (s > 0 ? 0 : Math.PI)) * 0.75;
      pivot.rotation.x = -pose.tuck * 0.55 + stride;
    }

    notes.forEach((n, i) => {
      const bob = idle * Math.sin(t * 1.6 + i) * 0.08;
      if (notesOut > 0) {
        v3.copy(mouth).lerp(n.high, notesOut);
        const orbit = t * 0.25 * notesOut;
        n.g.position.set(
          v3.x * Math.cos(orbit) - v3.z * Math.sin(orbit),
          v3.y + bob,
          v3.x * Math.sin(orbit) + v3.z * Math.cos(orbit),
        );
        n.g.scale.setScalar(Math.max(0.01, notesOut));
        n.g.visible = true;
      } else {
        v3.copy(n.rest).lerp(mouth, notesIn);
        n.g.position.set(v3.x, v3.y + bob * (1 - notesIn), v3.z);
        n.g.scale.setScalar(Math.max(0.01, 1 - notesIn * 0.95));
        n.g.visible = notesIn < 0.995;
      }
      n.g.rotation.set(Math.sin(t * n.spin + i) * 0.25, -n.a + Math.PI / 2 + t * 0.2 * idle, Math.sin(t * 0.9 + i) * 0.2);
    });

    for (const c of confetti) {
      c.m.visible = openOut > 0.05;
      if (!c.m.visible) continue;
      const fall = ((t * c.sp + c.off) % 3) / 3;
      c.m.position.set(c.x, 4.2 - fall * 4.2, c.z);
      c.m.rotation.set(t * 2 + c.rot, t * 1.4 + c.rot, 0);
      c.m.scale.setScalar(openOut);
    }

    animateAccessories(now);
    placeCamera(notesOut);
    renderer.render(scene, camera);
  }

  const timeout = new Promise<null>((resolve) => setTimeout(() => resolve(null), MODEL_TIMEOUT_MS));
  const ready = Promise.race([loadBoModel(), timeout])
    .then((file) => (file ? rigFromModel(file, baseLid) : null))
    .catch(() => null)
    .then((fromFile) => {
      if (disposed) return;
      rig = fromFile ?? buildCodeRig(baseLid);
      bo.add(rig.root);
      if (wantAccessory) void applyAccessory();
    });
  raf = requestAnimationFrame(frame);

  function disposeTree(root: THREE.Object3D) {
    root.traverse((o) => {
      const m = o as THREE.Mesh;
      if (m.geometry && !m.geometry.userData["shared"]) m.geometry.dispose();
      const mat = m.material as THREE.Material | THREE.Material[] | undefined;
      if (Array.isArray(mat)) mat.forEach((x) => x.dispose());
      else mat?.dispose();
    });
  }

  return {
    ready,
    setLidColor(hex) {
      baseLid = new THREE.Color(hex);
    },
    setMood(next) {
      mood = next;
      moodSince = performance.now();
    },
    setStory(value) {
      story = value;
    },
    setStorySource(source) {
      storySource = source;
    },
    setAccessory(name) {
      if (name === wantAccessory) return;
      wantAccessory = name;
      void applyAccessory();
    },
    setPose(next) {
      Object.assign(pose, next);
    },
    wiggleBow() {
      bowKick = performance.now();
    },
    setFace(next, ms = 1400) {
      pullFace(next, ms);
      nextCute = performance.now() + ms + 2500 + Math.random() * 3000;
    },
    snapshot(type = "image/webp", quality = 0.92) {
      update(performance.now());
      return canvas.toDataURL(type, quality);
    },
    feetPoint() {
      camera.updateMatrixWorld();
      v3.set(0, 0, 0).project(camera);
      return { x: (v3.x + 1) / 2, y: (1 - v3.y) / 2 };
    },
    setPaused(p) {
      paused = p;
    },
    dispose() {
      disposed = true;
      cancelAnimationFrame(raf);
      ro.disconnect();
      window.removeEventListener("pointermove", onMove);
      disposeTree(scene);
      renderer.dispose();
    },
  };
}
