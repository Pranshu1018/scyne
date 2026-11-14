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
// the numeric keypad of a full-size keyboard: four columns beside the main block; enter spans two rows
const NUMPAD = [
  ["F13", "F14", "F15", "F16"], ["clear", "=", "/", "*"], ["7", "8", "9", "−"], ["4", "5", "6", "+"], ["1", "2", "3", "enter"], ["0", "", ".", null],
];
function keyRects(u = U, numpad = false) {
  const gap = GAP * (u / U);
  const out = [];
  let z = 0;
  for (const row of ROWS) {
    let x = 0;
    for (const [label, w] of row.keys) {
      const kw = w * u - gap, kd = row.h * u - gap, half = kd / 2 - gap / 4;
      const at = (l, dz, d) => out.push({ label: l, x: x + gap / 2, z: z + gap / 2 + dz, w: kw, d });
      if (label === "▲▼") { at("▲", 0, half); at("▼", kd - half, half); }
      else if (label === "◀" || label === "▶") at(label, kd - half, half);
      else at(label, 0, kd);
      x += w * u;
    }
    z += row.h * u;
  }
  let width = 14.5 * u;
  if (numpad) {
    const x0 = 15.1 * u;
    let zz = 0;
    NUMPAD.forEach((row, r) => {
      const h = ROWS[r].h * u;
      row.forEach((label, c) => {
        if (label === null) return; // under the tall enter
        if (r === 5 && c === 1) return; // the wide zero covers it
        const wide = r === 5 && c === 0, tall = label === "enter";
        out.push({ label, pad: true, x: x0 + c * u + gap / 2, z: zz + gap / 2, w: (wide ? 2 : 1) * u - gap, d: (tall ? h + ROWS[5].h * u : h) - gap });
      });
      zz += h;
    });
    width = x0 + 4 * u;
  }
  out.width = width; out.depth = z;
  return out;
}

const PALETTE = {
  dark: { well: "#050506", cap: ["#1d1e21", "#141517"], ink: "#c9cbcf" },
  white: { well: "#a9abaf", cap: ["#fdfcfa", "#e9e7e3"], ink: "#55565b" },
  // a mechanical keyboard in PBT: cream letters, warm grey modifiers, red escape and enter. The caps
  // taper, so each printed top is smaller than its footprint (inset, per side)
  mech: {
    well: "#1c1d20", inset: 0.0021,
    cap: ["#f1ebdf", "#e2dacb"], ink: "#34332f",
    mod: { cap: ["#a29d94", "#8f8a82"], ink: "#f6f2ea" },
    accent: { cap: ["#ff5232", "#e8381b"], ink: "#2a0b04" },
  },
};
const capStyle = (pal, k) => {
  if (!pal.mod) return pal;
  if (["esc", "return", "enter"].includes(k.label)) return pal.accent;
  const op = k.pad && !/^[0-9.]$/.test(k.label);
  if (op || ARROWS.includes(k.label) || (k.label.length > 1 && !/^F\d+$/.test(k.label))) return pal.mod;
  return pal;
};
/* the printed face of the keyboard: caps, legends, the well between them */
function keyboardTexture(keys, pal = PALETTE.dark) {
  const KW = keys.width, KD = keys.depth;
  const PX = (KW > 0.3 ? 3072 : 2048) / KW; // pixels per metre
  const cv = document.createElement("canvas");
  cv.width = Math.round(KW * PX); cv.height = Math.ceil(KD * PX);
  const c = cv.getContext("2d");
  c.fillStyle = pal.well; c.fillRect(0, 0, cv.width, cv.height);
  c.textBaseline = "middle";
  const ins = (pal.inset || 0) * PX;
  for (const k of keys) {
    const st = capStyle(pal, k);
    const x = k.x * PX + ins, y = k.z * PX + ins, w = k.w * PX - 2 * ins, h = k.d * PX - 2 * ins;
    // the cap: near black, a touch lighter in the middle (the slight dish of its top)
    const grad = c.createRadialGradient(x + w / 2, y + h / 2, 0, x + w / 2, y + h / 2, Math.max(w, h) * 0.7);
    grad.addColorStop(0, st.cap[0]); grad.addColorStop(1, st.cap[1]);
    c.fillStyle = grad;
    // a tapered cap's top is mapped right to its edge: paint it square and a little oversize, so
    // its rounded corners and sides never pick up the well's colour
    if (ins) { c.fillRect(x - 3, y - 3, w + 6, h + 6); } else { c.beginPath(); c.roundRect(x, y, w, h, 0.0016 * PX); c.fill(); }
    if (!k.label) continue;
    c.fillStyle = st.ink;
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
      const right = k.x > KW / 2;
      c.textAlign = right ? "right" : "left"; c.font = `400 ${small}px ${FONT}`;
      c.fillText(k.label, right ? x + w - 0.0022 * PX : x + 0.0022 * PX, y + h - 0.0034 * PX);
    }
  }
  const t = new THREE.CanvasTexture(cv);
  t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 16;
  return t;
}

