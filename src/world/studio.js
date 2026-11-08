/* The studio: renderer, lighting, post-processing, camera tour and interaction.

   "Real" view: PBR materials, baked light, subtle bloom, a light grade, vignette and grain.
   "Machine" view (basement.studio's Human/Machine idea): white edges and 1-bit ordered dithering.

   Scroll progress (0 → 1) moves the camera down the stairs and through six stops. */

import * as THREE from "three";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/examples/jsm/postprocessing/OutputPass.js";
import { ShaderPass } from "three/examples/jsm/postprocessing/ShaderPass.js";
import { OutlinePass } from "three/examples/jsm/postprocessing/OutlinePass.js";
import { GTAOPass } from "three/examples/jsm/postprocessing/GTAOPass.js";
import { RectAreaLightUniformsLib } from "three/examples/jsm/lights/RectAreaLightUniformsLib.js";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { captureCube, loadRoomEnv, bakeRoomEnv } from "./envmap.js";
import { loadBake, applyBake } from "./bake.js";

import { loadAssets } from "./assets.js";
import { Screen } from "./kit.js";
import { buildRoom } from "./room.js";
import { buildWeb } from "./stations/web.js";
import { buildAutomation } from "./stations/automation.js";
import { buildAssistant } from "./stations/assistant.js";
import { buildAds } from "./stations/ads.js";
import { buildDoor } from "./stations/door.js";
import { buildFurnish } from "./furnish.js";
import { mergeStatic, pickProxy } from "./perf.js";

// pos: camera, look: target, shift: metres the station sits right of centre (room for the caption)
// mpos / mlook: optional camera and target for portrait phones, where the view is much narrower
const STOPS = [
  { id: "intro",      pos: [-5.0, 1.9, 3.95],  look: [1.6, 1.15, -2.9], shift: 0 },
  { id: "websites",   pos: [-2.8, 1.5, -2.35],   look: [-3.3, 1.0, -4.45],  shift: 0.28, mpos: [-3.2, 1.6, -2.05], mlook: [-3.53, 0.95, -4.45] },
  { id: "automation", pos: [2.5, 1.55, -1.2],  look: [1.3, 1.15, -4.3],  shift: 0.5 },
  { id: "assistants", pos: [3.45, 1.3, -1.2],  look: [4.3, 0.85, -3.2],  shift: 0.36, mpos: [3.8, 1.5, -1.0], mlook: [4.05, 0.8, -3.4] },
  { id: "ads",        pos: [2.8, 1.6, 1.5],    look: [7.0, 1.7, 0.9],    shift: 0.38 },
  { id: "contact",    pos: [3.6, 1.65, 3.2],   look: [7.0, 1.8, 3.75],   shift: 0.42 },
];

/* The finish, added inside the output pass (after tone mapping and the colour space) rather than
   as passes of their own, so it costs no extra full-screen draw:
   - a gentle grade: a little more colour and contrast, as a film print would have
   - a soft vignette, so the eye settles on the middle of the frame
   - fine, low-amplitude sensor grain (it also dithers away banding in the dark gradients)
   finish = 0 turns grade and vignette off (the "Machine" view dithers the image itself). */
function addFinish(output) {
  output.uniforms.grainTime = { value: 0 };
  output.uniforms.grainAmount = { value: 0.006 };
  output.uniforms.finish = { value: 1 };
  const fs = output.material.fragmentShader;
  const end = fs.lastIndexOf("}");
  output.material.fragmentShader = fs.slice(0, fs.indexOf("void main")) +
    "uniform float grainTime;\nuniform float grainAmount;\nuniform float finish;\n" +
    "float grainRand(vec2 co) { return fract(sin(dot(co, vec2(12.9898, 78.233))) * 43758.5453); }\n" +
    fs.slice(fs.indexOf("void main"), end) +
    "  vec3 c = gl_FragColor.rgb;\n" +
    "  c = mix(vec3(dot(c, vec3(0.2126, 0.7152, 0.0722))), c, 1.0 + 0.06 * finish);\n" +
    "  c = clamp((c - 0.5) * (1.0 + 0.07 * finish) + 0.5 - 0.004 * finish, 0.0, 1.0);\n" +
    "  vec2 q = vUv - 0.5;\n" +
    "  c *= 1.0 - 0.18 * finish * smoothstep(0.25, 0.85, dot(q, q) * 2.2);\n" +
    "  gl_FragColor.rgb = c + (grainRand(vUv * vec2(1920.0, 1080.0) + grainTime) - 0.5) * grainAmount;\n}\n";
  return { uniforms: output.uniforms };
}

