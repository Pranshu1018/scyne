/* Real-world objects shared by the stations, modelled to true size: a space-grey laptop
   (unibody, real keys, glass display with a live screen), a phone, a glazed mug and a
   leather notebook with a pen. */

import * as THREE from "three";
import { box, Screen, FONT } from "./kit.js";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";

// space grey aluminium, bead-blasted: half metal so it reads as grey, not as a black mirror
const anodised = new THREE.MeshPhysicalMaterial({ color: "#73767c", roughness: 0.42, metalness: 0.55, clearcoat: 0.1, clearcoatRoughness: 0.4 });
const glass = new THREE.MeshPhysicalMaterial({ color: "#040405", roughness: 0.04, metalness: 0, clearcoat: 1, clearcoatRoughness: 0.02 });

export function plate(w, d, t, r, mat) {
  const s = new THREE.Shape();
  s.moveTo(-w / 2 + r, -d / 2); s.lineTo(w / 2 - r, -d / 2); s.absarc(w / 2 - r, -d / 2 + r, r, -Math.PI / 2, 0);
  s.lineTo(w / 2, d / 2 - r); s.absarc(w / 2 - r, d / 2 - r, r, 0, Math.PI / 2);
  s.lineTo(-w / 2 + r, d / 2); s.absarc(-w / 2 + r, d / 2 - r, r, Math.PI / 2, Math.PI);
  s.lineTo(-w / 2, -d / 2 + r); s.absarc(-w / 2 + r, -d / 2 + r, r, Math.PI, Math.PI * 1.5);
  const b = Math.min(0.0016, t / 3);
  const g = new THREE.ExtrudeGeometry(s, { depth: t - b * 2, bevelEnabled: true, bevelThickness: b, bevelSize: b, bevelSegments: 3, curveSegments: 10 });
  g.rotateX(-Math.PI / 2); g.translate(0, b, 0); // lies flat, shape y → -z, bottom at y = 0
  const m = new THREE.Mesh(g, mat); m.castShadow = true; m.receiveShadow = true;
  return m;
}

/* ---------- Keyboard ----------
   A full laptop layout in key units (1 u = 18.6 mm pitch): function row, numbers, three letter
   rows, and the bottom row with the arrow cluster; every row spans 14.5 u. Each keycap is a
   rounded, slightly bevelled block, and all of them are one mesh (one draw call) mapped from
   above onto a drawn keyboard, so the legends are printed on the caps. The legends glow a
   little, as a backlit keyboard does in a dim room. Built once, shared by every laptop. */
const U = 0.0186, GAP = 0.0027, KB_W = 14.5 * U;
const ROWS = [
  { h: 0.62, keys: [["esc", 1.5], ...["F1", "F2", "F3", "F4", "F5", "F6", "F7", "F8", "F9", "F10", "F11", "F12"].map((k) => [k, 1]), ["", 1]] },
  { h: 1, keys: [..."`1234567890-=".split("").map((k) => [k, 1]), ["delete", 1.5]] },
  { h: 1, keys: [["tab", 1.5], ..."QWERTYUIOP[]\\".split("").map((k) => [k, 1])] },
  { h: 1, keys: [["caps lock", 1.8], ..."ASDFGHJKL;'".split("").map((k) => [k, 1]), ["return", 1.7]] },
  { h: 1, keys: [["shift", 2.3], ..."ZXCVBNM,./".split("").map((k) => [k, 1]), ["shift", 2.2]] },
  { h: 1, keys: [["fn", 1], ["control", 1], ["option", 1], ["⌘", 1.25], ["", 5], ["⌘", 1.25], ["option", 1], ["◀", 1], ["▲▼", 1], ["▶", 1]] },
];
const KB_D = ROWS.reduce((d, r) => d + r.h * U, 0);
const SHIFTED = { "`": "~", 1: "!", 2: "@", 3: "#", 4: "$", 5: "%", 6: "^", 7: "&", 8: "*", 9: "(", 0: ")", "-": "_", "=": "+", "[": "{", "]": "}", "\\": "|", ";": ":", "'": "\"", ",": "<", ".": ">", "/": "?" };
const ARROWS = "◀▶▲▼";

/* every key as { label, x, z, w, d }, in metres from the keyboard's back-left corner. The up and
   down arrows share one slot, half height each; left and right are half height, at the bottom. */
