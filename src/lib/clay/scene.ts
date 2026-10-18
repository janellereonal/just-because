/**
 * Clay characters: soft, matte, rounded 3D figures in the style of modelling
 * clay, rendered with three.js to stills (public/clay/<id>.webp) by
 * tools/screens/clay.js through the dev-only /dev/clay page.
 *
 * Every figure is built in the same 120x120 box the SVG characters use (x to
 * the right, y down, z towards the viewer), and the camera is orthographic
 * and square on, so a point at (x, y) in the box lands at (x, y) in the
 * image. That's what lets the face (eyes, blush, mouth) stay live SVG on top:
 * it blinks, follows the pointer and reacts, exactly where the clay expects it.
 *
 * Faces are never modelled here. Noses, beaks and muzzles are.
 */
import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { blob, clay, cone, curl, egg, feet, fluff, mesh, pillow, shade, torus, W, type ClayRecipe } from "@/lib/clay/shapes";
import { ANIMALS } from "@/lib/clay/animals";
import { OBJECTS } from "@/lib/clay/objects";
import { TREE } from "@/lib/clay/tree";
import { buildPerson } from "@/lib/clay/person";
import type { PersonConfig } from "@/themes/_shared/cast/person";

/** The image covers this box (a little past 0..120 so tails and ears fit). */
export const CLAY_BOX = { min: -10, max: 130 };
const SIZE = CLAY_BOX.max - CLAY_BOX.min;

/* ---------- the figures ---------- */

export type { ClayRecipe };

