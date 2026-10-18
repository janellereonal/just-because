/**
 * The Constellation night sky, in WebGL (three.js).
 *
 * Layers, back to front:
 *  1. Sky dome: a Milky Way band with dust lanes, faint nebulae in the gift's colors,
 *     airglow at the horizon. Painted once into a texture (it's the expensive part), then
 *     the dome only samples it.
 *  2. Thousands of background stars, thicker along the Milky Way, each with its own
 *     colour temperature and twinkle. The dome and these stars turn slowly together.
 *  3. A mountain ridge in silhouette, so the sky has a horizon and a sense of scale.
 *  4. The friends' stars: closer than everything else (so they move with real depth when
 *     you drag), with diffraction spikes, and golden once found.
 *
 * The React side (NightSky.tsx) owns the buttons, lines and labels. It asks this scene
 * where each friend's star is on screen every frame.
 */
import * as THREE from "three";

export type SkyOptions = {
  /** Gift palette, used to colour the nebulae and the night. */
  tint: string;
  accent: string;
  /** Friend stars, in the old 0..100 layout space (x across, y down). */
  stars: { x: number; y: number }[];
  /** Fewer stars and a lower resolution on small or slow screens. */
  lite: boolean;
  /** No motion at all: no intro, no twinkle, no drift. */
  still: boolean;
};

export type Projected = { x: number; y: number; on: boolean };

export type Sky = {
  setLit(lit: boolean[]): void;
  setDone(done: boolean): void;
  setHover(i: number): void;
  /** Look around: dx, dy in CSS px since the drag started. */
  drag(dx: number, dy: number): void;
  release(): void;
  /** Subtle look toward the mouse (-1..1). */
  lean(x: number, y: number): void;
  /** Rise from the horizon to the sky. */
  intro(): void;
  resize(w: number, h: number): void;
  /** How much of the top the title takes, in CSS px, so the stars stay clear of it. */
  setSafeTop(px: number): void;
  /** Called after every frame with each friend star's screen position. */
  onFrame(cb: (stars: Projected[], t: number) => void): void;
  setRunning(on: boolean): void;
  dispose(): void;
  ground: string;
};

const TAU = Math.PI * 2;

/* ------------------------------------------------------------------ helpers */

/** Small, deterministic random numbers, so every gift's sky is the same on every visit. */
function rng(seed: number) {
  let s = seed >>> 0 || 1;
  return () => {
    s ^= s << 13;
    s ^= s >>> 17;
    s ^= s << 5;
    return ((s >>> 0) % 1_000_000) / 1_000_000;
  };
}

function hexHash(hex: string) {
  let h = 2166136261;
  for (let i = 0; i < hex.length; i++) h = Math.imul(h ^ hex.charCodeAt(i), 16777619);
  return h >>> 0;
}

/** Glsl noise shared by the painter. Simplex 3D (Ashima, MIT) + fbm. */
const NOISE = /* glsl */ `
vec3 mod289(vec3 x){return x-floor(x*(1.0/289.0))*289.0;}
vec4 mod289(vec4 x){return x-floor(x*(1.0/289.0))*289.0;}
vec4 permute(vec4 x){return mod289(((x*34.0)+1.0)*x);}
vec4 taylorInvSqrt(vec4 r){return 1.79284291400159-0.85373472095314*r;}
float snoise(vec3 v){
  const vec2 C=vec2(1.0/6.0,1.0/3.0);const vec4 D=vec4(0.0,0.5,1.0,2.0);
  vec3 i=floor(v+dot(v,C.yyy));vec3 x0=v-i+dot(i,C.xxx);
  vec3 g=step(x0.yzx,x0.xyz);vec3 l=1.0-g;vec3 i1=min(g.xyz,l.zxy);vec3 i2=max(g.xyz,l.zxy);
  vec3 x1=x0-i1+C.xxx;vec3 x2=x0-i2+C.yyy;vec3 x3=x0-D.yyy;
  i=mod289(i);
  vec4 p=permute(permute(permute(i.z+vec4(0.0,i1.z,i2.z,1.0))+i.y+vec4(0.0,i1.y,i2.y,1.0))+i.x+vec4(0.0,i1.x,i2.x,1.0));
  float n_=0.142857142857;vec3 ns=n_*D.wyz-D.xzx;
  vec4 j=p-49.0*floor(p*ns.z*ns.z);vec4 x_=floor(j*ns.z);vec4 y_=floor(j-7.0*x_);
  vec4 x=x_*ns.x+ns.yyyy;vec4 y=y_*ns.x+ns.yyyy;vec4 h=1.0-abs(x)-abs(y);
  vec4 b0=vec4(x.xy,y.xy);vec4 b1=vec4(x.zw,y.zw);
  vec4 s0=floor(b0)*2.0+1.0;vec4 s1=floor(b1)*2.0+1.0;vec4 sh=-step(h,vec4(0.0));
  vec4 a0=b0.xzyw+s0.xzyw*sh.xxyy;vec4 a1=b1.xzyw+s1.xzyw*sh.zzww;
  vec3 p0=vec3(a0.xy,h.x);vec3 p1=vec3(a0.zw,h.y);vec3 p2=vec3(a1.xy,h.z);vec3 p3=vec3(a1.zw,h.w);
  vec4 norm=taylorInvSqrt(vec4(dot(p0,p0),dot(p1,p1),dot(p2,p2),dot(p3,p3)));
  p0*=norm.x;p1*=norm.y;p2*=norm.z;p3*=norm.w;
  vec4 m=max(0.6-vec4(dot(x0,x0),dot(x1,x1),dot(x2,x2),dot(x3,x3)),0.0);m=m*m;
  return 42.0*dot(m*m,vec4(dot(p0,x0),dot(p1,x1),dot(p2,x2),dot(p3,x3)));
}
float fbm(vec3 p){float a=0.5;float s=0.0;for(int i=0;i<6;i++){s+=a*snoise(p);p=p*2.03+vec3(1.7,9.2,3.1);a*=0.5;}return s;}
float ridged(vec3 p){float a=0.5;float s=0.0;for(int i=0;i<5;i++){float n=1.0-abs(snoise(p));s+=a*n*n;p=p*2.1+vec3(4.3,1.1,7.7);a*=0.5;}return s;}
`;

