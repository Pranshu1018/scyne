/* An ergonomic task chair, modelled in code to real proportions: a soft upholstered seat in
   wool herringbone, a curved mesh back in a moulded frame with a lumbar band, leather-topped
   arms, a die-cast mechanism, a gas lift and a polished aluminium five-star base on
   twin-wheel castors. Built in the sitter's frame (he faces +z, floor at y = 0); the upper part
   tilts with him, the base stays flat. */

import * as THREE from "three";

let M = null; // materials, made once
function materials(A) {
  if (M) return M;
  const tex = (id, map, r, srgb) => { const t = A.textures[id][map].clone(); t.repeat.set(r, r); if (srgb) t.colorSpace = THREE.SRGBColorSpace; t.needsUpdate = true; return t; };
  M = {
    wool: new THREE.MeshPhysicalMaterial({
      color: "#4a4a50", map: tex("poly_wool_herringbone", "Diffuse", 3.5, true), normalMap: tex("poly_wool_herringbone", "nor_gl", 3.5),
      roughnessMap: tex("poly_wool_herringbone", "arm", 3.5), roughness: 1, metalness: 0,
      sheen: 1, sheenRoughness: 0.55, sheenColor: new THREE.Color("#8a8a92"),
    }),
    leather: new THREE.MeshPhysicalMaterial({
      color: "#4a3f38", map: tex("fabric_leather_02", "Diffuse", 3, true), normalMap: tex("fabric_leather_02", "nor_gl", 3),
      roughnessMap: tex("fabric_leather_02", "arm", 3), roughness: 0.9, metalness: 0, clearcoat: 0.15, clearcoatRoughness: 0.5,
    }),
    nylon: new THREE.MeshStandardMaterial({ color: "#18181b", roughness: 0.48, metalness: 0 }),
    satin: new THREE.MeshStandardMaterial({ color: "#232326", roughness: 0.35, metalness: 0.6 }),
    alu: new THREE.MeshPhysicalMaterial({ color: "#d8d9db", roughness: 0.14, metalness: 1, clearcoat: 0.3 }),
    chrome: new THREE.MeshStandardMaterial({ color: "#eceef0", roughness: 0.06, metalness: 1 }),
    tyre: new THREE.MeshStandardMaterial({ color: "#121214", roughness: 0.75, metalness: 0 }),
    mesh: meshMaterial(),
  };
  return M;
}

/* The back's outline: a squircle a little wider at the shoulders */
const BACK_W = 0.25, BACK_H = 0.32;
function outline(t) {
  const c = Math.cos(t), s = Math.sin(t), n = 0.38;
  const y = BACK_H * Math.sign(s) * Math.pow(Math.abs(s), n);
  const x = BACK_W * (0.94 + 0.06 * (y / BACK_H)) * Math.sign(c) * Math.pow(Math.abs(c), n);
  return [x, y];
}