export const CLAY: Record<string, ClayRecipe> = {
  ...ANIMALS,
  ...OBJECTS,
  ...TREE,
  dog: (c) => [
    // Tail, then body, then ears and muzzle in front.
    ...curl([86, 96, -16], 5, c.primary, 0.7),
    egg([60, 72, 0], 70, 76, 60, c.primary),
    blob([60, 84, 25], [30, 20, 16], c.skin),
    blob([60, 76, 32], [9, 6.5, 6], "#3A2621", [0, 0, 0], { rough: 0.35, gloss: 0.6 }),
    blob([28, 64, 2], [16, 32, 12], c.secondary, [0, 0, 0.32]),
    blob([92, 64, 2], [16, 32, 12], c.secondary, [0, 0, -0.32]),
    blob([60, 39, 18], [22, 10, 10], shade(c.primary, 18), [0, 0, 0]),
    ...feet(106, c.skin),
  ],
  cat: (c) => [
    ...curl([86, 100, -14], 5.5, c.primary, 1.2),
    cone([39, 36, 0], 20, 22, 14, c.primary, -0.28),
    cone([81, 36, 0], 20, 22, 14, c.primary, 0.28),
    cone([40, 39, 5], 10, 13, 6, "#F6B3BF", -0.28),
    cone([80, 39, 5], 10, 13, 6, "#F6B3BF", 0.28),
    egg([60, 74, 0], 74, 72, 60, c.primary),
    blob([60, 86, 23], [30, 18, 14], c.secondary),
    blob([60, 79, 30], [7, 5, 5], "#E9879A", [0, 0, 0], { rough: 0.4, gloss: 0.4 }),
    ...feet(107, c.secondary),
  ],
  bunny: (c) => [
    blob([45, 22, -2], [15, 44, 11], c.primary, [0, 0, -0.12]),
    blob([75, 22, -2], [15, 44, 11], c.primary, [0, 0, 0.12]),
    blob([45, 24, 4], [7, 32, 4], c.secondary, [0, 0, -0.12]),
    blob([75, 24, 4], [7, 32, 4], c.secondary, [0, 0, 0.12]),
    blob([94, 98, -18], [14, 14, 14], "#FFFFFF"),
    egg([60, 76, 0], 68, 66, 58, c.primary),
    blob([60, 82, 27], [8, 5.5, 5], "#EE9AAE", [0, 0, 0], { rough: 0.4, gloss: 0.3 }),
    ...feet(107, c.skin, [46, 74], [18, 9, 18]),
  ],
  bear: (c) => [
    blob([36, 44, -4], [22, 22, 14], c.primary),
    blob([84, 44, -4], [22, 22, 14], c.primary),
    blob([36, 45, 3], [11, 11, 6], c.secondary),
    blob([84, 45, 3], [11, 11, 6], c.secondary),
    egg([60, 74, 0], 74, 74, 60, c.primary),
    blob([60, 84, 25], [28, 20, 16], c.secondary),
    blob([60, 78, 33], [10, 7, 6], "#3A2621", [0, 0, 0], { rough: 0.35, gloss: 0.6 }),
    blob([28, 90, 8], [13, 18, 13], c.primary, [0, 0, 0.4]),
    blob([92, 90, 8], [13, 18, 13], c.primary, [0, 0, -0.4]),
    ...feet(107, c.secondary),
  ],
  duck: (c) => [
    blob([56, 32.5, 4], [7, 12.5, 7], c.primary, [0, 0, -0.32]),
    blob([64, 32.5, 4], [7, 12.5, 7], c.primary, [0, 0, 0.32]),
    egg([60, 74, 0], 72, 76, 62, c.primary, { bulge: 0.24 }),
    blob([25, 82, 2], [14, 26, 12], c.primary, [0, 0, 0.5]),
    blob([95, 82, 2], [14, 26, 12], c.primary, [0, 0, -0.5]),
    blob([60, 72, 32], [22, 9, 14], c.secondary, [0, 0, 0], { rough: 0.45, gloss: 0.2 }),
    blob([60, 76, 30], [18, 6, 11], shade(c.secondary, -18), [0, 0, 0], { rough: 0.45 }),
    ...feet(108, c.secondary, [47, 73], [18, 7, 14]),
  ],
  frog: (c) => [
    blob([38, 40, 2], [26, 24, 22], c.primary),
    blob([82, 40, 2], [26, 24, 22], c.primary),
    blob([38, 39, 12], [14, 14, 4], "#FFFFFF"),
    blob([82, 39, 12], [14, 14, 4], "#FFFFFF"),
    egg([60, 76, 0], 84, 62, 62, c.primary, { bulge: 0.3 }),
    blob([60, 96, 18], [36, 18, 14], c.secondary),
    blob([30, 104, 8], [24, 10, 18], c.primary, [0, 0, 0.2]),
    blob([90, 104, 8], [24, 10, 18], c.primary, [0, 0, -0.2]),
    blob([46, 108, 16], [14, 7, 12], c.primary),
    blob([74, 108, 16], [14, 7, 12], c.primary),
  ],
  person: (c) => [
    egg([60, 96, 0], 50, 34, 40, c.primary, { bulge: 0.1, flat: 0.3 }),
    blob([60, 58, 0], [60, 58, 54], c.skin),
    // Hair: a cap and a fringe.
    blob([60, 44, -4], [68, 46, 58], c.secondary),
    blob([44, 41, 20], [28, 16, 14], c.secondary, [0, 0, 0.45]),
    blob([72, 39, 21], [34, 15, 14], c.secondary, [0, 0, -0.25]),
    blob([30, 56, -2], [12, 22, 16], c.secondary),
    blob([90, 56, -2], [12, 22, 16], c.secondary),
    blob([29, 62, 0], [9, 13, 9], c.skin),
    blob([91, 62, 0], [9, 13, 9], c.skin),
    ...feet(110, shade(c.primary, -40), [50, 70], [14, 7, 14]),
  ],
  cup: (c) => {
    const cup = mesh(
      new THREE.LatheGeometry(
        [
          [0.0001, -0.5],
          [0.42, -0.5],
          [0.47, -0.45],
          [0.5, 0.42],
          [0.47, 0.5],
          [0.43, 0.46],
          [0.0001, 0.46],
        ].map(([x, y]) => new THREE.Vector2(x!, y!)),
        96,
      ),
      clay(c.primary),
    );
    cup.position.copy(W(58, 80, 0));
    cup.scale.set(68, 58, 60);
    cup.rotation.x = 0.32;
    return [
      torus([92, 78, 0], 12, 4.5, c.primary, [0, 0, 0]),
      cup,
      blob([58, 53, 2], [57, 4, 50], c.secondary, [0.32, 0, 0], { rough: 0.3, gloss: 0.5 }),
      ...feet(109, shade(c.primary, -25), [44, 72], [14, 6, 12]),
    ];
  },
  plant: (c) => {
    const pot = mesh(
      new THREE.LatheGeometry(
        [
          [0.0001, -0.5],
          [0.34, -0.5],
          [0.4, -0.42],
          [0.5, 0.32],
          [0.52, 0.42],
          [0.5, 0.5],
          [0.0001, 0.5],
        ].map(([x, y]) => new THREE.Vector2(x!, y!)),
        96,
      ),
      clay(c.secondary),
    );
    pot.position.copy(W(60, 85, 0));
    pot.scale.set(66, 46, 60);
    pot.rotation.x = 0.28;
    const leaves = [
      [60, 30, 0, 0],
      [45, 38, -6, 0.6],
      [75, 38, -6, -0.6],
      [38, 50, 4, 1.1],
      [82, 50, 4, -1.1],
      [54, 44, 10, 0.25],
      [66, 44, 10, -0.25],
    ].map(([x, y, z, r]) => blob([x!, y!, z!], [13, 28, 12], c.primary, [0, 0, r!]));
    return [...leaves, pot, ...feet(110, shade(c.secondary, -25), [46, 74], [13, 6, 12])];
  },
  cloud: (c) => [
    ...(
      [
        [38, 74, 30],
        [60, 64, 40],
        [82, 74, 30],
        [49, 86, 30],
        [71, 86, 30],
      ] as const
    ).map(([x, y, s]) => blob([x, y, 0], [s, s * 0.95, s * 0.85], c.primary)),
    blob([44, 106, 0], [6, 9, 6], c.secondary, [0, 0, 0], { rough: 0.3, gloss: 0.5 }),
    blob([76, 106, 0], [6, 9, 6], c.secondary, [0, 0, 0], { rough: 0.3, gloss: 0.5 }),
  ],
  moon: (c) => {
    // The outer circle, minus a smaller circle up and to the right.
    const O = { x: 58, y: 68, r: 40 };
    const I = { x: 80, y: 58, r: 33 };
    const N = 720;
    const at = (k: typeof O, a: number): [number, number] => [k.x + Math.cos(a) * k.r, k.y + Math.sin(a) * k.r];
    const dist = (p: [number, number], k: typeof O) => Math.hypot(p[0] - k.x, p[1] - k.y);
    // The longest run of angles where `keep` holds, walking round the circle.
    const run = (k: typeof O, keep: (p: [number, number]) => boolean) => {
      const ok = Array.from({ length: N }, (_, i) => keep(at(k, (i / N) * Math.PI * 2)));
      const startAt = ok.findIndex((v, i) => v && !ok[(i - 1 + N) % N]);
      const out: [number, number][] = [];
      for (let i = 0; i < N; i++) {
        const j = (startAt + i) % N;
        if (!ok[j]) break;
        out.push(at(k, (j / N) * Math.PI * 2));
      }
      return out;
    };
    const outer = run(O, (p) => dist(p, I) > I.r);
    const inner = run(I, (p) => dist(p, O) < O.r);
    const last = outer[outer.length - 1]!;
    const back = Math.hypot(inner[0]![0] - last[0], inner[0]![1] - last[1]) < Math.hypot(inner[inner.length - 1]![0] - last[0], inner[inner.length - 1]![1] - last[1]) ? inner : [...inner].reverse();
    return [pillow([...outer, ...back], 16, c.primary, 0, 9)];
  },
  /** Shih Tzu x Maltese: white silky fluff, long fluffy ears, a topknot with a bow. */
  "tzu-mal": (c) => [
    // Ears: long, made of curls
    fluff([28, 84, -2], [10, 24, 7], { count: 11, size: [12, 16], color: "#F0DFC8", seed: 3, rows: 2 }),
    fluff([92, 84, -2], [10, 24, 7], { count: 11, size: [12, 16], color: "#F0DFC8", seed: 4, rows: 2 }),
    egg([60, 76, 0], 70, 70, 58, c.primary),
    // A halo of fluff around the face
    fluff([60, 66, 0], [33, 30, 26], { count: 22, size: [12, 17], color: c.primary, seed: 7, front: 0.05 }),
    // Mustache and beard
    blob([60, 84, 24], [26, 18, 14], c.primary),
    fluff([60, 88, 26], [12, 6, 4], { count: 8, size: [9, 12], color: c.primary, seed: 11, from: 0.1, to: Math.PI - 0.1 }),
    blob([60, 80, 31], [9, 7, 6], "#2E2220", [0, 0, 0], { rough: 0.35, gloss: 0.6 }),
    // Topknot and its bow
    blob([60, 32, 2], [16, 16, 14], c.primary),
    blob([52, 27, 6], [12, 9, 8], c.secondary, [0, 0, 0.35]),
    blob([68, 27, 6], [12, 9, 8], c.secondary, [0, 0, -0.35]),
    blob([60, 28, 9], [6, 6, 6], shade(c.secondary, -20)),
    ...feet(108, c.primary, [46, 74], [18, 10, 18]),
  ],
  /** Shih Tzu x Pomeranian: orange-cream fluff, little fox ears, a ruff and a plume tail over the back. */
  "tzu-pom": (c) => [
    // Plume tail behind, curling up
    fluff([92, 62, -14], [12, 18, 6], { count: 9, size: [13, 17], color: c.primary, seed: 5, from: -1.2, to: 2.2 }),
    cone([40, 36, -2], 18, 20, 12, c.primary, -0.32),
    cone([80, 36, -2], 18, 20, 12, c.primary, 0.32),
    cone([41, 39, 4], 9, 11, 5, c.skin, -0.32),
    cone([79, 39, 4], 9, 11, 5, c.skin, 0.32),
    egg([60, 74, 0], 74, 72, 60, c.primary),
    // Ruff around the face
    fluff([60, 70, 0], [36, 30, 26], { count: 24, size: [11, 16], color: c.primary, seed: 9, front: 0.0 }),
    // Cream face and chest
    blob([60, 72, 18], [44, 40, 24], c.skin),
    fluff([60, 98, 18], [16, 6, 4], { count: 6, size: [11, 14], color: c.skin, seed: 13, from: 0, to: Math.PI }),
    blob([60, 82, 28], [16, 11, 10], c.skin),
    blob([60, 78, 33], [8, 6, 5], "#2E2220", [0, 0, 0], { rough: 0.35, gloss: 0.6 }),
    ...feet(108, c.skin, [46, 74], [17, 10, 17]),
  ],
};