/** The galactic plane: tilted so the band arcs across the view from lower left to upper right. */
const GALAXY_NORMAL = new THREE.Vector3(0.78, 0.55, 0.3).normalize();

/* ------------------------------------------------------------------ the sky painter */

/** Paints the sky dome into an equirectangular texture, once. */
function paintSky(
  renderer: THREE.WebGLRenderer,
  tint: THREE.Color,
  accent: THREE.Color,
  seed: number,
  lite: boolean,
) {
  const w = lite ? 2048 : 4096;
  const h = w / 2;
  const target = new THREE.WebGLRenderTarget(w, h, {
    type: THREE.UnsignedByteType,
    magFilter: THREE.LinearFilter,
    minFilter: THREE.LinearFilter,
    wrapS: THREE.RepeatWrapping,
    generateMipmaps: false,
    depthBuffer: false,
  });
  const mat = new THREE.ShaderMaterial({
    uniforms: {
      uTint: { value: tint },
      uAccent: { value: accent },
      uNormal: { value: GALAXY_NORMAL },
      uSeed: { value: (seed % 1000) / 37.0 },
    },
    vertexShader: /* glsl */ `varying vec2 vUv; void main(){ vUv=uv; gl_Position=vec4(position.xy,0.0,1.0); }`,
    fragmentShader: /* glsl */ `
      precision highp float;
      varying vec2 vUv;
      uniform vec3 uTint; uniform vec3 uAccent; uniform vec3 uNormal; uniform float uSeed;
      ${NOISE}
      void main(){
        float lon = (vUv.x - 0.5) * 6.2831853;
        float lat = (vUv.y - 0.5) * 3.1415926;
        vec3 d = vec3(cos(lat) * sin(lon), sin(lat), -cos(lat) * cos(lon));
        vec3 q = d * 2.0 + uSeed;

        // The night: deep at the top, a little lighter toward the horizon, with the gift's colour in it.
        float up = clamp(d.y * 0.5 + 0.5, 0.0, 1.0);
        vec3 night = mix(vec3(0.010, 0.014, 0.035), vec3(0.002, 0.003, 0.010), smoothstep(0.45, 1.0, up));
        night += uTint * 0.030 * (1.0 - up);

        // Airglow: a thin green-teal haze just above the horizon, like long exposures show.
        float glow = exp(-pow(max(d.y + 0.16, 0.0) * 7.0, 1.6));
        night += vec3(0.020, 0.055, 0.050) * glow * 0.9 + uTint * 0.03 * glow;

        // The Milky Way band.
        float g = dot(d, uNormal);
        float warp = fbm(q * 1.4) * 0.05;
        float band = exp(-pow((g + warp) / 0.21, 2.0));
        float core = exp(-pow((g + warp * 0.6) / 0.07, 2.0));
        // Brighter toward the galactic centre (one side of the band).
        vec3 centreDir = normalize(cross(uNormal, vec3(0.0, 1.0, 0.0)) + vec3(0.0, 0.25, 0.0));
        float toward = pow(max(dot(d, centreDir) * 0.5 + 0.5, 0.0), 2.2);

        float clouds = fbm(q * 3.0) * 0.5 + 0.5;
        float fine = ridged(q * 7.5);
        float lum = band * (0.35 + 0.85 * clouds) * (0.45 + 0.9 * toward) + core * fine * 0.9 * (0.4 + toward);

        // Dust lanes: dark, filamentary, right along the middle.
        float lanes = smoothstep(0.15, 0.75, fbm(q * 5.0 + 3.7) * 0.5 + 0.5 + ridged(q * 9.0) * 0.25);
        lum *= 1.0 - lanes * core * 0.85 - lanes * band * 0.35;
        lum = max(lum, 0.0);

        vec3 warm = vec3(1.00, 0.86, 0.68);
        vec3 cool = vec3(0.70, 0.78, 1.00);
        vec3 milky = mix(cool, warm, clamp(core * 0.8 + toward * 0.6, 0.0, 1.0)) * lum * 0.48;

        // Nebulae in the gift's colours, drifting near the band.
        float neb = smoothstep(0.55, 1.0, fbm(q * 1.8 + 11.0) * 0.5 + 0.5) * (0.35 + band);
        float neb2 = smoothstep(0.6, 1.0, fbm(q * 2.6 - 5.0) * 0.5 + 0.5) * (0.25 + band * 0.8);
        vec3 nebula = uAccent * neb * 0.16 + mix(uTint, vec3(0.42, 0.28, 0.95), 0.5) * neb2 * 0.15 + vec3(0.15, 0.45, 0.75) * smoothstep(0.62, 1.0, fbm(q * 2.2 + 40.0) * 0.5 + 0.5) * band * 0.10;

        // A faint red hydrogen glow in a few knots, for realism.
        float ha = smoothstep(0.72, 1.0, fbm(q * 4.2 + 21.0) * 0.5 + 0.5) * band;
        nebula += vec3(0.85, 0.20, 0.30) * ha * 0.08;

        // Unresolved star dust: a grain of light everywhere, more along the band.
        float grain = pow(fract(sin(dot(vUv * vec2(4096.0, 2048.0), vec2(12.9898, 78.233))) * 43758.5453), 28.0);
        vec3 col = night + milky + nebula + vec3(grain) * band * 0.18;
        // Stored with a square-root curve: 8 bits are plenty for the darks that way.
        gl_FragColor = vec4(sqrt(max(col, 0.0)), 1.0);
      }
    `,
    depthTest: false,
    depthWrite: false,
  });
  const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), mat);
  const scene = new THREE.Scene();
  scene.add(quad);
  const cam = new THREE.Camera();
  const prev = renderer.getRenderTarget();
  renderer.setRenderTarget(target);
  renderer.render(scene, cam);
  renderer.setRenderTarget(prev);
  quad.geometry.dispose();
  mat.dispose();
  return target;
}