/* Woven mesh: the outline as alpha, with a fine diagonal weave inside it */
function meshMaterial() {
  const W = 512, H = Math.round(512 * BACK_H / BACK_W);
  const c = document.createElement("canvas"); c.width = W; c.height = H;
  const x = c.getContext("2d");
  x.beginPath();
  for (let i = 0; i <= 200; i++) { const [px, py] = outline((i / 200) * Math.PI * 2); const u = (px / BACK_W + 1) / 2 * W, v = (1 - (py / BACK_H + 1) / 2) * H; i ? x.lineTo(u, v) : x.moveTo(u, v); }
  x.closePath(); x.clip();
  x.fillStyle = "rgba(30,30,34,0.35)"; x.fillRect(0, 0, W, H);
  x.strokeStyle = "rgba(38,38,42,1)"; x.lineWidth = 1.6;
  for (let i = -H; i < W + H; i += 5) { x.beginPath(); x.moveTo(i, 0); x.lineTo(i + H, H); x.stroke(); x.beginPath(); x.moveTo(i + H, 0); x.lineTo(i, H); x.stroke(); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
  return new THREE.MeshStandardMaterial({ map: t, alphaTest: 0.3, side: THREE.DoubleSide, roughness: 0.8, metalness: 0, alphaToCoverage: true });
}

/* Bend a flat back-shaped point onto the curve of the back (radius R, concave towards him) */
const R = 0.46;
const bend = (x, y, out = new THREE.Vector3()) => out.set(R * Math.sin(x / R), y, R * (1 - Math.cos(x / R)));

function shapeRounded(w, d, r, taper = 0) {
  const s = new THREE.Shape(), hw = w / 2, hd = d / 2, fw = hw * (1 + taper);
  s.moveTo(-hw + r, hd); s.lineTo(hw - r, hd); s.quadraticCurveTo(hw, hd, hw, hd - r);
  s.lineTo(fw, -hd + r); s.quadraticCurveTo(fw, -hd, fw - r, -hd);
  s.lineTo(-fw + r, -hd); s.quadraticCurveTo(-fw, -hd, -fw, -hd + r);
  s.lineTo(-hw, hd - r); s.quadraticCurveTo(-hw, hd, -hw + r, hd);
  return s;
}
/* A soft, bevelled slab from a top-view shape, lying flat (shape y → -z), top at y = h */
function slab(shape, h, bevel, mat, seg = 6) {
  const g = new THREE.ExtrudeGeometry(shape, { depth: Math.max(0.001, h - bevel * 2), bevelEnabled: true, bevelThickness: bevel, bevelSize: bevel, bevelSegments: seg, curveSegments: 14 });
  g.rotateX(-Math.PI / 2); g.translate(0, bevel, 0);
  const m = new THREE.Mesh(g, mat); m.castShadow = true; m.receiveShadow = true;
  return m;
}
function tube(points, r, mat, closed = false, seg = 64) {
  const m = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points, closed, "centripetal"), seg, r, 10, closed), mat);
  m.castShadow = true; m.receiveShadow = true;
  return m;
}
function lathe(profile, mat, seg = 32) {
  const m = new THREE.Mesh(new THREE.LatheGeometry(profile.map(([r, y]) => new THREE.Vector2(r, y)), seg), mat);
  m.castShadow = true; m.receiveShadow = true;
  return m;
}
const V = (x, y, z) => new THREE.Vector3(x, y, z);

