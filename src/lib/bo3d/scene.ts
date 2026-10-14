/**
 * Bo in 3D: a soft, clay-like gift box built from simple shapes with three.js.
 * Loaded only in the browser (dynamic import from components/Bo3D.tsx).
 *
 *   const bo = createBoScene(canvas, { lidColor: "#F6A5B9", notes: true });
 *   bo.setMood("wave");          // "idle" | "wave" | "celebrate"
 *   bo.setStory(1.6);            // optional scroll story, 0..4 (see storyFrame)
 *   bo.dispose();
 */
import * as THREE from "three";

export type BoMood = "idle" | "wave" | "celebrate";

export type BoSceneOptions = {
  lidColor?: string;
  /** Floating pastel notes around Bo (and used by the story). */
  notes?: boolean;
  /** Follow the pointer with a gentle head turn. */
  followPointer?: boolean;
  mood?: BoMood;
};

export type BoScene = {
  setLidColor: (hex: string) => void;
  setMood: (mood: BoMood) => void;
  /** 0 hero, 1 pick a theme, 2 friends add notes, 3 wrap it up, 4 they open it. */
  setStory: (value: number | null) => void;
  /** Read the story value every frame (e.g. from scroll), without React re-renders. */
  setStorySource: (source: (() => number | null) | null) => void;
  setPaused: (paused: boolean) => void;
  dispose: () => void;
};

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