/* ---------- rendering ---------- */

let shared: { renderer: THREE.WebGLRenderer; env: THREE.Texture } | null = null;

function setup(px: number) {
  if (!shared) {
    const canvas = document.createElement("canvas");
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, preserveDrawingBuffer: true });
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.NeutralToneMapping;
    renderer.toneMappingExposure = 1.02;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    const pmrem = new THREE.PMREMGenerator(renderer);
    const env = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    shared = { renderer, env };
  }
  shared.renderer.setPixelRatio(1);
  shared.renderer.setSize(px, px, false);
  return shared;
}

/**
 * Renders one figure to a PNG data URL, `px` pixels square, transparent
 * background, with a soft shadow on the floor (y = 112).
 */
export function renderClay(id: string, colors: { primary: string; secondary: string; skin: string }, px = 560): string {
  const recipe = CLAY[id];
  if (!recipe) throw new Error(`No clay recipe for ${id}`);
  draw(recipe(colors), px);
  return shared!.renderer.domElement.toDataURL("image/png");
}

/** A person from the builder, as a PNG data URL (previews). */
export function renderPerson(p: PersonConfig, px = 320): string {
  draw(buildPerson(p), px);
  return shared!.renderer.domElement.toDataURL("image/png");
}

/** A person from the builder as a WebP file, to upload (falls back to PNG). */
export function personFile(p: PersonConfig, px = 512): Promise<Blob> {
  draw(buildPerson(p), px);
  const canvas = shared!.renderer.domElement;
  return new Promise((resolve, reject) =>
    canvas.toBlob(
      (b) => (b ? resolve(b) : canvas.toBlob((png) => (png ? resolve(png) : reject(new Error("No image"))), "image/png")),
      "image/webp",
      0.9,
    ),
  );
}