/* one keycap, w × d, standing on y = 0 with its top at y = h: rounded corners, a small bevel;
   taper: how far the top edges are pulled in, per side (mechanical caps are narrower on top) */
function keycap(w, d, h, taper = 0) {
  const r = Math.min(0.0017, w / 2 - 1e-4, d / 2 - 1e-4), b = 0.00035;
  const s = new THREE.Shape();
  s.moveTo(-w / 2 + r, -d / 2); s.lineTo(w / 2 - r, -d / 2); s.absarc(w / 2 - r, -d / 2 + r, r, -Math.PI / 2, 0);
  s.lineTo(w / 2, d / 2 - r); s.absarc(w / 2 - r, d / 2 - r, r, 0, Math.PI / 2);
  s.lineTo(-w / 2 + r, d / 2); s.absarc(-w / 2 + r, d / 2 - r, r, Math.PI / 2, Math.PI);
  s.lineTo(-w / 2, -d / 2 + r); s.absarc(-w / 2 + r, -d / 2 + r, r, Math.PI, Math.PI * 1.5);
  const g = new THREE.ExtrudeGeometry(s, { depth: h - 2 * b, bevelEnabled: true, bevelThickness: b, bevelSize: b * 0.9, bevelOffset: -b * 0.9, bevelSegments: 2, curveSegments: 3 });
  g.rotateX(-Math.PI / 2); // extrusion → +y (from -b), shape y → -z
  g.translate(0, b, 0);
  if (taper > 0) {
    const p = g.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const t = Math.min(1, Math.max(0, p.getY(i) / h));
      p.setX(i, p.getX(i) * (1 - (t * 2 * taper) / w)); p.setZ(i, p.getZ(i) * (1 - (t * 2 * taper) / d));
    }
    g.computeVertexNormals();
  }
  return g;
}