export function createBoScene(canvas: HTMLCanvasElement, options: BoSceneOptions = {}): BoScene {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: "low-power" });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.NeutralToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 100);

  scene.add(new THREE.HemisphereLight(0xffffff, 0xf6dbe4, 2.6));
  const key = new THREE.DirectionalLight(0xfff4ec, 2.2);
  key.position.set(3.5, 6, 4.5);
  key.castShadow = true;
  key.shadow.mapSize.set(1024, 1024);
  Object.assign(key.shadow.camera, { left: -4, right: 4, top: 4, bottom: -4 });
  key.shadow.radius = 6;
  scene.add(key);
  const rim = new THREE.DirectionalLight(0xe7dcff, 1.1);
  rim.position.set(-4, 3, -3);
  scene.add(rim);

  const ground = new THREE.Mesh(new THREE.PlaneGeometry(30, 30), new THREE.ShadowMaterial({ opacity: 0.13 }));
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);

  const clay = (hex: THREE.ColorRepresentation) =>
    new THREE.MeshStandardMaterial({ color: hex, roughness: 0.62, metalness: 0 });
  const ink = clay(0x2b2522);
  const white = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.3 });
  let baseLid = new THREE.Color(options.lidColor ?? "#F6A5B9");
  const lidMat = clay(baseLid.clone());
  const ribbonMat = clay(0xef7f99);
  const bodyMat = clay(0xfffaf4);
  const cheekMat = clay(0xf6a3b5);

  const add = (
    parent: THREE.Object3D,
    geo: THREE.BufferGeometry,
    mat: THREE.Material,
    x: number,
    y: number,
    z: number,
    shadow = true,
  ) => {
    const m = new THREE.Mesh(geo, mat);
    m.position.set(x, y, z);
    m.castShadow = shadow;
    m.receiveShadow = shadow;
    parent.add(m);
    return m;
  };

  /* Bo */
  const bo = new THREE.Group();
  scene.add(bo);
  const body = new THREE.Group();
  bo.add(body);
  add(body, roundedBox(1.6, 1.4, 1.4, 0.24, 8), bodyMat, 0, 1.0, 0);
  add(body, roundedBox(0.3, 1.42, 1.44, 0.09, 4), ribbonMat, 0, 1.0, 0);

  const face = new THREE.Group();
  face.position.set(0, 0, 0.72);
  body.add(face);
  const eyeGeo = new THREE.SphereGeometry(0.11, 24, 16);
  const shineGeo = new THREE.SphereGeometry(0.035, 12, 8);
  const cheekGeo = new THREE.SphereGeometry(0.12, 20, 12);
  const eyes: THREE.Mesh[] = [];
  for (const x of [-0.36, 0.36]) {
    const eye = add(face, eyeGeo, ink, x, 1.12, 0, false);
    eye.scale.set(1, 1.15, 0.55);
    eyes.push(eye);
    add(face, shineGeo, white, x + 0.035, 1.17, 0.06, false);
    const cheek = add(face, cheekGeo, cheekMat, x * 1.5, 0.9, -0.01, false);
    cheek.scale.set(1, 0.62, 0.3);
  }
  const smile = add(face, new THREE.TorusGeometry(0.11, 0.028, 10, 28, Math.PI), ink, 0, 0.98, 0.03, false);
  smile.rotation.z = Math.PI;

  /* The lid hinges at the back so it can open. */
  const lidPivot = new THREE.Group();
  lidPivot.position.set(0, 1.66, -0.78);
  bo.add(lidPivot);
  const lid = new THREE.Group();
  lid.position.set(0, 0.12, 0.78);
  lidPivot.add(lid);
  add(lid, roundedBox(1.8, 0.38, 1.6, 0.16, 6), lidMat, 0, 0, 0);
  add(lid, roundedBox(0.32, 0.4, 1.62, 0.1, 4), ribbonMat, 0, 0, 0);
  const bow = new THREE.Group();
  bow.position.set(0, 0.32, 0);
  lid.add(bow);
  const loopGeo = new THREE.TorusGeometry(0.2, 0.085, 16, 36);
  for (const s of [-1, 1]) {
    const loop = add(bow, loopGeo, ribbonMat, s * 0.23, 0.08, 0);
    loop.scale.set(1.15, 0.8, 0.7);
    loop.rotation.set(0, s * 0.45, s * 0.35);
  }
  add(bow, new THREE.SphereGeometry(0.13, 20, 16), ribbonMat, 0, 0.02, 0);

  /* Arms and legs */
  const arms: { pivot: THREE.Group; side: number }[] = [];
  const shoeMat = clay(0xd9607d);
  for (const s of [-1, 1]) {
    const shoulder = new THREE.Group();
    shoulder.position.set(s * 0.82, 1.2, 0);
    bo.add(shoulder);
    const arm = add(shoulder, new THREE.CapsuleGeometry(0.075, 0.32, 8, 16), bodyMat, 0, -0.24, 0);
    add(arm, new THREE.SphereGeometry(0.11, 18, 12), bodyMat, 0, -0.24, 0);
    arms.push({ pivot: shoulder, side: s });
    add(bo, new THREE.CapsuleGeometry(0.075, 0.2, 8, 16), ink, s * 0.36, 0.2, 0);
    const shoe = add(bo, new THREE.SphereGeometry(0.15, 20, 14), shoeMat, s * 0.36, 0.05, 0.07);
    shoe.scale.set(1, 0.55, 1.45);
  }

  /* Notes and confetti */
  type Note = { g: THREE.Group; a: number; rest: THREE.Vector3; high: THREE.Vector3; spin: number };
  const notes: Note[] = [];
  if (options.notes) {
    const noteGeo = roundedBox(0.56, 0.4, 0.05, 0.035, 2);
    const lineGeo = new THREE.BoxGeometry(0.34, 0.035, 0.01);
    const lineMat = clay(0xb9a9a1);
    PASTELS.forEach((col, i) => {
      const g = new THREE.Group();
      add(g, noteGeo, clay(col), 0, 0, 0);
      add(g, lineGeo, lineMat, 0, 0.06, 0.03, false);
      add(g, lineGeo, lineMat, -0.05, -0.04, 0.03, false).scale.x = 0.7;
      const a = (i / PASTELS.length) * Math.PI * 2 + 0.4;
      scene.add(g);
      notes.push({
        g,
        a,
        rest: new THREE.Vector3(Math.cos(a) * 2.05, 1.25 + (i % 3) * 0.5, Math.sin(a) * 1.25 - 0.2),
        high: new THREE.Vector3(Math.cos(a) * 1.9, 2.9 + (i % 2) * 0.55, Math.sin(a) * 1.0),
        spin: 0.4 + (i % 3) * 0.2,
      });
    });
  }
  const confetti: { m: THREE.Mesh; x: number; z: number; off: number; sp: number; rot: number }[] = [];
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

  /* Sizing */
  const resize = () => {
    const box = canvas.parentElement ?? canvas;
    const w = Math.max(1, box.clientWidth);
    const h = Math.max(1, box.clientHeight);
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.fov = w / h < 0.9 ? 40 : 32;
    camera.updateProjectionMatrix();
  };
  resize();
  const ro = new ResizeObserver(resize);
  ro.observe(canvas.parentElement ?? canvas);

  let mx = 0;
  let my = 0;
  const onMove = (e: PointerEvent) => {
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
  const mouth = new THREE.Vector3(0, 1.75, 0.1);

  let mood: BoMood = options.mood ?? "wave";
  let story: number | null = null;
  let storySource: (() => number | null) | null = null;
  let P = 0;
  let turn = 0;
  let paused = false;
  let raf = 0;
  const t0 = performance.now();
  let moodSince = t0;

  const frame = (now: number) => {
    raf = requestAnimationFrame(frame);
    if (paused) return;
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
    lidMat.color.copy(tmp);

    /* 2: notes fly in. 3: lid closes and Bo spins. 4: lid pops and notes float out. */
    const openIn = ease((P - 0.95) / 0.25) * (1 - ease((P - 2.05) / 0.3));
    const notesIn = ease((P - 1.15) / 0.85);
    const spin = ease((P - 2.2) / 0.7);
    const openOut = ease((P - 3.05) / 0.35);
    const notesOut = ease((P - 3.15) / 0.6);

    lidPivot.rotation.x = -Math.max(openIn * 0.95, openOut * 1.95);
    lidPivot.position.y = 1.66 + openOut * 0.25 + Math.sin(t * 3) * 0.03 * openOut;
    bow.scale.setScalar(1 + Math.sin(Math.PI * spin) * 0.35);

    const hop = Math.sin(Math.PI * spin) * 0.35;
    bo.position.y = idle * Math.sin(t * 2.1) * 0.05 + hop;
    turn += (mx * 0.45 - turn) * 0.05;
    bo.rotation.y = turn + spin * Math.PI * 2;
    bo.rotation.x = my * 0.06;
    body.scale.set(1 + hop * 0.12, 1 - hop * 0.1, 1 + hop * 0.12);

    // A blink every few seconds.
    const blink = idle && t % 4.2 > 4.05 ? 0.15 : 1;
    for (const e of eyes) e.scale.y = 1.15 * blink;

    const waveFor = mood === "wave" ? Math.max(0, 1 - (now - moodSince) / 4000) * (story === null ? 1 : 1 - clamp(P * 2)) : 0;
    for (const { pivot, side } of arms) {
      const wave = side > 0 ? Math.max(waveFor, story === null && mood === "wave" ? 0.15 : 0) : 0;
      const up = Math.max(wave, openOut);
      const flap = reduce ? 0 : Math.sin(t * (openOut > 0.5 ? 8 : 6) + (side > 0 ? 0 : 1.5)) * 0.32;
      pivot.rotation.z = side * (0.18 + up * 2.3 + (up > 0.1 ? flap * up : Math.sin(t * 2) * 0.05 * idle));
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

    const lift = notesOut;
    camera.position.set(0, 2.15 + lift * 0.7, (notes.length ? 7.6 : 6.4) + lift * 0.9);
    camera.lookAt(0, 1.15 + lift * 0.75, 0);
    renderer.render(scene, camera);
  };
  raf = requestAnimationFrame(frame);

  return {
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
    setPaused(p) {
      paused = p;
    },
    dispose() {
      cancelAnimationFrame(raf);
      ro.disconnect();
      window.removeEventListener("pointermove", onMove);
      scene.traverse((o) => {
        const m = o as THREE.Mesh;
        if (m.geometry) m.geometry.dispose();
        const mat = m.material as THREE.Material | THREE.Material[] | undefined;
        if (Array.isArray(mat)) mat.forEach((x) => x.dispose());
        else mat?.dispose();
      });
      renderer.dispose();
    },
  };
}