export function officeChair(A) {
  const m = materials(A);
  const upper = new THREE.Group();

  // ---- seat: upholstered cushion on a moulded shell, front edge rolled down ----
  const seat = new THREE.Group(); seat.position.set(0, 0.392, 0.0); seat.rotation.x = 0.2;
  seat.add(slab(shapeRounded(0.47, 0.46, 0.1, 0.04), 0.075, 0.03, m.wool, 8));
  const shell = slab(shapeRounded(0.45, 0.43, 0.09, 0.03), 0.02, 0.008, m.nylon); shell.position.y = -0.012;
  seat.add(shell);
  upper.add(seat);

  // ---- back: curved woven mesh in a moulded frame, lumbar band, carried on a spine ----
  const back = new THREE.Group(); back.position.set(0, 0.95, -0.255); back.rotation.x = -0.17;
  const membrane = new THREE.PlaneGeometry(BACK_W * 2, BACK_H * 2, 32, 24);
  const p = membrane.attributes.position, v = new THREE.Vector3();
  for (let i = 0; i < p.count; i++) { bend(p.getX(i), p.getY(i), v); p.setXYZ(i, v.x, v.y, v.z); }
  membrane.computeVertexNormals();
  const mem = new THREE.Mesh(membrane, m.mesh); mem.castShadow = true; mem.receiveShadow = true; back.add(mem);
  const ring = []; for (let i = 0; i < 96; i++) { const [x, y] = outline((i / 96) * Math.PI * 2); ring.push(bend(x * 1.01, y * 1.01)); }
  back.add(tube(ring, 0.013, m.nylon, true, 220));
  const lumbar = new THREE.PlaneGeometry(0.4, 0.075, 24, 1), lp = lumbar.attributes.position;
  for (let i = 0; i < lp.count; i++) { bend(lp.getX(i), lp.getY(i) - 0.1, v); lp.setXYZ(i, v.x, v.y, v.z + 0.006); }
  lumbar.computeVertexNormals();
  const lum = new THREE.Mesh(lumbar, m.wool); lum.castShadow = true; back.add(lum);
  upper.add(back);
  upper.add(tube([V(0, 0.385, -0.08), V(0, 0.375, -0.22), V(0, 0.45, -0.3), V(0, 0.62, -0.31), V(0, 0.8, -0.285)], 0.019, m.nylon));

  // ---- arms: T-arms on curved supports, leather pads ----
  for (const s of [-1, 1]) {
    upper.add(tube([V(s * 0.17, 0.375, -0.06), V(s * 0.25, 0.385, -0.06), V(s * 0.285, 0.43, -0.06), V(s * 0.29, 0.6, -0.06)], 0.016, m.nylon, false, 32));
    const collar = lathe([[0.001, 0], [0.021, 0], [0.023, 0.006], [0.023, 0.05], [0.021, 0.056], [0.001, 0.056]], m.satin, 20);
    collar.position.set(s * 0.288, 0.52, -0.06); upper.add(collar);
    const pad = slab(shapeRounded(0.085, 0.25, 0.035), 0.028, 0.011, m.leather);
    pad.position.set(s * 0.29, 0.6, -0.04); pad.rotation.y = s * -0.06; upper.add(pad);
    const padBase = slab(shapeRounded(0.07, 0.2, 0.03), 0.012, 0.004, m.nylon); padBase.position.set(s * 0.29, 0.592, -0.045); upper.add(padBase);
  }

  // ---- mechanism with tension knob and two paddles ----
  const mech = slab(shapeRounded(0.2, 0.24, 0.03), 0.055, 0.012, m.satin); mech.position.set(0, 0.325, -0.02); upper.add(mech);
  const knob = lathe([[0.001, 0], [0.028, 0], [0.032, 0.01], [0.032, 0.03], [0.026, 0.038], [0.001, 0.038]], m.nylon, 24);
  knob.rotation.x = Math.PI / 2; knob.position.set(0, 0.34, 0.1); upper.add(knob);
  for (const s of [-1, 1]) { const paddle = slab(shapeRounded(0.09, 0.03, 0.012), 0.008, 0.003, m.nylon); paddle.position.set(s * 0.13, 0.335, 0.02); paddle.rotation.y = s * 0.2; upper.add(paddle); }

  // ---- base ----
  const base = new THREE.Group();
  base.add(lathe([[0.001, 0.38], [0.0255, 0.38], [0.026, 0.37], [0.026, 0.22], [0.001, 0.22]], m.chrome, 28)); // gas lift
  base.add(lathe([[0.001, 0.07], [0.036, 0.07], [0.036, 0.12], [0.033, 0.125], [0.033, 0.17], [0.03, 0.175], [0.03, 0.225], [0.001, 0.225]], m.nylon, 28)); // telescopic cover
  base.add(lathe([[0.001, 0.045], [0.07, 0.045], [0.072, 0.06], [0.062, 0.1], [0.04, 0.11], [0.001, 0.11]], m.alu, 36)); // hub
  // five tapered spokes, sloping down to the castors
  const spoke = new THREE.Shape(); spoke.moveTo(0.03, -0.034); spoke.lineTo(0.33, -0.02); spoke.quadraticCurveTo(0.345, 0, 0.33, 0.02); spoke.lineTo(0.03, 0.034); spoke.lineTo(0.03, -0.034);
  const sg = new THREE.ExtrudeGeometry(spoke, { depth: 0.014, bevelEnabled: true, bevelThickness: 0.008, bevelSize: 0.008, bevelSegments: 4, curveSegments: 8 });
  sg.rotateX(-Math.PI / 2); // lies flat, x outwards
  const sp = sg.attributes.position;
  for (let i = 0; i < sp.count; i++) sp.setY(i, sp.getY(i) + 0.07 - Math.max(0, sp.getX(i) - 0.05) * 0.1);
  sg.computeVertexNormals();
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2 + 0.31;
    const arm = new THREE.Mesh(sg, m.alu); arm.rotation.y = a; arm.castShadow = true; arm.receiveShadow = true; base.add(arm);
    // castor: housing, two wheels with chrome caps
    const c = new THREE.Group(); c.position.set(Math.cos(a) * 0.335, 0, -Math.sin(a) * 0.335); c.rotation.y = a + 0.9;
    const stem = lathe([[0.001, 0.06], [0.011, 0.06], [0.011, 0.085], [0.001, 0.085]], m.chrome, 12);
    const housing = slab(shapeRounded(0.03, 0.06, 0.012), 0.032, 0.008, m.nylon); housing.position.set(0, 0.032, 0.0);
    c.add(stem, housing);
    for (const s of [-1, 1]) {
      const w = lathe([[0.001, -0.009], [0.024, -0.009], [0.029, -0.005], [0.03, 0], [0.029, 0.005], [0.024, 0.009], [0.001, 0.009]], m.tyre, 24);
      w.rotation.z = Math.PI / 2; w.position.set(s * 0.022, 0.03, -0.014);
      const cap = new THREE.Mesh(new THREE.CircleGeometry(0.016, 20), m.chrome); cap.position.set(s * 0.0315, 0.03, -0.014); cap.rotation.y = s * Math.PI / 2;
      c.add(w, cap);
    }
    base.add(c);
  }
  return { upper, base };
}