const keyboardShared = {};
function keyboardParts(variant = "dark") {
  if (keyboardShared[variant]) return keyboardShared[variant];
  // laptops: the compact layout at 18.6 mm; the desk keyboard: full size with a keypad, 42 cm wide
  // mechanical: tall (8.5 mm) tapered caps on a plate
  const mech = variant === "mech", pal = PALETTE[variant];
  const keys = variant === "dark" ? keyRects() : keyRects(0.02115, true), H = mech ? 0.0085 : 0.0013; // laptop caps stand 1.3 mm proud
  const KW = keys.width, KD = keys.depth, taper = pal.inset || 0;
  // mapped from above: every cap shows its own patch of the drawn keyboard; the sides of a tapered
  // cap take the colour at the edge of its top
  const geos = keys.map((k) => {
    const g = keycap(k.w, k.d, H, taper), p = g.attributes.position, uv = new Float32Array(p.count * 2);
    const hx = k.w / 2 - taper - 0.0004, hz = k.d / 2 - taper - 0.0004, cx = k.x + k.w / 2, cz = k.z + k.d / 2;
    for (let i = 0; i < p.count; i++) {
      const x = taper ? Math.min(hx, Math.max(-hx, p.getX(i))) : p.getX(i), z = taper ? Math.min(hz, Math.max(-hz, p.getZ(i))) : p.getZ(i);
      uv[i * 2] = (cx + x) / KW; uv[i * 2 + 1] = 1 - (cz + z) / KD;
    }
    g.setAttribute("uv", new THREE.BufferAttribute(uv, 2));
    return g.translate(cx - KW / 2, 0, cz);
  });
  const geo = mergeGeometries(geos, false);
  geos.forEach((g) => g.dispose());
  const face = keyboardTexture(keys, pal);
  const caps = mech
    // PBT: dry, matte, a faint sheen where the light grazes it
    ? new THREE.MeshPhysicalMaterial({ map: face, roughness: 0.62, metalness: 0, sheen: 0.4, sheenRoughness: 0.6, sheenColor: "#ffffff" })
    : variant === "white"
    // white keycaps: satin ABS with a faint clear sheen, no backlight
    ? new THREE.MeshPhysicalMaterial({ map: face, roughness: 0.42, metalness: 0, clearcoat: 0.25, clearcoatRoughness: 0.5 })
    : new THREE.MeshStandardMaterial({ map: face, roughness: 0.48, metalness: 0, emissive: "#fff4e6", emissiveMap: face, emissiveIntensity: 0.14 });
  const wellGeo = new THREE.PlaneGeometry(KW + 0.002, KD + 0.002);
  wellGeo.rotateX(-Math.PI / 2); wellGeo.translate(0, 0.00005, KD / 2);
  const well = variant === "white" ? silver : new THREE.MeshStandardMaterial({ color: mech ? pal.well : "#060607", roughness: mech ? 0.5 : 0.85, metalness: mech ? 0.6 : 0 });
  keyboardShared[variant] = { geo, caps, wellGeo, well, width: KW, depth: KD };
  return keyboardShared[variant];
}

/* The keyboard, its back edge at z = 0, standing on y = 0. Lit live (small and glossy: it should
   catch the light as the camera moves), so it is kept out of the bake and the static merge. */
export function keyboard(variant = "dark") {
  const k = keyboardParts(variant);
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

/* ---------- Desk props, lit live with soft contact shadows ----------
   Small, glossy and close to the camera: they need real reflections of the room, which the
   baked lightmaps cannot give them. Each is kept out of the bake and the static merge
   (userData.live) and sits on a soft shadow so it does not float. */
const silver = new THREE.MeshPhysicalMaterial({ color: "#c9cbcf", roughness: 0.32, metalness: 0.75, clearcoat: 0.2, clearcoatRoughness: 0.4 });
export const live = (o) => { o.traverse((m) => { if (m.isMesh) { m.userData.live = true; m.castShadow = false; m.receiveShadow = false; } }); return o; };

let shadowTex = null;
/* a soft dark ellipse w × d lying on the surface below an object */
export function contactShadow(w, d, strength = 0.55) {
  if (!shadowTex) {
    const c = document.createElement("canvas"); c.width = c.height = 128;
    const g = c.getContext("2d"), gr = g.createRadialGradient(64, 64, 0, 64, 64, 64);
    gr.addColorStop(0, "rgba(255,255,255,1)"); gr.addColorStop(0.45, "rgba(255,255,255,.55)"); gr.addColorStop(1, "rgba(255,255,255,0)");
    g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
    shadowTex = new THREE.CanvasTexture(c);
  }
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d), new THREE.MeshBasicMaterial({ color: "#000", alphaMap: shadowTex, transparent: true, opacity: strength, depthWrite: false }));
  m.rotation.x = -Math.PI / 2; m.position.y = 0.0006; m.renderOrder = 1;
  return m;
}