function keyRects() {
  const out = [];
  let z = 0;
  for (const row of ROWS) {
    let x = 0;
    for (const [label, w] of row.keys) {
      const kw = w * U - GAP, kd = row.h * U - GAP, half = kd / 2 - GAP / 4;
      const at = (l, dz, d) => out.push({ label: l, x: x + GAP / 2, z: z + GAP / 2 + dz, w: kw, d });
      if (label === "▲▼") { at("▲", 0, half); at("▼", kd - half, half); }
      else if (label === "◀" || label === "▶") at(label, kd - half, half);
      else at(label, 0, kd);
      x += w * U;
    }
    z += row.h * U;
  }
  return out;
}

/* the printed face of the keyboard: caps, legends, the dark well between them */
function keyboardTexture(keys) {
  const PX = 2048 / KB_W; // pixels per metre
  const cv = document.createElement("canvas");
  cv.width = 2048; cv.height = Math.ceil(KB_D * PX);
  const c = cv.getContext("2d");
  c.fillStyle = "#050506"; c.fillRect(0, 0, cv.width, cv.height);
  c.textBaseline = "middle";
  for (const k of keys) {
    const x = k.x * PX, y = k.z * PX, w = k.w * PX, h = k.d * PX;
    // the cap: near black, a touch lighter in the middle (the slight dish of its top)
    const grad = c.createRadialGradient(x + w / 2, y + h / 2, 0, x + w / 2, y + h / 2, Math.max(w, h) * 0.7);
    grad.addColorStop(0, "#1d1e21"); grad.addColorStop(1, "#141517");
    c.fillStyle = grad;
    c.beginPath(); c.roundRect(x, y, w, h, 0.0016 * PX); c.fill();
    if (!k.label) continue;
    c.fillStyle = "#c9cbcf";
    const single = [...k.label].length === 1, arrow = ARROWS.includes(k.label);
    const small = 0.0021 * PX, big = 0.0034 * PX;
    if (single && SHIFTED[k.label]) { // two symbols, stacked
      c.textAlign = "center"; c.font = `400 ${small * 1.15}px ${FONT}`;
      c.fillText(SHIFTED[k.label], x + w / 2, y + h * 0.32);
      c.fillText(k.label, x + w / 2, y + h * 0.7);
    } else if (single || arrow || /^F\d/.test(k.label)) {
      c.textAlign = "center"; c.font = `400 ${single && !arrow ? big : small}px ${FONT}`;
      c.fillText(k.label, x + w / 2, y + h / 2);
    } else { // modifiers: a small word in the corner
      const right = k.x > KB_W / 2;
      c.textAlign = right ? "right" : "left"; c.font = `400 ${small}px ${FONT}`;
      c.fillText(k.label, right ? x + w - 0.0022 * PX : x + 0.0022 * PX, y + h - 0.0034 * PX);
    }
  }
  const t = new THREE.CanvasTexture(cv);
  t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
  return t;
}

/* one keycap, w × d, standing on y = 0 with its top at y = h: rounded corners, a small bevel */
function keycap(w, d, h) {
  const r = Math.min(0.0017, w / 2 - 1e-4, d / 2 - 1e-4), b = 0.00035;
  const s = new THREE.Shape();
  s.moveTo(-w / 2 + r, -d / 2); s.lineTo(w / 2 - r, -d / 2); s.absarc(w / 2 - r, -d / 2 + r, r, -Math.PI / 2, 0);
  s.lineTo(w / 2, d / 2 - r); s.absarc(w / 2 - r, d / 2 - r, r, 0, Math.PI / 2);
  s.lineTo(-w / 2 + r, d / 2); s.absarc(-w / 2 + r, d / 2 - r, r, Math.PI / 2, Math.PI);
  s.lineTo(-w / 2, -d / 2 + r); s.absarc(-w / 2 + r, -d / 2 + r, r, Math.PI, Math.PI * 1.5);
  const g = new THREE.ExtrudeGeometry(s, { depth: h - 2 * b, bevelEnabled: true, bevelThickness: b, bevelSize: b * 0.9, bevelOffset: -b * 0.9, bevelSegments: 2, curveSegments: 3 });
  g.rotateX(-Math.PI / 2); // extrusion → +y (from -b), shape y → -z
  g.translate(0, b, 0);
  return g;
}