/* 1-bit ordered dithering, pixelated: white (or red, where the scene is red) on black */
const DitherShader = {
  uniforms: { tDiffuse: { value: null }, resolution: { value: new THREE.Vector2(1, 1) }, pixel: { value: 2 } },
  vertexShader: "varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }",
  fragmentShader: `
    uniform sampler2D tDiffuse; uniform vec2 resolution; uniform float pixel; varying vec2 vUv;
    float bayer2(vec2 a){ a = floor(a); return fract(a.x / 2.0 + a.y * a.y * 0.75); }
    float bayer4(vec2 a){ return bayer2(0.5 * a) * 0.25 + bayer2(a); }
    float bayer8(vec2 a){ return bayer4(0.5 * a) * 0.25 + bayer2(a); }
    void main(){
      vec2 px = floor(vUv * resolution / pixel);
      vec4 c = texture2D(tDiffuse, (px + 0.5) * pixel / resolution);
      float l = dot(c.rgb, vec3(0.299, 0.587, 0.114));
      l = pow(smoothstep(0.06, 0.85, l), 1.6);
      float on = step(bayer8(px), l);
      bool red = c.r > 0.3 && c.r > c.g * 1.8 && c.r > c.b * 1.8;
      vec3 col = red ? vec3(1.0, 0.24, 0.12) : vec3(0.93, 0.91, 0.87);
      gl_FragColor = vec4(col * on, 1.0);
    }`,
};

// How strongly the captured room lights and reflects itself (it stands in for bounced light)
// Keep reflections present but let the practical lights shape the room instead of filling it evenly.
const ROOM_ENV = 1.0;
const CAPTURE_AT = new THREE.Vector3(0.6, 1.45, -1.2); // where the room photographs its reflections from

/* After building, nothing but a handful of parts moves, so the rest stops recomputing its
   matrices every frame (parts that move are flagged userData.dynamic). */
function freezeStatic(root) {
  root.traverse((o) => {
    if (o === root) return;
    for (let p = o; p; p = p.parent) if (p.userData.dynamic) return;
    o.updateMatrix(); o.matrixAutoUpdate = false;
  });
}

const smooth = (x) => x * x * x * (x * (x * 6 - 15) + 10);
const plateau = (x) => smooth(Math.min(1, Math.max(0, (x - 0.2) / 0.6)));

/* Quality tiers. The studio starts at "medium" (phones at "low") and moves itself up or down
   based on how long frames actually take on this device. Below "low" it keeps lowering its
   resolution (RES_STEPS) rather than ever giving up on the 3D. With baked lighting, AO and the
   live shadow are off on every tier: the bake already has them. */
const TIERS = [
  { name: "low",    dpr: 1,    msaa: 2, ao: false, liveShadow: false, bloom: 0.35, uploads: 2 },
  { name: "medium", dpr: 1.5, msaa: 4, ao: true,  liveShadow: true,  bloom: 0.2, uploads: 3 },
  { name: "high",   dpr: 1.75, msaa: 4, ao: true,  liveShadow: true,  bloom: 0.2, uploads: 4 },
];
const RES_STEPS = [1, 0.8, 0.65]; // on "low" only: the share of its resolution a struggling device draws