/* ------------------------------------------------------------------ the scene */

export function createSky(canvas: HTMLCanvasElement, opts: SkyOptions): Sky | null {
  let renderer: THREE.WebGLRenderer;
  try {
    renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: false,
      alpha: false,
      powerPreference: "high-performance",
    });
  } catch {
    return null;
  }
  if (!renderer.getContext()) return null;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, opts.lite ? 1.5 : 1.75));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.15;

  const tint = new THREE.Color(opts.tint);
  const accent = new THREE.Color(opts.accent);
  const seed = hexHash(opts.tint + opts.accent);
  const rand = rng(seed);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(55, 1, 0.1, 400);

  // Everything that turns with the earth.
  const heavens = new THREE.Group();
  heavens.rotation.z = 0.12;
  scene.add(heavens);

  /* 1. the dome */
  const skyTex = paintSky(renderer, tint, accent, seed, opts.lite);
  const domeMat = new THREE.ShaderMaterial({
    uniforms: {
      uSky: { value: skyTex.texture },
      uFade: { value: opts.still ? 1 : 0 },
      uBloom: { value: 0 },
      uBloomDir: { value: new THREE.Vector3(0, 0.05, -1).normalize() },
      uAccent: { value: accent },
    },
    vertexShader: /* glsl */ `
      varying vec3 vDir; varying vec3 vWorld;
      void main(){ vDir = normalize(position); vWorld = normalize((modelMatrix * vec4(position,1.0)).xyz);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
    fragmentShader: /* glsl */ `
      precision highp float;
      varying vec3 vDir; varying vec3 vWorld;
      uniform sampler2D uSky; uniform float uFade; uniform float uBloom; uniform vec3 uBloomDir; uniform vec3 uAccent;
      void main(){
        vec3 d = normalize(vDir);
        vec2 uv = vec2(atan(d.x, -d.z) / 6.2831853 + 0.5, asin(clamp(d.y,-1.0,1.0)) / 3.1415926 + 0.5);
        vec3 sky = texture2D(uSky, uv).rgb; vec3 col = sky * sky * uFade;
        // When every star is found, a soft glow blooms behind the heart.
        float b = pow(max(dot(normalize(vWorld), uBloomDir), 0.0), 18.0);
        col += uAccent * b * 0.22 * uBloom + vec3(1.0, 0.92, 0.75) * pow(b, 3.0) * 0.18 * uBloom;
        gl_FragColor = vec4(col, 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
    side: THREE.BackSide,
    depthWrite: false,
  });
  const dome = new THREE.Mesh(new THREE.SphereGeometry(200, 64, 32), domeMat);
  dome.renderOrder = -10;
  heavens.add(dome);

  /* 2. background stars */
  const count = opts.lite ? 4200 : 9000;
  const pos = new Float32Array(count * 3);
  const col = new Float32Array(count * 3);
  const size = new Float32Array(count);
  const phase = new Float32Array(count);
  const palette = [
    new THREE.Color("#9fb8ff"),
    new THREE.Color("#c9d6ff"),
    new THREE.Color("#ffffff"),
    new THREE.Color("#fff3e0"),
    new THREE.Color("#ffd8a8"),
    new THREE.Color("#ffb48a"),
  ];
  const v = new THREE.Vector3();
  for (let i = 0; i < count;) {
    // Uniform on the sphere, then thinned away from the Milky Way.
    const u = rand() * 2 - 1;
    const a = rand() * TAU;
    const r = Math.sqrt(1 - u * u);
    v.set(r * Math.cos(a), u, r * Math.sin(a));
    const g = v.dot(GALAXY_NORMAL);
    const keep = 0.16 + 0.84 * Math.exp(-(g * g) / (0.22 * 0.22));
    if (rand() > keep) continue;
    v.multiplyScalar(150);
    pos.set([v.x, v.y, v.z], i * 3);
    // Magnitudes: lots of faint ones, few bright ones.
    const m = Math.pow(rand(), 7.5);
    size[i] = 0.7 + m * 7.5;
    const c =
      palette[Math.min(palette.length - 1, Math.floor(Math.pow(rand(), 0.8) * palette.length))]!;
    col.set([c.r, c.g, c.b], i * 3);
    phase[i] = rand() * 100;
    i++;
  }
  const starGeo = new THREE.BufferGeometry();
  starGeo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  starGeo.setAttribute("color", new THREE.BufferAttribute(col, 3));
  starGeo.setAttribute("size", new THREE.BufferAttribute(size, 1));
  starGeo.setAttribute("phase", new THREE.BufferAttribute(phase, 1));
  const starMat = new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uPx: { value: renderer.getPixelRatio() },
      uFade: { value: opts.still ? 1 : 0 },
      uTwinkle: { value: opts.still ? 0 : 1 },
    },
    vertexShader: /* glsl */ `
      attribute float size; attribute float phase; attribute vec3 color;
      uniform float uTime; uniform float uPx; uniform float uTwinkle;
      varying vec3 vColor; varying float vBright; varying float vSize;
      void main(){
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        // Scintillation: faster and stronger near the horizon, like real air.
        vec3 w = normalize((modelMatrix * vec4(position,1.0)).xyz);
        float air = mix(1.0, 2.2, smoothstep(0.35, -0.2, w.y));
        float tw = 1.0 + uTwinkle * air * 0.22 * (sin(uTime * (1.3 + fract(phase) * 2.4) + phase) * 0.6 + sin(uTime * 3.7 + phase * 1.7) * 0.4);
        vBright = tw;
        vColor = color;
        vSize = size;
        gl_PointSize = size * uPx * (0.85 + 0.25 * tw);
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: /* glsl */ `
      precision highp float;
      varying vec3 vColor; varying float vBright; varying float vSize;
      uniform float uFade;
      void main(){
        vec2 p = gl_PointCoord * 2.0 - 1.0;
        float r = length(p);
        float core = exp(-r * r * 18.0);
        float halo = exp(-r * 4.5) * 0.25;
        // Only the brightest get diffraction spikes.
        float big = smoothstep(4.0, 7.0, vSize);
        float spikes = (exp(-abs(p.y) * 28.0) * exp(-abs(p.x) * 2.8) + exp(-abs(p.x) * 28.0) * exp(-abs(p.y) * 2.8)) * 0.55 * big;
        float mag = 0.22 + 0.78 * smoothstep(0.8, 4.5, vSize);
        float a = (core + halo + spikes) * vBright * uFade * mag * (1.0 - smoothstep(0.75, 1.0, r));
        if (a < 0.003) discard;
        gl_FragColor = vec4(vColor * a, 1.0);
        #include <colorspace_fragment>
      }`,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  const starPoints = new THREE.Points(starGeo, starMat);
  starPoints.renderOrder = -5;
  heavens.add(starPoints);

  /* 3. the ridge: a mountain line in silhouette. Its height is set so it always sits low in the frame. */
  const groundColor = new THREE.Color().setRGB(0.004, 0.005, 0.012).lerp(tint, 0.012);
  const ridgeSteps = 480;
  const ridgeAz: number[] = [];
  const ridgeEl: number[] = [];
  const ridgeTop: number[] = [];
  const ridgeIdx: number[] = [];
  const ridgeRand = rng(seed ^ 0x9e3779b9);
  const peaks = Array.from({ length: 9 }, () => ({
    at: ridgeRand() * TAU,
    w: 0.12 + ridgeRand() * 0.45,
    h: 0.025 + ridgeRand() * 0.06,
  }));
  const ridgeAt = (az: number) => {
    let e = 0;
    let front = Math.abs(az);
    front = Math.min(front, TAU - front);
    // Peaks shrink toward the middle of the view, so the heart always has clear sky under it.
    const calm = 0.2 + 0.8 * (1 - Math.exp(-(front * front) / 0.45));
    for (const p of peaks) {
      let d = Math.abs(az - p.at);
      d = Math.min(d, TAU - d);
      e += p.h * calm * Math.exp(-(d * d) / (p.w * p.w));
    }
    e +=
      Math.sin(az * 9 + seed) * 0.005 +
      Math.sin(az * 23 + seed * 0.3) * 0.0028 +
      Math.sin(az * 61 + 1.3) * 0.0012 +
      Math.sin(az * 140) * 0.0006;
    // A low saddle straight ahead, higher shoulders to the sides.
    e -= 0.035 * Math.exp(-(front * front) / 0.3);
    e += 0.02 * (1 - Math.exp(-(front * front) / 0.5));
    return e;
  };
  for (let i = 0; i <= ridgeSteps; i++) {
    const az = (i / ridgeSteps) * TAU - Math.PI;
    ridgeAz.push(az, az);
    ridgeEl.push(ridgeAt(az), 0);
    ridgeTop.push(1, 0);
    if (i < ridgeSteps) {
      const k = i * 2;
      ridgeIdx.push(k, k + 1, k + 2, k + 1, k + 3, k + 2);
    }
  }
  const ridgeGeo = new THREE.BufferGeometry();
  ridgeGeo.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(new Array(ridgeAz.length * 3).fill(0), 3),
  );
  ridgeGeo.setAttribute("az", new THREE.Float32BufferAttribute(ridgeAz, 1));
  ridgeGeo.setAttribute("el", new THREE.Float32BufferAttribute(ridgeEl, 1));
  ridgeGeo.setAttribute("top", new THREE.Float32BufferAttribute(ridgeTop, 1));
  ridgeGeo.setIndex(ridgeIdx);
  const ridgeMat = new THREE.ShaderMaterial({
    uniforms: {
      uGround: { value: groundColor },
      uRim: { value: tint.clone().lerp(new THREE.Color("#a8c2ff"), 0.7) },
      uBase: { value: -0.3 },
    },
    vertexShader: /* glsl */ `
      attribute float az; attribute float el; attribute float top;
      uniform float uBase;
      varying float vTop;
      void main(){
        float e = top > 0.5 ? uBase + el : -1.45;
        vec3 p = vec3(sin(az) * cos(e), sin(e), -cos(az) * cos(e)) * 120.0;
        vTop = top;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
      }`,
    fragmentShader: /* glsl */ `
      precision highp float; varying float vTop; uniform vec3 uGround; uniform vec3 uRim;
      void main(){
        // A faint moonlit edge along the crest, then solid night.
        float rim = pow(clamp(vTop, 0.0, 1.0), 60.0);
        vec3 c = uGround + uRim * 0.05 * rim;
        gl_FragColor = vec4(c, 1.0);
        #include <colorspace_fragment>
      }`,
    side: THREE.DoubleSide,
  });
  const ridge = new THREE.Mesh(ridgeGeo, ridgeMat);
  ridge.frustumCulled = false;
  ridge.renderOrder = 1;
  scene.add(ridge);

  /* 4. the friends' stars */
  const n = opts.stars.length;
  const friendPos = new Float32Array(n * 3);
  const friendLit = new Float32Array(n);
  const friendHover = new Float32Array(n);
  const friendPhase = new Float32Array(n);
  const world: THREE.Vector3[] = [];
  const dists: number[] = [];
  for (let i = 0; i < n; i++) {
    world.push(new THREE.Vector3(0, 0, -30));
    dists.push(26 + rand() * 10);
    friendPhase[i] = rand() * 10;
  }
  // The heart's bounds in the old layout space, so it can be fitted to any screen.
  const xs = opts.stars.map((s) => s.x);
  const ys = opts.stars.map((s) => s.y);
  const bx0 = Math.min(...xs, 30);
  const bx1 = Math.max(...xs, 70);
  const by0 = Math.min(...ys, 30);
  const by1 = Math.max(...ys, 60);
  let safeTop = 0.28;
  const restCam = new THREE.PerspectiveCamera(55, 1, 0.1, 400);
  const restFov = (aspect: number) => 55 + (aspect < 0.8 ? (0.8 - aspect) * 34 : 0);

  /**
   * Puts the friends' stars where they'll look right at rest: between the title and the
   * mountains, as wide as fits. Then puts the mountains just under them.
   */
  function place() {
    const aspect = w / h;
    restCam.fov = restFov(aspect);
    restCam.aspect = aspect;
    restCam.position.set(0, 0, 0);
    restCam.rotation.set(0, 0, 0);
    restCam.updateProjectionMatrix();
    restCam.updateMatrixWorld();
    const ridgeAtY = aspect < 0.8 ? 0.89 : 0.925;
    const top = Math.min(0.5, safeTop + 0.045);
    const bottom = ridgeAtY - (aspect < 0.8 ? 0.1 : 0.115);
    const availW = w * (aspect < 0.8 ? 0.86 : Math.min(0.62, (h * 1.25) / w));
    const availH = (bottom - top) * h;
    const scale = Math.min(availW / (bx1 - bx0), availH / (by1 - by0));
    const cx = w / 2;
    const cy = (top * h + bottom * h) / 2;
    const v3 = new THREE.Vector3();
    for (let i = 0; i < n; i++) {
      const s = opts.stars[i]!;
      const px = cx + (s.x - (bx0 + bx1) / 2) * scale;
      const py = cy + (s.y - (by0 + by1) / 2) * scale;
      v3.set((px / w) * 2 - 1, -(py / h) * 2 + 1, 0.5)
        .unproject(restCam)
        .normalize()
        .multiplyScalar(dists[i]!);
      world[i]!.copy(v3);
      friendPos.set([v3.x, v3.y, v3.z], i * 3);
    }
    friendGeo.attributes["position"]!.needsUpdate = true;
    const ndcY = 1 - 2 * ridgeAtY;
    const halfV = THREE.MathUtils.degToRad(restCam.fov / 2);
    ridgeMat.uniforms["uBase"]!.value = Math.atan(ndcY * Math.tan(halfV));
    if (world.length) {
      const c = new THREE.Vector3();
      world.forEach((p) => c.add(p));
      domeMat.uniforms["uBloomDir"]!.value = c.normalize();
    }
  }

  const friendGeo = new THREE.BufferGeometry();
  friendGeo.setAttribute("position", new THREE.BufferAttribute(friendPos, 3));
  friendGeo.setAttribute("lit", new THREE.BufferAttribute(friendLit, 1));
  friendGeo.setAttribute("hover", new THREE.BufferAttribute(friendHover, 1));
  friendGeo.setAttribute("phase", new THREE.BufferAttribute(friendPhase, 1));
  const friendMat = new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uPx: { value: renderer.getPixelRatio() },
      uScale: { value: 1 },
      uAppear: { value: opts.still ? 1 : 0 },
      uAccent: { value: accent },
      uDone: { value: 0 },
    },
    vertexShader: /* glsl */ `
      attribute float lit; attribute float hover; attribute float phase;
      uniform float uTime; uniform float uPx; uniform float uScale; uniform float uAppear; uniform float uDone;
      varying float vLit; varying float vPulse; varying float vHover;
      void main(){
        vLit = lit; vHover = hover;
        vPulse = 0.85 + 0.15 * sin(uTime * 1.6 + phase * 6.0) + uDone * 0.12 * sin(uTime * 2.4);
        float appear = clamp(uAppear * 1.6 - phase * 0.06, 0.0, 1.0);
        gl_PointSize = (44.0 + lit * 8.0 + hover * 14.0) * uPx * uScale * appear * vPulse;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }`,
    fragmentShader: /* glsl */ `
      precision highp float;
      varying float vLit; varying float vPulse; varying float vHover;
      uniform vec3 uAccent; uniform float uTime;
      void main(){
        vec2 p = gl_PointCoord * 2.0 - 1.0;
        float r = length(p);
        float core = exp(-r * r * 90.0) * 1.6;
        float inner = exp(-r * r * 14.0) * 0.55;
        float halo = exp(-r * 4.2) * 0.26;
        // Four long spikes and four faint short ones, slowly turning.
        float ang = 0.12 * sin(uTime * 0.2);
        mat2 rot = mat2(cos(ang), -sin(ang), sin(ang), cos(ang));
        vec2 q = rot * p;
        float spikes = exp(-abs(q.y) * 60.0) * exp(-abs(q.x) * 2.2) + exp(-abs(q.x) * 60.0) * exp(-abs(q.y) * 2.2);
        vec2 q2 = mat2(0.7071, -0.7071, 0.7071, 0.7071) * q;
        spikes += (exp(-abs(q2.y) * 80.0) * exp(-abs(q2.x) * 5.0) + exp(-abs(q2.x) * 80.0) * exp(-abs(q2.y) * 5.0)) * 0.35;
        vec3 cold = mix(vec3(0.82, 0.88, 1.0), uAccent, 0.25);
        vec3 gold = vec3(1.0, 0.8, 0.45);
        vec3 c = mix(cold, gold, vLit);
        float a = (core + inner * (1.0 - 0.25 * vLit) + halo * (0.85 + 0.15 * vLit) + spikes * (0.5 + 0.15 * vLit + 0.3 * vHover)) * vPulse;
        // A ring that breathes around stars not found yet, so they read as "tap me".
        float ring = (1.0 - vLit) * smoothstep(0.05, 0.0, abs(r - (0.42 + 0.06 * sin(uTime * 2.0)))) * 0.25;
        a += ring;
        a *= 1.0 - smoothstep(0.72, 1.0, r);
        if (a < 0.004) discard;
        gl_FragColor = vec4(c * a, 1.0);
        #include <colorspace_fragment>
      }`,
    transparent: true,
    depthWrite: false,
    depthTest: false,
    blending: THREE.AdditiveBlending,
  });
  const friends = new THREE.Points(friendGeo, friendMat);
  friends.renderOrder = 5;
  friends.frustumCulled = false;
  scene.add(friends);

  /* ------------------------------------------------------------------ motion */
  // Critically damped springs, one per value.
  type Spring = { x: number; v: number; to: number; k: number };
  const spring = (x: number, k = 9): Spring => ({ x, v: 0, to: x, k });
  const step = (s: Spring, dt: number) => {
    const k = s.k;
    const a = -k * k * (s.x - s.to) - 2 * k * s.v;
    s.v += a * dt;
    s.x += s.v * dt;
  };
  const yaw = spring(0, 5);
  const pitch = spring(opts.still ? 0 : -0.62, 1.6);
  const fov = spring(opts.still ? 55 : 72, 1.6);
  const shiftX = spring(0, 5);
  const shiftY = spring(0, 5);
  const fade = spring(opts.still ? 1 : 0, 1.2);
  const appear = spring(opts.still ? 1 : 0, 1.1);
  const bloom = spring(0, 1.4);
  let dragYaw = 0;
  let dragPitch = 0;
  let leanX = 0;
  let leanY = 0;
  let dragging = false;
  let hover = -1;
  let litNow: boolean[] = new Array(n).fill(false);
  const litAnim = Array.from({ length: n }, () => spring(0, 7));
  const hoverAnim = Array.from({ length: n }, () => spring(0, 10));

  let w = 1;
  let h = 1;
  const projected: Projected[] = world.map(() => ({ x: 0, y: 0, on: false }));
  const listeners: ((s: Projected[], t: number) => void)[] = [];
  let running = true;
  let raf = 0;
  let last = performance.now();
  const t0 = last;
  let introAt = opts.still ? -1 : 0;
  const tmp = new THREE.Vector3();

  function layoutCamera() {
    camera.fov = fov.x;
    camera.aspect = w / h;
    // Phones are tall: widen the view a little so the heart fits.
    camera.fov = fov.x + (restFov(camera.aspect) - 55);
    camera.updateProjectionMatrix();
    camera.position.set(shiftX.x, shiftY.x, 0);
    camera.rotation.order = "YXZ";
    camera.rotation.set(pitch.x, -yaw.x, 0);
  }

  function frame(now: number) {
    raf = 0;
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    const t = (now - t0) / 1000;

    if (!opts.still) {
      if (introAt >= 0 && t - introAt > 0.35) {
        pitch.to = 0;
        fov.to = 55;
        fade.to = 1;
      }
      if (introAt >= 0 && t - introAt > 1.6) appear.to = 1;
      const idleYaw = dragging ? 0 : Math.sin(t * 0.07) * 0.025;
      yaw.to = dragYaw + leanX * 0.05 + idleYaw;
      if (introAt >= 0 && t - introAt > 0.35) pitch.to = dragPitch + leanY * 0.035;
      shiftX.to = -(dragYaw + leanX * 0.05) * 6;
      shiftY.to = (dragPitch + leanY * 0.035) * 5;
      for (const s of [yaw, pitch, fov, shiftX, shiftY, fade, appear, bloom]) step(s, dt);
      heavens.rotation.y = t * 0.006;
    } else {
      for (const s of [yaw, pitch, fov, shiftX, shiftY, fade, appear, bloom]) {
        s.x = s.to;
        s.v = 0;
      }
    }

    let dirty = false;
    for (let i = 0; i < n; i++) {
      litAnim[i]!.to = litNow[i] ? 1 : 0;
      hoverAnim[i]!.to = hover === i ? 1 : 0;
      if (opts.still) {
        litAnim[i]!.x = litAnim[i]!.to;
        hoverAnim[i]!.x = hoverAnim[i]!.to;
      } else {
        step(litAnim[i]!, dt);
        step(hoverAnim[i]!, dt);
      }
      if (
        Math.abs(friendLit[i]! - litAnim[i]!.x) > 1e-4 ||
        Math.abs(friendHover[i]! - hoverAnim[i]!.x) > 1e-4
      )
        dirty = true;
      friendLit[i] = litAnim[i]!.x;
      friendHover[i] = hoverAnim[i]!.x;
    }
    if (dirty) {
      friendGeo.attributes["lit"]!.needsUpdate = true;
      friendGeo.attributes["hover"]!.needsUpdate = true;
    }

    const time = opts.still ? 0 : t;
    starMat.uniforms["uTime"]!.value = time;
    starMat.uniforms["uFade"]!.value = fade.x;
    domeMat.uniforms["uFade"]!.value = 0.25 + 0.75 * fade.x;
    domeMat.uniforms["uBloom"]!.value = bloom.x;
    friendMat.uniforms["uTime"]!.value = time;
    friendMat.uniforms["uAppear"]!.value = appear.x;
    friendMat.uniforms["uDone"]!.value = bloom.x;
    friendMat.uniforms["uScale"]!.value = Math.min(1.0, Math.max(0.62, Math.min(w, h * 1.3) / 640));

    layoutCamera();
    renderer.render(scene, camera);

    for (let i = 0; i < n; i++) {
      tmp.copy(world[i]!).project(camera);
      const pr = projected[i]!;
      pr.x = (tmp.x * 0.5 + 0.5) * w;
      pr.y = (-tmp.y * 0.5 + 0.5) * h;
      pr.on = tmp.z < 1 && appear.x > 0.35;
    }
    for (const cb of listeners) cb(projected, t);

    if (running && !opts.still) raf = requestAnimationFrame(frame);
  }

  function kick() {
    if (!raf) raf = requestAnimationFrame(frame);
  }

  return {
    ground: `#${groundColor.getHexString()}`,
    setLit(lit) {
      litNow = lit;
      kick();
    },
    setDone(done) {
      bloom.to = done ? 1 : 0;
      kick();
    },
    setHover(i) {
      hover = i;
      kick();
    },
    drag(dx, dy) {
      dragging = true;
      dragYaw = Math.max(-0.42, Math.min(0.42, (-dx / Math.max(300, w)) * 0.9));
      dragPitch = Math.max(-0.12, Math.min(0.32, (dy / Math.max(300, h)) * 0.7));
      kick();
    },
    release() {
      dragging = false;
      dragYaw = 0;
      dragPitch = 0;
      kick();
    },
    lean(x, y) {
      leanX = x;
      leanY = y;
    },
    intro() {
      if (opts.still) return;
      introAt = (performance.now() - t0) / 1000;
      pitch.x = -0.62;
      pitch.v = 0;
      pitch.to = -0.62;
      fov.x = 72;
      fov.to = 72;
      fade.x = 0;
      fade.to = 0;
      appear.x = 0;
      appear.to = 0;
      kick();
    },
    resize(nw, nh) {
      w = Math.max(1, nw);
      h = Math.max(1, nh);
      renderer.setSize(w, h, false);
      place();
      kick();
    },
    setSafeTop(px) {
      safeTop = Math.max(0, Math.min(0.5, px / h));
      place();
      kick();
    },
    onFrame(cb) {
      listeners.push(cb);
    },
    setRunning(on) {
      running = on;
      if (on) {
        last = performance.now();
        kick();
      }
    },
    dispose() {
      running = false;
      if (raf) cancelAnimationFrame(raf);
      skyTex.dispose();
      for (const o of [dome, starPoints, ridge, friends]) {
        o.geometry.dispose();
        (o.material as THREE.Material).dispose();
      }
      renderer.dispose();
    },
  };
}