/* A rounded-rectangle ring, w × d and t tall, with a w2 × d2 opening in the middle */
function frame(w, d, t, r, w2, d2, mat) {
  const s = new THREE.Shape();
  s.moveTo(-w / 2 + r, -d / 2); s.lineTo(w / 2 - r, -d / 2); s.absarc(w / 2 - r, -d / 2 + r, r, -Math.PI / 2, 0);
  s.lineTo(w / 2, d / 2 - r); s.absarc(w / 2 - r, d / 2 - r, r, 0, Math.PI / 2);
  s.lineTo(-w / 2 + r, d / 2); s.absarc(-w / 2 + r, d / 2 - r, r, Math.PI / 2, Math.PI);
  s.lineTo(-w / 2, -d / 2 + r); s.absarc(-w / 2 + r, -d / 2 + r, r, Math.PI, Math.PI * 1.5);
  const hole = new THREE.Path(), q = 0.0015;
  hole.moveTo(-w2 / 2 + q, -d2 / 2); hole.lineTo(-w2 / 2, -d2 / 2 + q); hole.lineTo(-w2 / 2, d2 / 2 - q); hole.lineTo(-w2 / 2 + q, d2 / 2);
  hole.lineTo(w2 / 2 - q, d2 / 2); hole.lineTo(w2 / 2, d2 / 2 - q); hole.lineTo(w2 / 2, -d2 / 2 + q); hole.lineTo(w2 / 2 - q, -d2 / 2);
  s.holes.push(hole);
  const b = 0.0012;
  const g = new THREE.ExtrudeGeometry(s, { depth: t - b * 2, bevelEnabled: true, bevelThickness: b, bevelSize: b, bevelSegments: 3, curveSegments: 10 });
  g.rotateX(-Math.PI / 2); g.translate(0, b, 0);
  return new THREE.Mesh(g, mat);
}

/* A full-size mechanical keyboard: a graphite aluminium case, tall PBT keycaps (cream letters, grey
   modifiers, red escape and enter) standing proud of its rim, the dark plate showing between them */
const graphite = new THREE.MeshPhysicalMaterial({ color: "#5a5b61", roughness: 0.32, metalness: 0.35, clearcoat: 0.15, clearcoatRoughness: 0.4 });
export function deskKeyboard() {
  const g = new THREE.Group();
  const { width: KW, depth: KD } = keyboardParts("mech");
  const CW = KW + 0.026, CD = KD + 0.028, FLOOR = 0.009, RIM = 0.0135;
  // tilted about its front edge: the back edge sits about 7 mm higher
  const tilt = new THREE.Group(); tilt.rotation.x = -0.05; tilt.position.z = CD / 2;
  const inner = new THREE.Group(); inner.position.z = -CD / 2; tilt.add(inner);
  const floor = plate(CW - 0.006, CD - 0.006, FLOOR, 0.007, graphite);
  const rim = frame(CW, CD, RIM, 0.009, KW + 0.004, KD + 0.004, graphite);
  const keys = keyboard("mech"); keys.position.set(0, FLOOR + 0.00005, -KD / 2);
  inner.add(floor, rim, keys);
  g.add(tilt, contactShadow(CW + 0.06, CD + 0.06, 0.6));
  return live(g);
}

/* A wireless mouse in pale grey: a rounded-rectangle footprint, wider at the palm, steep sides
   rising to a dome highest behind the middle; the button split and the wheel's slot printed on
   top, a graphite rubber wheel in the slot, a red status light */