export function createStudio(canvas, { reduce, still, onProgress, onReady, onHover, onSelect }) {
  const small = Math.min(window.innerWidth, window.innerHeight) < 700;
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: "high-performance", stencil: false });
  // Keep desktop on the medium tier by default so capable integrated GPUs do not receive a
  // visibly soft, no-AO render. Real frame times still step the tier down when a machine needs it.
  const gpu = (() => { try { const gl = renderer.getContext(), e = gl.getExtension("WEBGL_debug_renderer_info"); return e ? gl.getParameter(e.UNMASKED_RENDERER_WEBGL) : ""; } catch { return ""; } })();
  const weak = /intel|swiftshader|llvmpipe|mali|adreno|powervr|microsoft basic/i.test(gpu) && !/\barc\b/i.test(gpu);
  // ?quality=low|medium|high pins a tier and turns adapting off (benchmarks, comparing looks)
  const pinned = TIERS.findIndex((T) => T.name === new URLSearchParams(location.search).get("quality"));
  let tier = pinned >= 0 ? pinned : small ? 0 : 1, resStep = 0;
  const pixelRatio = () => Math.min(window.devicePixelRatio || 1, TIERS[tier].dpr) * (tier === 0 ? RES_STEPS[resStep] : 1);
  renderer.setPixelRatio(pixelRatio());
  // AgX: a film-like curve, so lamp highlights roll off softly and warm light stays natural
  renderer.toneMapping = THREE.AgXToneMapping;
  renderer.toneMappingExposure = 1.0;
  renderer.setClearColor("#060607");
  // checking every shader for errors makes the browser wait for each compile; only in development
  renderer.debug.checkShaderErrors = import.meta.env.DEV;
  renderer.shadowMap.enabled = !small;
  renderer.shadowMap.type = weak || small ? THREE.PCFShadowMap : THREE.PCFSoftShadowMap;
  RectAreaLightUniformsLib.init();

  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2("#1d1916", 0.012);
  const camera = new THREE.PerspectiveCamera(50, 1, 0.05, 60);
  camera.position.set(...STOPS[0].pos);
  camera.lookAt(...STOPS[0].look);

  const state = { progress: 0, pointer: { x: 0, y: 0 }, pointerWorld: null, active: true };
  const stations = {};
  // dev tools, and ?bench in production for measuring (see README, Benchmarks)
  const exposed = import.meta.env.DEV || new URLSearchParams(location.search).has("bench");
  if (exposed) window.__studio = { renderer, scene, camera };
  let room = null, ready = false;

  // ---------- Post ----------
  // Multisampled target: smooth edges without a separate anti-aliasing pass
  const samplesFor = (T) => (small ? 0 : T.msaa); // phones: no MSAA at all
  const target = new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType, samples: samplesFor(TIERS[tier]) });
  const composer = new EffectComposer(renderer, target);
  composer.addPass(new RenderPass(scene, camera));
  const gtao = small ? null : new GTAOPass(scene, camera, 512, 512);
  if (gtao) { gtao.blendIntensity = 0.9; gtao.updateGtaoMaterial({ radius: 0.45, distanceExponent: 1.5, thickness: 1.2, scale: 1 }); gtao.enabled = TIERS[tier].ao; composer.addPass(gtao); }
  const bloom = new UnrealBloomPass(new THREE.Vector2(256, 256), small ? 0.16 : TIERS[tier].bloom, 0.5, 0.92);
  composer.addPass(bloom);
  const outline = small ? null : new OutlinePass(new THREE.Vector2(512, 512), scene, camera);
  if (outline) {
    outline.visibleEdgeColor.set("#ff3d1f"); outline.hiddenEdgeColor.set("#3a0c05");
    outline.edgeStrength = 3.5; outline.edgeThickness = 1.2; outline.edgeGlow = 0.5; outline.pulsePeriod = 2.4;
    outline.enabled = false; // only runs while something is hovered
    composer.addPass(outline);
  }
  const output = new OutputPass(); composer.addPass(output);
  const finish = addFinish(output);
  const dither = new ShaderPass(DitherShader); dither.enabled = false; composer.addPass(dither);

  function resize() {
    const w = window.innerWidth, h = window.innerHeight;
    renderer.setSize(w, h, false);
    composer.setSize(w, h);
    bloom.resolution.set(w / 2, h / 2);
    if (gtao) { const pr = renderer.getPixelRatio(); gtao.setSize(Math.round(w * pr * 0.5), Math.round(h * pr * 0.5)); } // AO at half resolution: soft anyway, a quarter of the cost
    if (outline) outline.resolution.set(w, h);
    const pr = renderer.getPixelRatio();
    dither.uniforms.resolution.value.set(w * pr, h * pr);
    dither.uniforms.pixel.value = Math.max(2, Math.round(2.5 * pr));
    camera.aspect = w / h;
    camera.fov = camera.aspect < 0.8 ? 68 : 50;
    for (const id in stations) stations[id].layout && stations[id].layout(camera.aspect < 0.8);
    camera.updateProjectionMatrix();
  }
  resize();
  window.addEventListener("resize", resize);

  let machine = false;
  function applyTier(next) {
    tier = next;
    if (tier > 0) resStep = 0;
    const T = TIERS[tier];
    renderer.setPixelRatio(pixelRatio());
    if (target.samples !== samplesFor(T)) { target.samples = samplesFor(T); target.dispose(); }
    if (gtao) gtao.enabled = T.ao && !machine && !bakedLighting;
    bloom.strength = machine ? 0.2 : T.bloom;
    if (liveShadowLight) liveShadowLight.shadow.autoUpdate = T.liveShadow;
    resize();
    if (import.meta.env.DEV) console.info(`[scyne] quality: ${T.name}${tier === 0 && resStep ? ` at ${RES_STEPS[resStep] * 100}% resolution` : ""}`);
  }
  let liveShadowLight = null, bakedLighting = false;

  // ---------- Load everything, then build ----------
  // Building is split into short steps that each give the browser a turn, so the page stays
  // responsive (scrolling, taps) while the studio assembles itself in the background.
  const nextTask = () => new Promise((r) => setTimeout(r, 0));
  const T0 = performance.now(), mark = (label) => import.meta.env.DEV && console.info(`[scyne] ${label} ${Math.round(performance.now() - T0)} ms (at ${Math.round(performance.now())})`);
  // the baked reflections and the baked lighting download alongside the models
  const envLoad = loadRoomEnv(renderer);
  const wantBake = !new URLSearchParams(location.search).has("nobake");
  const bakeLoad = wantBake ? loadBake(renderer).catch((e) => { console.warn("[scyne] lighting bake failed to load", e); return null; }) : Promise.resolve(null);
  // with the bake, the room's normal maps are not needed (see loadAssets)
  loadAssets(renderer, onProgress, { normals: !wantBake }).then(async (A) => {
    mark("assets loaded"); performance.mark("scyne:assets");
    const pmrem = new THREE.PMREMGenerator(renderer);
    // Light everything with the room's baked reflections. Without the file, a neutral studio light
    // stands in until the room photographs itself further down (slow: only a fallback).
    const baked = await envLoad;
    let neutral = null;
    // the panorama itself also stays, as the reflection the studio material samples
    if (baked) { scene.environment = pmrem.fromEquirectangular(baked.texture).texture; scene.environmentIntensity = ROOM_ENV; }
    else { neutral = pmrem.fromScene(new RoomEnvironment(), 0.04); scene.environment = neutral.texture; scene.environmentIntensity = 0.6; }

    let t1 = performance.now(); const step = (l) => { if (import.meta.env.DEV) console.info(`[scyne]   ${l}: ${Math.round(performance.now() - t1)} ms`); t1 = performance.now(); };
    step("env");
    room = buildRoom(scene, A, { shadows: !small }); step("room"); await nextTask();
    t1 = performance.now(); const team = buildFurnish(scene, A); step("furnish"); await nextTask();
    for (const [id, build] of [["websites", buildWeb], ["automation", buildAutomation], ["assistants", buildAssistant], ["ads", buildAds], ["contact", buildDoor]]) {
      t1 = performance.now(); stations[id] = build(A); scene.add(stations[id].group); step(id); await nextTask();
    }
    resize(); // lets stations lay themselves out for this screen shape

    // Bake everything that never moves into a few big meshes (far fewer draw calls)
    let before = 0; scene.traverse((o) => { if (o.isMesh) before++; });
    for (const grp of [room.group, team, ...Object.values(stations).map((s) => s.group)]) { t1 = performance.now(); mergeStatic(grp); step("merge"); await nextTask(); }
    let after = 0; scene.traverse((o) => { if (o.isMesh) after++; });
    if (import.meta.env.DEV) console.info(`[scyne] meshes ${before} → ${after}`);

    // Hover/click test against one invisible box per station instead of every triangle
    for (const id in stations) {
      const st = stations[id];
      st.group.traverse((o) => { o.userData.station = id; });
      st.proxy = pickProxy(st.group);
      st.proxy.userData.station = id;
      st.center = st.proxy.position.clone();
      st.skip = 0; st.idx = Object.keys(stations).indexOf(id);
      scene.add(st.proxy);
    }
    proxies = Object.values(stations).map((s) => s.proxy);

    // Shadows: render once, except a light flagged liveShadow (none at the moment)
    scene.traverse((o) => {
      if (!o.isLight || !o.castShadow) return;
      if (small) { o.castShadow = false; return; }
      if (o.userData.liveShadow) {
        liveShadowLight = o; o.shadow.autoUpdate = TIERS[tier].liveShadow;
        // a live shadow map only redraws the automation station, not the whole room
        o.shadow.camera.layers.set(2);
        stations.automation.group.traverse((m) => { if (m.isMesh) m.layers.enable(2); });
      }
      else o.shadow.autoUpdate = false;
      o.shadow.needsUpdate = true;
    });

    // Baked lighting (see bake.js): static surfaces take their light from lightmaps, so the live
    // lights and shadow maps that did that job go. A light flagged userData.live stays for the
    // few moving parts (the man, the chair, the phone).
    const bake = await bakeLoad;
    t1 = performance.now();
    if (bake && baked && applyBake(scene, bake, { texture: baked.texture, intensity: ROOM_ENV, maxLod: Math.log2(baked.width) })) {
      bakedLighting = true;
      scene.traverse((o) => { if (o.isLight && !o.userData.live) o.visible = false; if (o.isLight) o.castShadow = false; });
      renderer.shadowMap.enabled = false;
      if (gtao) gtao.enabled = false; // ambient occlusion is in the bake
      step("lighting bake applied");
    } else if (wantBake) A.loadNormals(); // live lighting after all: it wants the normal detail
    if (bake) { bake.geometries.clear(); if (!bakedLighting) bake.lightmaps.forEach((t) => t.dispose()); }

    freezeStatic(scene);
    // Draw each live screen once and upload every texture now, a few at a time, so the first frame
    // does not have to do it all in one go.
    t1 = performance.now();
    for (const id in stations) { stations[id].update(0.01); await nextTask(); }
    room.update(0.01);
    const textures = new Set();
    scene.traverse((o) => { if (o.isMesh) for (const m of [].concat(o.material)) for (const k in m) if (m[k] && m[k].isTexture) textures.add(m[k]); });
    let up = 0;
    for (const tex of textures) { renderer.initTexture(tex); if (++up % 6 === 0) await nextTask(); }
    step(`screens + ${textures.size} textures`);
    // Compile every shader up front, in parallel where the browser supports it. They have to be the
    // variants the frames really use: drawn into the post-processing target (linear, no tone
    // mapping), not straight to the screen, or the first frame recompiles them all and stalls.
    renderer.setRenderTarget(composer.readBuffer);
    t1 = performance.now(); await renderer.compileAsync(scene, camera); step("compile");
    renderer.setRenderTarget(null);
    if (!baked) {
      // fallback: the room photographs its own reflections now (see envmap.js)
      for (const id in stations) stations[id].update && stations[id].update(1.5);
      room.update(1.5);
      t1 = performance.now(); const rt = captureCube(renderer, scene, CAPTURE_AT); step("cube capture");
      scene.environment = pmrem.fromCubemap(rt.texture).texture; scene.environmentIntensity = ROOM_ENV;
      rt.dispose(); neutral.dispose();
    }
    pmrem.dispose();
    ready = true; mark("ready"); performance.mark("scyne:ready");
  }).catch((err) => {
    console.error("[scyne] studio failed to load", err);
    onReady && onReady(false);
  });

  // ---------- Camera tour ----------
  const curve = (pick) => new THREE.CatmullRomCurve3(STOPS.map((s) => new THREE.Vector3(...pick(s))), false, "centripetal");
  const posCurve = curve((s) => s.pos), lookCurve = curve((s) => s.look);
  const mPosCurve = curve((s) => s.mpos || s.pos), mLookCurve = curve((s) => s.mlook || s.look);
  const camPos = new THREE.Vector3(...STOPS[0].pos), camLook = new THREE.Vector3(...STOPS[0].look);
  const wantPos = new THREE.Vector3(), wantLook = new THREE.Vector3();
  const FWD = new THREE.Vector3(), RIGHT = new THREE.Vector3(), UP = new THREE.Vector3(0, 1, 0);

  function tourAt(p, t) {
    const f = Math.min(STOPS.length - 1 - 1e-6, Math.max(0, p) * (STOPS.length - 1));
    const i = Math.floor(f), k = plateau(f - i);
    const u = (i + k) / (STOPS.length - 1);
    const portrait = camera.aspect < 0.8;
    (portrait ? mPosCurve : posCurve).getPoint(u, wantPos);
    (portrait ? mLookCurve : lookCurve).getPoint(u, wantLook);
    wantPos.y += Math.sin(k * Math.PI) * 0.35;
    const s0 = STOPS[i], s1 = STOPS[Math.min(i + 1, STOPS.length - 1)];
    const shift = s0.shift * (1 - k) + s1.shift * k;
    if (camera.aspect >= 1) {
      FWD.subVectors(wantLook, wantPos).normalize();
      RIGHT.crossVectors(FWD, UP).normalize().multiplyScalar(-shift);
      wantPos.add(RIGHT); wantLook.add(RIGHT);
    } else {
      wantLook.y -= 0.35 * Math.min(1, shift * 3);
    }
    if (!reduce && !still) { // a hint of handheld camera
      wantPos.x += Math.sin(t * 0.45) * 0.008;
      wantPos.y += Math.sin(t * 0.6 + 1.3) * 0.005;
      wantLook.x += Math.sin(t * 0.35 + 2.1) * 0.01;
    }
  }

  // ---------- Pointer, hover, click ----------
  const ndc = new THREE.Vector2(), ray = new THREE.Raycaster(), floorPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -1.0);
  const pw = new THREE.Vector3();
  let hovered = null, pointerIn = false, pointerDirty = false, proxies = [];
  window.addEventListener("pointermove", (e) => {
    state.pointer.x = (e.clientX / window.innerWidth) * 2 - 1;
    state.pointer.y = -(e.clientY / window.innerHeight) * 2 + 1;
    ndc.set(state.pointer.x, state.pointer.y);
    pointerIn = e.pointerType === "mouse";
    pointerDirty = true;
  }, { passive: true });
  canvas.addEventListener("click", () => { if (hovered) onSelect && onSelect(hovered); });

  function setHover(id) {
    if (id === hovered) return;
    hovered = id;
    if (outline) { outline.selectedObjects = id ? [stations[id].group] : []; outline.enabled = !!id; }
    onHover && onHover(id);
  }
  let pickTick = 0;
  function pick() {
    // only when the pointer moved, or every 12 frames while the camera glides
    if (!pointerDirty && (pickTick = (pickTick + 1) % 12) !== 0) return;
    pointerDirty = false;
    ray.setFromCamera(ndc, camera);
    if (ray.ray.intersectPlane(floorPlane, pw)) state.pointerWorld = pw;
    if (!pointerIn || !state.active) return setHover(null);
    const hit = ray.intersectObjects(proxies, false)[0];
    setHover(hit && hit.distance < 14 ? hit.object.userData.station : null);
  }

  // ---------- Machine view ----------
  let edgesBuilt = false;
  const edgeMat = new THREE.LineBasicMaterial({ color: new THREE.Color("#ffffff").multiplyScalar(1.6), transparent: true, opacity: 0.85, toneMapped: false });
  function buildEdges() {
    const targets = [];
    scene.traverse((o) => {
      if (!o.isMesh || !o.geometry) return;
      const m = o.material;
      if (m && (m.userData?.glow || m.userData?.screen || m.blending === THREE.AdditiveBlending)) return;
      if (o.userData.proxy) return;
      const tris = o.geometry.index ? o.geometry.index.count / 3 : o.geometry.attributes.position.count / 3;
      if (tris > 60000) return;
      targets.push(o);
    });
    targets.forEach((o) => {
      const lines = new THREE.LineSegments(new THREE.EdgesGeometry(o.geometry, 30), edgeMat);
      lines.visible = false; lines.userData.edge = true; lines.raycast = () => {};
      o.add(lines);
    });
    edgesBuilt = true;
  }
  function setMachine(on) {
    if (!ready) return;
    machine = on;
    if (on && !edgesBuilt) buildEdges();
    scene.traverse((o) => { if (o.userData.edge) o.visible = on; });
    dither.enabled = on;
    finish.uniforms.grainAmount.value = on ? 0 : 0.006;
    finish.uniforms.finish.value = on ? 0 : 1;
    if (gtao) gtao.enabled = !on && TIERS[tier].ao && !bakedLighting;
    bloom.strength = on ? 0.2 : TIERS[tier].bloom;
  }

  // ---------- Adaptive quality ----------
  // Average frame time decides: slow for ~1.5 s → step down; very fast for ~5 s → step up (once).
  let ema = 16, slowFor = 0, fastFor = 0, warm = 0, raised = false;
  function adapt(dtMs) {
    warm += dtMs;
    if (warm < 2500 || still || pinned >= 0) return; // ignore start-up hitches
    ema += (Math.min(dtMs, 100) - ema) * 0.06;
    const canDrop = tier > 0 || resStep < RES_STEPS.length - 1;
    if (ema > 24 && canDrop) {
      slowFor += dtMs;
      if (slowFor > 1500) { if (tier > 0) applyTier(tier - 1); else { resStep++; applyTier(0); } slowFor = 0; fastFor = 0; ema = 16; warm = 1500; }
    } else slowFor = 0;
    if (!raised && ema < 10 && tier < TIERS.length - 1 && !small) { fastFor += dtMs; if (fastFor > 5000) { raised = true; applyTier(tier + 1); fastFor = 0; warm = 1500; } }
    else fastFor = 0;
  }

  // ---------- Frame (driven by the shared GSAP ticker, in step with smooth scrolling) ----------
  let firstFrame = false, frameNo = 0;
  const frustum = new THREE.Frustum(), projView = new THREE.Matrix4();
  let carried = 0;
  function tick(t, dt) {
    if (!ready) return;
    if (!state.active && firstFrame) return;
    frameNo++;
    // A device that still struggles on the lightest tier draws every other frame: an even 30 fps
    // reads smoother than an uneven 40, and it halves the work.
    if (tier === 0 && ema > 22 && firstFrame && (frameNo & 1)) { carried += dt; return; }
    const raw = dt;
    dt = Math.min(dt + carried, 0.05); carried = 0;

    tourAt(state.progress, t);
    const px = reduce ? 0 : state.pointer.x, py = reduce ? 0 : state.pointer.y;
    wantLook.x += px * 0.18; wantLook.y += py * 0.1;
    const follow = reduce || still ? 1 : 1 - Math.pow(0.0004, dt);
    camPos.lerp(wantPos, follow); camLook.lerp(wantLook, follow);
    camera.position.copy(camPos); camera.lookAt(camLook);

    pick();
    room.update(t, dt, state);
    // stations in view animate every frame; ones out of view only every 30th frame (their
    // screens keep roughly current for when they come into view), and screens share an upload budget
    Screen.beginFrame(TIERS[tier].uploads);
    camera.updateMatrixWorld();
    frustum.setFromProjectionMatrix(projView.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse));
    for (const id in stations) {
      const st = stations[id];
      st.skip += dt;
      const inView = frustum.intersectsObject(st.proxy) && camera.position.distanceTo(st.center) < 11;
      if (inView || (frameNo + st.idx * 6) % 30 === 0) { st.update(t, st.skip, state); st.skip = 0; }
    }
    finish.uniforms.grainTime.value = t;
    const tr = !firstFrame && performance.now();
    composer.render();
    if (tr) { mark(`first frame took ${Math.round(performance.now() - tr)} ms,`); performance.mark("scyne:first-frame"); }
    adapt(raw * 1000);
    if (!firstFrame) { firstFrame = true; onReady && onReady(true); }
  }

  if (exposed) Object.assign(window.__studio, {
    tick, state, composer, stops: STOPS, applyTier,
    // write the studio out for the Blender lightmap bake (dev only; see tools/bake/README.md)
    async exportBake() {
      if (!import.meta.env.DEV) return null;
      const { exportBake } = await import("./bake-export.js");
      return exportBake(scene);
    },
    // re-bake /env/room.webp after changing the room: returns raw RGBE bytes (see README)
    async bakeEnv() {
      const pm = new THREE.PMREMGenerator(renderer), keep = scene.environment, keepI = scene.environmentIntensity;
      const neutral = pm.fromScene(new RoomEnvironment(), 0.04);
      scene.environment = neutral.texture; scene.environmentIntensity = 0.6;
      for (const id in stations) stations[id].update && stations[id].update(1.5);
      const rt = captureCube(renderer, scene, CAPTURE_AT);
      const raw = await bakeRoomEnv(renderer, rt.texture);
      rt.dispose(); neutral.dispose(); pm.dispose();
      scene.environment = keep; scene.environmentIntensity = keepI;
      return raw;
    },
  });
  const tmp = new THREE.Vector3();
  return {
    state,
    tick,
    setProgress(p) { state.progress = p; },
    setActive(on) { state.active = on; },
    /* stop for good and give the graphics memory back */
    dispose() { ready = false; renderer.dispose(); renderer.forceContextLoss(); },
    setWire: setMachine,
    project(id) {
      const st = stations[id];
      if (!st) return { x: -999, y: -999, visible: false, dist: 99 };
      tmp.copy(st.anchor); st.group.localToWorld(tmp);
      const dist = tmp.distanceTo(camera.position);
      tmp.project(camera);
      return { x: (tmp.x * 0.5 + 0.5) * window.innerWidth, y: (-tmp.y * 0.5 + 0.5) * window.innerHeight, visible: tmp.z < 1 && Math.abs(tmp.x) < 1.05 && Math.abs(tmp.y) < 1.05, dist };
    },
  };
}
