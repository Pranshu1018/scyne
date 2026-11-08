/* The projects corridor: a bending wireframe tunnel you walk down by scrolling, the projects
   hung flat on its walls and ceiling, each one tinting the grid around it with its colour.
   Clicking a project peels it off the wall to face you.

   Two layers share one camera: WebGL draws the tunnel's lines (three.js), and the projects
   are the page's own HTML mockups placed in 3D (CSS3DRenderer), so they stay crisp and
   clickable. Loaded on demand, only on wide screens with motion allowed (see sections.js). */

import * as THREE from "three";
import { CSS3DRenderer, CSS3DObject } from "three/examples/jsm/renderers/CSS3DRenderer.js";

const W = 6, H = 4;         // tunnel cross-section (world units)
const SAMPLES = 220;        // points along the path
const RING_EVERY = 3;       // a cross-ring every n samples
const PANEL_W = 3.7;        // project width on the wall
const PX = 640;             // the mockup's width in CSS pixels

export function createCorridor({ host, cards, onHover, onOpen }) {
  const n = cards.length;
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: "high-performance" });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
  renderer.setClearColor("#050506");
  renderer.domElement.className = "corridor__gl";
  const css = new CSS3DRenderer();
  css.domElement.className = "corridor__css";
  host.append(renderer.domElement, css.domElement);

  const scene = new THREE.Scene(), cssScene = new THREE.Scene();
  scene.fog = new THREE.Fog("#050506", 7, 42);
  const camera = new THREE.PerspectiveCamera(68, 1, 0.05, 120);

  // ---------- the path: a gentle S-bend that rises and dips a little ----------
  const L = 14 * (n + 1);
  const bends = [0, 0, 2.6, -2.2, 1.8, -2.6, 1.4, 0];
  const pts = bends.map((x, i) => new THREE.Vector3(x, Math.sin(i * 1.3) * 0.35, -(i / (bends.length - 1)) * L));
  const curve = new THREE.CatmullRomCurve3(pts, false, "centripetal");
  // a frame at each sample that never twists: right = forward × world up
  const frames = [];
  for (let k = 0; k <= SAMPLES; k++) {
    const u = k / SAMPLES, p = curve.getPointAt(u), t = curve.getTangentAt(u).normalize();
    const r = new THREE.Vector3().crossVectors(t, new THREE.Vector3(0, 1, 0)).normalize();
    const up = new THREE.Vector3().crossVectors(r, t).normalize();
    frames.push({ u, p, t, r, up });
  }
  const frameAt = (u) => {
    const p = curve.getPointAt(u), t = curve.getTangentAt(u).normalize();
    const r = new THREE.Vector3().crossVectors(t, new THREE.Vector3(0, 1, 0)).normalize();
    return { p, t, r, up: new THREE.Vector3().crossVectors(r, t).normalize() };
  };

  // ---------- where each project hangs ----------
  const colors = cards.map((c) => new THREE.Color(getComputedStyle(c).getPropertyValue("--c").trim() || "#ff3d1f"));
  const spots = cards.map((_, i) => ({ u: 0.09 + i * (0.8 / Math.max(1, n - 1)), wall: ["left", "right", "ceiling"][i % 3 === 2 ? 2 : i % 2] }));

  // ---------- the tunnel's lines, tinted by the projects near them ----------
  // cross-section outline points (local x along right, y along up), walls subdivided into cells
  const across = [];
  const cols = 8, rows = 5;
  for (let i = 0; i <= cols; i++) across.push([-W / 2 + (W * i) / cols, -H / 2]);         // floor
  for (let j = 1; j <= rows; j++) across.push([W / 2, -H / 2 + (H * j) / rows]);          // right wall
  for (let i = cols - 1; i >= 0; i--) across.push([-W / 2 + (W * i) / cols, H / 2]);     // ceiling
  for (let j = rows - 1; j >= 1; j--) across.push([-W / 2, -H / 2 + (H * j) / rows]);     // left wall
  const world = (f, [x, y]) => f.p.clone().addScaledVector(f.r, x).addScaledVector(f.up, y);
  const panelPos = spots.map((s) => wallPoint(frameAt(s.u), s.wall));
  const pos = [], col = [];
  const tint = (v) => {
    const c = new THREE.Color(0.55, 0.55, 0.58);
    panelPos.forEach((pp, i) => {
      const d = v.distanceTo(pp);
      const k = Math.exp(-(d * d) / 18) * 1.6;
      c.lerp(colors[i], Math.min(1, k * 0.85));
      if (k > 0.05) c.multiplyScalar(1 + k * 0.6);
    });
    return c;
  };
  const push = (a, b) => {
    pos.push(a.x, a.y, a.z, b.x, b.y, b.z);
    const ca = tint(a), cb = tint(b);
    col.push(ca.r, ca.g, ca.b, cb.r, cb.g, cb.b);
  };
  for (let k = 0; k < SAMPLES; k++) {
    const f0 = frames[k], f1 = frames[k + 1];
    for (const pt of across) push(world(f0, pt), world(f1, pt)); // lines along the tunnel
    if (k % RING_EVERY === 0) {
      for (let j = 0; j < across.length; j++) push(world(f0, across[j]), world(f0, across[(j + 1) % across.length])); // a ring
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute("color", new THREE.Float32BufferAttribute(col, 3));
  const lines = new THREE.LineSegments(geo, new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.75, fog: true }));
  scene.add(lines);
  // a soft glow behind each project, lighting the dark around it
  const glowTex = (() => {
    const c = document.createElement("canvas"); c.width = c.height = 128;
    const g = c.getContext("2d"), gr = g.createRadialGradient(64, 64, 0, 64, 64, 64);
    gr.addColorStop(0, "rgba(255,255,255,1)"); gr.addColorStop(0.35, "rgba(255,255,255,.35)"); gr.addColorStop(1, "rgba(255,255,255,0)");
    g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
    return new THREE.CanvasTexture(c);
  })();
  panelPos.forEach((pp, i) => {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: colors[i], transparent: true, opacity: 0.55, blending: THREE.AdditiveBlending, depthWrite: false, fog: true }));
    s.position.copy(pp); s.scale.setScalar(7.5); scene.add(s);
  });

  function wallPoint(f, wall) {
    if (wall === "left") return world(f, [-W / 2 + 0.02, 0.15]);
    if (wall === "right") return world(f, [W / 2 - 0.02, 0.15]);
    return world(f, [0, H / 2 - 0.02]);
  }

  // ---------- the projects, hung on the walls ----------
  const panels = cards.map((card, i) => {
    const art = card.querySelector(".case__art").cloneNode(true);
    const el = document.createElement("div");
    el.className = "cpanel";
    el.style.setProperty("--c", getComputedStyle(card).getPropertyValue("--c"));
    el.style.width = `${PX}px`;
    el.append(art);
    const obj = new CSS3DObject(el);
    const f = frameAt(spots[i].u), wall = spots[i].wall;
    // the panel's x runs along its width, y up its height, z out of its face (into the tunnel)
    let x, y, z;
    if (wall === "left") { z = f.r.clone(); y = f.up.clone(); x = f.t.clone(); }
    else if (wall === "right") { z = f.r.clone().negate(); y = f.up.clone(); x = f.t.clone().negate(); }
    // ceiling: further along the tunnel shows lower on screen, so the art's top faces back towards you
    else { z = f.up.clone().negate(); y = f.t.clone().negate(); x = f.r.clone(); }
    const m = new THREE.Matrix4().makeBasis(x, y, z);
    obj.quaternion.setFromRotationMatrix(m);
    obj.position.copy(panelPos[i]);
    obj.scale.setScalar(PANEL_W / PX);
    cssScene.add(obj);
    const home = { p: obj.position.clone(), q: obj.quaternion.clone(), s: obj.scale.x };
    el.addEventListener("pointerenter", () => onHover(i, true));
    el.addEventListener("pointerleave", () => onHover(i, false));
    el.addEventListener("click", () => onOpen(i));
    return { obj, el, home, u: spots[i].u };
  });

  // ---------- camera along the path ----------
  const U0 = 0.0, U1 = panels[n - 1].u - 0.075, AHEAD = 0.075; // end with the last project just ahead
  const camU = (p) => U0 + p * (U1 - U0);
  const pointer = { x: 0, y: 0 };
  host.addEventListener("pointermove", (e) => {
    const r = host.getBoundingClientRect();
    pointer.x = ((e.clientX - r.left) / r.width) * 2 - 1;
    pointer.y = ((e.clientY - r.top) / r.height) * 2 - 1;
  });

  function resize() {
    const w = host.clientWidth, h = host.clientHeight;
    renderer.setSize(w, h, false); css.setSize(w, h);
    camera.aspect = w / h; camera.updateProjectionMatrix();
  }
  resize();
  addEventListener("resize", resize);

  // peeling a project off the wall: a 0..1 tween between its home and a place facing the camera
  let open = -1, peel = 0, peelTo = 0;
  const look = new THREE.Vector3(), tmpQ = new THREE.Quaternion(), tmpM = new THREE.Matrix4();
  const camQ = new THREE.Quaternion();

  function render(progress, dt) {
    const u = camU(progress);
    const f = frameAt(Math.min(0.999, u));
    camera.position.copy(f.p).addScaledVector(f.up, -0.2 + pointer.y * -0.08).addScaledVector(f.r, pointer.x * 0.12);
    look.copy(curve.getPointAt(Math.min(1, u + 0.04))).addScaledVector(f.up, -0.25).addScaledVector(f.r, pointer.x * 0.35);
    if (open < 0) camera.lookAt(look);
    camera.updateMatrixWorld();
    camQ.copy(camera.quaternion);

    peel += (peelTo - peel) * Math.min(1, dt * 7);
    panels.forEach((pn, i) => {
      if (i !== open && !(i === lastOpen && peel > 0.001)) {
        pn.obj.position.copy(pn.home.p); pn.obj.quaternion.copy(pn.home.q); pn.obj.scale.setScalar(pn.home.s);
        return;
      }
      // in front of the camera, on the left of the view, facing it
      const target = camera.position.clone()
        .add(new THREE.Vector3(-1.05, 0.05, -3.1).applyQuaternion(camQ));
      tmpM.lookAt(camera.position, target, new THREE.Vector3(0, 1, 0).applyQuaternion(camQ));
      tmpQ.setFromRotationMatrix(tmpM);
      const k = easeInOut(peel);
      pn.obj.position.lerpVectors(pn.home.p, target, k);
      pn.obj.quaternion.slerpQuaternions(pn.home.q, tmpQ, k);
      pn.obj.scale.setScalar(pn.home.s * (1 + 0.05 * k) * (1 - 0.32 * k));
    });

    renderer.render(scene, camera);
    css.render(cssScene, camera);
    // the project beside you is the current one
    const here = u + AHEAD;
    let best = 0;
    panels.forEach((pn, i) => { if (Math.abs(pn.u - here) < Math.abs(panels[best].u - here)) best = i; });
    return best;
  }
  let lastOpen = -1;
  const easeInOut = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);

  return {
    render,
    /* the scroll progress (0..1) that brings project i beside you */
    progressFor(i) { return Math.max(0, Math.min(1, (panels[i].u - AHEAD - U0) / (U1 - U0))); },
    open(i) { open = lastOpen = i; peelTo = 1; panels.forEach((p, j) => p.el.classList.toggle("is-open", j === i)); },
    close() { open = -1; peelTo = 0; panels.forEach((p) => p.el.classList.remove("is-open")); },
    dispose() {
      removeEventListener("resize", resize);
      renderer.dispose(); geo.dispose(); glowTex.dispose();
      renderer.domElement.remove(); css.domElement.remove();
    },
  };
}