let keyboardShared = null;
function keyboardParts() {
  if (keyboardShared) return keyboardShared;
  const keys = keyRects(), H = 0.0013; // caps stand 1.3 mm proud of the well
  const geos = keys.map((k) => keycap(k.w, k.d, H).translate(k.x + k.w / 2 - KB_W / 2, 0, k.z + k.d / 2));
  const geo = mergeGeometries(geos, false);
  geos.forEach((g) => g.dispose());
  // mapped from above: every cap shows its own patch of the drawn keyboard
  const p = geo.attributes.position, uv = new Float32Array(p.count * 2);
  for (let i = 0; i < p.count; i++) { uv[i * 2] = (p.getX(i) + KB_W / 2) / KB_W; uv[i * 2 + 1] = 1 - p.getZ(i) / KB_D; }
  geo.setAttribute("uv", new THREE.BufferAttribute(uv, 2));
  const face = keyboardTexture(keys);
  const caps = new THREE.MeshStandardMaterial({ map: face, roughness: 0.48, metalness: 0, emissive: "#fff4e6", emissiveMap: face, emissiveIntensity: 0.14 });
  const wellGeo = new THREE.PlaneGeometry(KB_W + 0.002, KB_D + 0.002);
  wellGeo.rotateX(-Math.PI / 2); wellGeo.translate(0, 0.00005, KB_D / 2);
  const well = new THREE.MeshStandardMaterial({ color: "#060607", roughness: 0.85 });
  keyboardShared = { geo, caps, wellGeo, well };
  return keyboardShared;
}

/* The keyboard, its back edge at z = 0, standing on y = 0. Lit live (small and glossy: it should
   catch the light as the camera moves), so it is kept out of the bake and the static merge. */
export function keyboard() {
  const k = keyboardParts();
  const g = new THREE.Group();
  const well = new THREE.Mesh(k.wellGeo, k.well), caps = new THREE.Mesh(k.geo, k.caps);
  well.userData.live = true; caps.userData.live = true;
  caps.receiveShadow = true;
  g.add(well, caps);
  return g;
}

/* a strip of tiny speaker holes, 9 × 99 mm: dark dots, see-through between them */
let grilleShared = null;
function speakerGrille() {
  if (grilleShared) return grilleShared;
  const cv = document.createElement("canvas"); cv.width = 64; cv.height = 704;
  const c = cv.getContext("2d");
  c.fillStyle = "#fff";
  for (let row = 0, y = 8; y < cv.height - 4; y += 9, row++) {
    for (let x = 6 + (row % 2) * 4.5; x < cv.width - 4; x += 9) { c.beginPath(); c.arc(x, y, 2.1, 0, Math.PI * 2); c.fill(); }
  }
  const t = new THREE.CanvasTexture(cv); t.anisotropy = 8;
  const mat = new THREE.MeshStandardMaterial({ color: "#0a0a0b", roughness: 0.9, alphaMap: t, alphaTest: 0.5 });
  grilleShared = { geo: new THREE.PlaneGeometry(0.009, 0.099), mat };
  return grilleShared;
}

export function laptop(draw, { fps = 8, scale = 1, light = 0, res = 0.8 } = {}) {
  const g = new THREE.Group();
  const W = 0.304, D = 0.215, T = 0.0115;
  g.add(plate(W, D, T, 0.011, anodised));
  // keyboard: sculpted keycaps with printed, softly backlit legends, in a dark well (see keyboard())
  const kb = keyboard(); kb.position.set(0, T, -0.0905); g.add(kb);
  // speaker grilles either side of the keys
  const grille = speakerGrille();
  for (const x of [-1, 1]) { const s = new THREE.Mesh(grille.geo, grille.mat); s.rotation.x = -Math.PI / 2; s.position.set(x * 0.1445, T + 0.00005, -0.039); s.userData.live = true; g.add(s); }
  const pad = new THREE.Mesh(new THREE.PlaneGeometry(0.13, 0.08), new THREE.MeshStandardMaterial({ color: "#5f6267", roughness: 0.36, metalness: 0.5 }));
  pad.rotation.x = -Math.PI / 2; pad.position.set(0, T + 0.0002, 0.058); g.add(pad);
  // lid on its hinge at the back edge; the screen faces the user (+z)
  const hinge = new THREE.Group(); hinge.position.set(0, T, -D / 2 + 0.004); hinge.rotation.x = -0.26;
  const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.0045, 0.0045, W - 0.06, 16), new THREE.MeshStandardMaterial({ color: "#2a2b2e", roughness: 0.4, metalness: 0.8 }));
  barrel.rotation.z = Math.PI / 2; barrel.position.y = -0.002; hinge.add(barrel);
  const lid = plate(W, 0.212, 0.0045, 0.011, anodised); lid.rotation.x = Math.PI / 2; lid.position.set(0, 0.106, 0); hinge.add(lid);
  const front = new THREE.Mesh(new THREE.PlaneGeometry(W - 0.004, 0.208), glass); front.position.set(0, 0.106, 0.0046); hinge.add(front);
  const screen = new Screen(1024, 640, 0.28, 0.175, draw, { fps, brightness: 0.9, res });
  screen.mesh.position.set(0, 0.111, 0.0047); hinge.add(screen.mesh);
  if (light > 0) { // an area light is costly for every pixel on screen, so it is opt-in
    const glowLight = new THREE.RectAreaLight("#dfe8ff", light, 0.28 * scale, 0.175 * scale); glowLight.position.set(0, 0.111, 0.01); glowLight.rotation.y = Math.PI; hinge.add(glowLight);
  }
  g.add(hinge);
  // points of the lid's top edge, for the lines of light
  const lidTop = new THREE.Vector3(0, T + Math.cos(0.26) * 0.21, -D / 2 + 0.004 - Math.sin(0.26) * 0.21);
  g.scale.setScalar(scale); lidTop.multiplyScalar(scale);
  return { group: g, screen, top: lidTop };
}