function draw(objects: THREE.Object3D[], px: number) {
  const { renderer, env } = setup(px);
  const scene = new THREE.Scene();
  scene.environment = env;
  scene.environmentIntensity = 0.32;

  const half = SIZE / 2;
  const cx = CLAY_BOX.min + half - 60;
  const cy = 60 - (CLAY_BOX.min + half);
  const cam = new THREE.OrthographicCamera(cx - half, cx + half, cy + half, cy - half, -400, 400);
  cam.position.set(0, 0, 200);
  cam.lookAt(0, 0, 0);

  scene.add(new THREE.HemisphereLight(0xffffff, 0xd9c6bb, 0.75));
  const key = new THREE.DirectionalLight(0xfff6ee, 3.1);
  key.position.set(-70, 110, 140);
  key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  Object.assign(key.shadow.camera, { left: -90, right: 90, top: 90, bottom: -90, near: 1, far: 500 });
  key.shadow.radius = 9;
  key.shadow.blurSamples = 24;
  key.shadow.bias = -0.0004;
  key.shadow.normalBias = 0.6;
  scene.add(key);
  const fill = new THREE.DirectionalLight(0xf2ecff, 0.38);
  fill.position.set(110, 30, 90);
  scene.add(fill);
  const rim = new THREE.DirectionalLight(0xffffff, 0.9);
  rim.position.set(40, 80, -160);
  scene.add(rim);

  // The floor only catches the shadow; it isn't drawn.
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(400, 400), new THREE.ShadowMaterial({ opacity: 0.22 }));
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = 60 - 112;
  floor.receiveShadow = true;
  scene.add(floor);
  // A soft contact shadow right under the figure.
  const contact = (() => {
    const c = document.createElement("canvas");
    c.width = c.height = 128;
    const g = c.getContext("2d")!;
    const grad = g.createRadialGradient(64, 64, 0, 64, 64, 64);
    grad.addColorStop(0, "rgba(60,40,30,.55)");
    grad.addColorStop(0.55, "rgba(60,40,30,.2)");
    grad.addColorStop(1, "rgba(60,40,30,0)");
    g.fillStyle = grad;
    g.fillRect(0, 0, 128, 128);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    const m = new THREE.Mesh(new THREE.PlaneGeometry(76, 22), new THREE.MeshBasicMaterial({ map: t, transparent: true, depthWrite: false }));
    m.rotation.x = -Math.PI / 2;
    m.position.set(2, 60 - 111.6, 6);
    return m;
  })();
  scene.add(contact);

  const figure = new THREE.Group();
  objects.forEach((o) => figure.add(o));
  scene.add(figure);

  renderer.render(scene, cam);

  scene.traverse((o) => {
    if (o instanceof THREE.Mesh) o.geometry.dispose();
  });
}