let mouseTex = null;
export function deskMouse() {
  const g = new THREE.Group();
  const LX = 0.032, LY = 0.036, LZ = 0.06;
  const hump = (z) => 0.78 + 0.26 * (0.5 + 0.5 * z) - 0.16 * Math.max(0, z - 0.55); // highest behind the middle
  const width = (z) => 1 + 0.1 * z; // narrower under the fingers (z < 0), wider at the palm
  const shellGeo = new THREE.SphereGeometry(1, 80, 40, 0, Math.PI * 2, 0, Math.PI / 2);
  const p = shellGeo.attributes.position, uv = shellGeo.attributes.uv;
  for (let i = 0; i < p.count; i++) {
    let x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    // square the footprint off a little (a superellipse) and steepen the sides
    const r = Math.hypot(x, z);
    if (r > 1e-6) { const c = Math.abs(x / r), sn = Math.abs(z / r), k = 1 / Math.pow(Math.pow(c, 2.6) + Math.pow(sn, 2.6), 1 / 2.6); x *= k; z *= k; }
    y = Math.pow(Math.max(0, y), 0.72) * hump(z);
    x *= width(z);
    p.setXYZ(i, x * LX, y * LY, z * LZ);
    uv.setXY(i, 0.5 + (x / 1.12) * 0.5, 0.5 + z * 0.5); // printed from above
  }
  shellGeo.computeVertexNormals();
  if (!mouseTex) {
    const c = document.createElement("canvas"); c.width = 256; c.height = 512;
    const x = c.getContext("2d");
    x.fillStyle = "#d9d7d2"; x.fillRect(0, 0, 256, 512);
    // canvas y = 512 is the front of the mouse
    x.strokeStyle = "rgba(40,40,44,.75)"; x.lineWidth = 2.5;
    x.beginPath(); x.moveTo(128, 512); x.lineTo(128, 462); x.moveTo(128, 360); x.lineTo(128, 300); x.stroke(); // the button split
    x.beginPath(); x.moveTo(10, 282); x.quadraticCurveTo(128, 318, 246, 282); x.stroke(); // where the buttons end
    x.fillStyle = "#2a2a2e"; x.beginPath(); x.roundRect(112, 360, 32, 102, 15); x.fill(); // the wheel's slot
    x.fillStyle = "#ff3d1f"; x.beginPath(); x.arc(128, 336, 4, 0, Math.PI * 2); x.fill(); // status light
    mouseTex = new THREE.CanvasTexture(c); mouseTex.colorSpace = THREE.SRGBColorSpace; mouseTex.anisotropy = 8;
  }
  // soft-touch coating: satin, a faint clear sheen
  const shell = new THREE.Mesh(shellGeo, new THREE.MeshPhysicalMaterial({ map: mouseTex, roughness: 0.5, clearcoat: 0.3, clearcoatRoughness: 0.5 }));
  shell.position.y = 0.0024;
  // the wheel, standing a few millimetres proud of its slot
  const wz = -0.58, wy = 0.0024 + Math.pow(Math.sqrt(1 - wz * wz), 0.72) * hump(wz) * LY;
  const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.0078, 0.0078, 0.0056, 32), new THREE.MeshStandardMaterial({ color: "#232326", roughness: 0.75 }));
  wheel.rotation.z = Math.PI / 2; wheel.position.set(0, wy - 0.005, wz * LZ);
  const foot = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 0.0026, 48), new THREE.MeshStandardMaterial({ color: "#3a3a3e", roughness: 0.6 }));
  foot.scale.set(LX * 1.02, 1, LZ * 0.98); foot.position.y = 0.0013;
  g.add(shell, wheel, foot, contactShadow(0.08, 0.14, 0.35));
  return live(g);
}

/* A felt desk mat: charcoal wool, a stitched edge; keyboard and mouse sit on it (its top at y = t) */
export function deskMat(w, d, t = 0.003) {
  const c = document.createElement("canvas"); c.width = 1024; c.height = Math.round((1024 * d) / w);
  const x = c.getContext("2d");
  x.fillStyle = "#34353a"; x.fillRect(0, 0, c.width, c.height);
  for (let i = 0; i < 26000; i++) { // the felt's fibres
    x.fillStyle = `rgba(${Math.random() < 0.5 ? "255,255,255" : "0,0,0"},${Math.random() * 0.07})`;
    x.fillRect(Math.random() * c.width, Math.random() * c.height, 1 + Math.random() * 2, 1);
  }
  x.strokeStyle = "rgba(20,20,22,.9)"; x.lineWidth = 3; x.setLineDash([9, 6]);
  x.strokeRect(14, 14, c.width - 28, c.height - 28); // the stitching
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 16;
  const mat = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.96, metalness: 0 });
  const m = plate(w, d, t, 0.012, mat);
  // the extrusion maps its top in metres: rescale to 0..1 across the mat
  const uvA = m.geometry.attributes.uv;
  for (let i = 0; i < uvA.count; i++) uvA.setXY(i, uvA.getX(i) / w + 0.5, uvA.getY(i) / d + 0.5);
  const g = new THREE.Group(); g.add(m, contactShadow(w + 0.03, d + 0.03, 0.35));
  return live(g);
}

/* A glazed stoneware mug, half full: real wall thickness and a rounded rim, a curved handle,
   the unglazed ring of its foot, coffee with a ring of crema */