/* A phone lying face up: thin anodised frame, glass, a live screen (300 × 620 canvas) */
export function phone(draw, { fps = 10, brightness = 0.85 } = {}) {
  const g = new THREE.Group();
  g.add(plate(0.072, 0.15, 0.0078, 0.009, anodised));
  const front = plate(0.0715, 0.1495, 0.0006, 0.0088, glass); front.position.y = 0.0076; g.add(front);
  const screen = new Screen(300, 620, 0.066, 0.1405, draw, { fps, brightness });
  screen.mesh.rotation.x = -Math.PI / 2; screen.mesh.position.y = 0.0084; g.add(screen.mesh);
  return { group: g, screen };
}

/* A glazed stoneware mug with a handle, half full */
export function mug() {
  const g = new THREE.Group();
  const glaze = new THREE.MeshPhysicalMaterial({ color: "#ebe6de", roughness: 0.35, clearcoat: 0.8, clearcoatRoughness: 0.15 });
  const prof = [[0.0, 0.0], [0.034, 0.0], [0.037, 0.004], [0.041, 0.05], [0.043, 0.094], [0.04, 0.095], [0.038, 0.052], [0.035, 0.008], [0.0, 0.008]];
  const body = new THREE.Mesh(new THREE.LatheGeometry(prof.map(([x, y]) => new THREE.Vector2(x, y)), 40), glaze);
  const handle = new THREE.Mesh(new THREE.TorusGeometry(0.022, 0.0055, 12, 24, Math.PI * 1.15), glaze);
  handle.rotation.z = -Math.PI * 0.575; handle.position.set(0.043, 0.05, 0);
  const coffee = new THREE.Mesh(new THREE.CircleGeometry(0.038, 32), new THREE.MeshPhysicalMaterial({ color: "#2a170c", roughness: 0.1, clearcoat: 1 }));
  coffee.rotation.x = -Math.PI / 2; coffee.position.y = 0.072;
  [body, handle].forEach((m) => { m.castShadow = true; m.receiveShadow = true; });
  g.add(body, handle, coffee);
  return g;
}

/* A closed A5 notebook: leather cover, cream page block, elastic band; a pen on top */
export function notebook(cover) {
  const g = new THREE.Group();
  const pages = box(0.142, 0.012, 0.206, new THREE.MeshStandardMaterial({ color: "#ece4d3", roughness: 0.9 }), 0.002); pages.position.y = 0.0075;
  const back = plate(0.15, 0.21, 0.0016, 0.006, cover);
  const front = plate(0.15, 0.21, 0.0016, 0.006, cover); front.position.y = 0.0136;
  const band = box(0.006, 0.0158, 0.212, new THREE.MeshStandardMaterial({ color: "#141414", roughness: 0.7 })); band.position.set(0.05, 0.0079, 0);
  const pen = new THREE.Group(); pen.position.set(-0.02, 0.0195, 0.0); pen.rotation.y = 0.35;
  const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.0045, 0.0045, 0.135, 16), new THREE.MeshPhysicalMaterial({ color: "#101012", roughness: 0.25, clearcoat: 1 }));
  barrel.rotation.x = Math.PI / 2;
  const clip = box(0.002, 0.0015, 0.045, new THREE.MeshStandardMaterial({ color: "#c9a96e", roughness: 0.2, metalness: 1 })); clip.position.set(0, 0.005, -0.04);
  pen.add(barrel, clip);
  [pages, band, barrel].forEach((m) => { m.castShadow = true; m.receiveShadow = true; });
  g.add(back, pages, front, band, pen);
  return g;
}