export function mug() {
  const g = new THREE.Group();
  const glaze = new THREE.MeshPhysicalMaterial({ color: "#efebe4", roughness: 0.22, clearcoat: 1, clearcoatRoughness: 0.06 });
  const prof = [[0.0, 0.004], [0.031, 0.004], [0.0345, 0.0045], [0.0365, 0.008], [0.0395, 0.05], [0.041, 0.09], [0.0412, 0.0935], [0.0405, 0.0958], [0.0393, 0.0958],
    [0.0386, 0.0935], [0.0379, 0.09], [0.0365, 0.05], [0.034, 0.013], [0.031, 0.0105], [0.0, 0.0105]];
  const body = new THREE.Mesh(new THREE.LatheGeometry(prof.map(([x, y]) => new THREE.Vector2(x, y)), 72), glaze);
  const footProf = [[0.0, 0.0], [0.0335, 0.0], [0.0345, 0.0012], [0.0345, 0.0046], [0.031, 0.0046], [0.0, 0.0046]];
  const foot = new THREE.Mesh(new THREE.LatheGeometry(footProf.map(([x, y]) => new THREE.Vector2(x, y)), 72), new THREE.MeshStandardMaterial({ color: "#c7b39a", roughness: 0.92 }));
  // handle: a C-shaped tube from just under the rim to low on the side, ends tucked into the wall
  const path = new THREE.CatmullRomCurve3([[0.036, 0.082, 0], [0.052, 0.086, 0], [0.064, 0.072, 0], [0.065, 0.05, 0], [0.056, 0.031, 0], [0.037, 0.026, 0]].map((v) => new THREE.Vector3(...v)));
  const handle = new THREE.Mesh(new THREE.TubeGeometry(path, 48, 0.0052, 14, false), glaze);
  handle.scale.z = 0.8; // a flattened grip
  // coffee: dark in the middle, a ring of crema against the wall, a bright meniscus line
  const c = document.createElement("canvas"); c.width = c.height = 256;
  const x = c.getContext("2d"), gr = x.createRadialGradient(128, 128, 0, 128, 128, 128);
  gr.addColorStop(0, "#2a160a"); gr.addColorStop(0.62, "#3b1f0e"); gr.addColorStop(0.86, "#7a4a24"); gr.addColorStop(0.96, "#a8723f"); gr.addColorStop(1, "#d9b48a");
  x.fillStyle = gr; x.fillRect(0, 0, 256, 256);
  const ct = new THREE.CanvasTexture(c); ct.colorSpace = THREE.SRGBColorSpace;
  const coffee = new THREE.Mesh(new THREE.CircleGeometry(0.0368, 64), new THREE.MeshPhysicalMaterial({ map: ct, roughness: 0.08, clearcoat: 1, clearcoatRoughness: 0.03 }));
  coffee.rotation.x = -Math.PI / 2; coffee.position.y = 0.074;
  g.add(body, foot, handle, coffee, contactShadow(0.105, 0.105, 0.45));
  return live(g);
}

/* The first mug, as it was baked: kept so the lighting bake still matches the scene, and hidden
   once the bake is applied (material.userData.retire, see studio.js); mug() replaces it on screen */
export function bakedMug() {
  const g = new THREE.Group();
  const glaze = new THREE.MeshPhysicalMaterial({ color: "#ebe6de", roughness: 0.35, clearcoat: 0.8, clearcoatRoughness: 0.15 });
  glaze.userData.retire = true;
  const prof = [[0.0, 0.0], [0.034, 0.0], [0.037, 0.004], [0.041, 0.05], [0.043, 0.094], [0.04, 0.095], [0.038, 0.052], [0.035, 0.008], [0.0, 0.008]];
  const body = new THREE.Mesh(new THREE.LatheGeometry(prof.map(([x, y]) => new THREE.Vector2(x, y)), 40), glaze);
  const handle = new THREE.Mesh(new THREE.TorusGeometry(0.022, 0.0055, 12, 24, Math.PI * 1.15), glaze);
  handle.rotation.z = -Math.PI * 0.575; handle.position.set(0.043, 0.05, 0);
  const coffeeMat = new THREE.MeshPhysicalMaterial({ color: "#2a170c", roughness: 0.1, clearcoat: 1 }); coffeeMat.userData.retire = true;
  const coffee = new THREE.Mesh(new THREE.CircleGeometry(0.038, 32), coffeeMat);
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

