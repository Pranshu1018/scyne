/* The studio, at real scale (metres): 14 m × 10 m, 3.2 m ceiling.
   Herringbone oak floor, warm white plaster, a grey plaster brand wall with oak slats and the
   neon Scyne sign, a tall window onto the city at dusk, oak stairs with a glass balustrade,
   recessed downlights and black track lights. Nothing industrial. */

import * as THREE from "three";
import { mats, glow, box, cyl, Screen, FONT } from "./kit.js";

export const ROOM = { x0: -7, x1: 7, z0: -5, z1: 5, h: 3.2 };
export const STAIR = { x0: -7, x1: -5.8, zBottom: 0.2, zTop: 5, steps: 16 };

const rnd = (() => { let s = 7; return () => ((s = (s * 16807) % 2147483647) / 2147483647); })();

function plane(w, h, mat) {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
  m.receiveShadow = true;
  return m;
}

/* Window onto the city at dusk. A few lit windows switch on and off. */
function cityWindow() {
  const g = new THREE.Group();
  g.position.set(ROOM.x0 + 0.02, 0, -2.9);
  g.rotation.y = Math.PI / 2;
  const W = 3.0, H = 2.3, Y = 1.55;

  const cv = document.createElement("canvas"); cv.width = 1024; cv.height = 786;
  const ctx = cv.getContext("2d", { willReadFrequently: true });
  const lights = [];
  const sky = ctx.createLinearGradient(0, 0, 0, cv.height);
  sky.addColorStop(0, "#1b2340"); sky.addColorStop(0.45, "#3c3a5a"); sky.addColorStop(0.72, "#b2675a"); sky.addColorStop(0.9, "#e39a6a"); sky.addColorStop(1, "#f0b27a");
  ctx.fillStyle = sky; ctx.fillRect(0, 0, cv.width, cv.height);
  [["#2a2a3d", 0.3, 0.5, 0.1], ["#1c1c2a", 0.45, 0.72, 0.18], ["#121219", 0.6, 0.95, 0.26]].forEach(([col, minH, maxH, winP], layer) => {
    let x = -20;
    while (x < cv.width) {
      const w = 60 + rnd() * (layer === 2 ? 170 : 110);
      const top = cv.height * (1 - (minH + rnd() * (maxH - minH)) * 0.8);
      ctx.fillStyle = col; ctx.fillRect(x, top, w, cv.height - top);
      const cell = layer === 2 ? 16 : 11;
      for (let wy = top + 12; wy < cv.height - 8; wy += cell) {
        for (let wx = x + 7; wx < x + w - 7; wx += cell) if (rnd() < winP) lights.push({ x: wx, y: wy, s: cell * 0.5, warm: rnd() < 0.8, on: rnd() < 0.8, layer });
      }
      x += w + rnd() * 8;
    }
  });
  const snapshot = ctx.getImageData(0, 0, cv.width, cv.height);
  function drawLights() {
    ctx.putImageData(snapshot, 0, 0);
    for (const l of lights) {
      if (!l.on) continue;
      ctx.fillStyle = l.warm ? `rgba(255,210,150,${0.5 + l.layer * 0.2})` : `rgba(180,205,255,${0.45 + l.layer * 0.2})`;
      ctx.fillRect(l.x, l.y, l.s, l.s * 0.7);
    }
  }
  drawLights();
  const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace;
  const view = new THREE.Mesh(new THREE.PlaneGeometry(W, H), new THREE.MeshBasicMaterial({ map: tex, toneMapped: false, color: new THREE.Color(0.9, 0.9, 0.9) }));
  view.position.set(0, Y, -0.06);
  const glass = new THREE.Mesh(new THREE.PlaneGeometry(W, H), new THREE.MeshPhysicalMaterial({ color: "#0c0f16", transparent: true, opacity: 0.1, roughness: 0.04, metalness: 0.9 }));
  glass.position.set(0, Y, 0);
  g.add(view, glass);
  const frame = mats.blackSteel, t = 0.05;
  [[0, Y + H / 2, W + t * 2, t], [0, Y - H / 2, W + t * 2, t], [0, Y + 0.45, W, 0.03]].forEach(([x, y, w, h]) => { const b = box(w, h, 0.08, frame); b.position.set(x, y, 0.01); g.add(b); });
  [-W / 2, 0, W / 2].forEach((x) => { const b = box(x === 0 ? 0.03 : t, H, 0.08, frame); b.position.set(x, Y, 0.01); g.add(b); });
  const sill = box(W + 0.2, 0.04, 0.26, mats.oak); sill.position.set(0, Y - H / 2 - 0.02, 0.12); g.add(sill);
  // warm dusk light falling into the room
  const spill = new THREE.RectAreaLight("#ffc9a0", 3, W, H); spill.position.set(0, Y, 0.05); spill.rotation.y = Math.PI; g.add(spill);

  let last = 0;
  return {
    group: g,
    update(time) {
      // a few windows change every few seconds; the redraw waits its turn in the screens' upload budget
      if (time - last < 5 || Screen.left <= 0) return;
      Screen.left--; last = time;
      for (let i = 0; i < 4; i++) { const l = lights[Math.floor(rnd() * lights.length)]; l.on = !l.on; }
      drawLights(); tex.needsUpdate = true;
    },
  };
}

/* A black track with spot cans, purely the fitting (light comes from the scene spots) */
function trackLight(x0, x1, z, cans) {
  const g = new THREE.Group();
  const rail = box(x1 - x0, 0.035, 0.035, mats.blackSteel); rail.position.set((x0 + x1) / 2, ROOM.h - 0.02, z); g.add(rail);
  cans.forEach((x) => {
    const stem = cyl(0.008, 0.008, 0.12, mats.blackSteel, 8); stem.position.set(x, ROOM.h - 0.1, z);
    const can = cyl(0.045, 0.045, 0.16, mats.blackSteel, 20); can.position.set(x, ROOM.h - 0.2, z + 0.04); can.rotation.x = 0.5;
    const lens = new THREE.Mesh(new THREE.CircleGeometry(0.035, 20), glow("#fff1dc", 2.2)); lens.position.set(x, ROOM.h - 0.27, z + 0.08); lens.rotation.x = Math.PI / 2 + 0.5;
    g.add(stem, can, lens);
  });
  return g;
}

export function buildRoom(scene, A, { shadows = true } = {}) {
  const room = new THREE.Group();
  const W = ROOM.x1 - ROOM.x0, D = ROOM.z1 - ROOM.z0, H = ROOM.h;

  // ---------- Shell ----------
  const floor = plane(W, D, A.surface("herringbone_parquet", 6, 4.3, { color: "#c9b49a", roughness: 0.72, roughnessMap: null, metalness: 0, metalnessMap: null, envMapIntensity: 0.5 }));
  floor.rotation.x = -Math.PI / 2; room.add(floor);

  const plaster = A.surface("plastered_wall_02", 4, 1, { color: "#e4ded3", metalness: 0, map: null, aoMap: null, normalScale: new THREE.Vector2(0.35, 0.35) });
  const back = plane(W, H, plaster); back.position.set(0, H / 2, ROOM.z0);
  const left = plane(D, H, plaster); left.rotation.y = Math.PI / 2; left.position.set(ROOM.x0, H / 2, 0);
  const right = plane(D, H, plaster); right.rotation.y = -Math.PI / 2; right.position.set(ROOM.x1, H / 2, 0);
  const front = plane(W, H, plaster); front.rotation.y = Math.PI; front.position.set(0, H / 2, ROOM.z1);
  room.add(back, left, right, front);
  // oak skirting all round
  [[W, 0, ROOM.z0 + 0.01, 0], [W, 0, ROOM.z1 - 0.01, Math.PI]].forEach(([w, x, z, r]) => { const s = box(w, 0.08, 0.015, mats.oak); s.position.set(x, 0.04, z); s.rotation.y = r; room.add(s); });
  [[ROOM.x0 + 0.01, Math.PI / 2], [ROOM.x1 - 0.01, -Math.PI / 2]].forEach(([x, r]) => { const s = box(D, 0.08, 0.015, mats.oak); s.position.set(x, 0.04, 0); s.rotation.y = r; room.add(s); });

  // Ceiling (warm plaster) with an opening above the stairs
  const ceilMat = A.surface("plastered_wall_02", 5, 3.6, { color: "#ddd7cc", metalness: 0, map: null, aoMap: null, normalScale: new THREE.Vector2(0.3, 0.3) });
  const c1 = plane(ROOM.x1 - STAIR.x1, D, ceilMat); c1.rotation.x = Math.PI / 2; c1.position.set((ROOM.x1 + STAIR.x1) / 2, H, 0);
  const c2 = plane(STAIR.x1 - ROOM.x0, STAIR.zBottom - ROOM.z0, ceilMat); c2.rotation.x = Math.PI / 2; c2.position.set((STAIR.x1 + ROOM.x0) / 2, H, (STAIR.zBottom + ROOM.z0) / 2);
  room.add(c1, c2);
  // recessed downlights
  for (let x = -4.5; x <= 5.5; x += 2.5) for (let z = -3; z <= 3.5; z += 2.2) {
    const ring = new THREE.Mesh(new THREE.RingGeometry(0.055, 0.07, 24), mats.blackSteel); ring.rotation.x = Math.PI / 2; ring.position.set(x, H - 0.002, z);
    const disc = new THREE.Mesh(new THREE.CircleGeometry(0.055, 24), glow("#fff3e2", 1.8)); disc.rotation.x = Math.PI / 2; disc.position.set(x, H - 0.003, z);
    room.add(ring, disc);
  }
  room.add(trackLight(-4.6, -2.2, -3.2, [-4.1, -3.4, -2.7]), trackLight(0.2, 2.6, -3.3, [0.6, 1.3, 2.0]));

  // Stairwell shaft above the opening
  const shaftMat = new THREE.MeshStandardMaterial({ color: "#cfc9be", roughness: 0.95 });
  const sw = STAIR.x1 - STAIR.x0, sd = ROOM.z1 - STAIR.zBottom;
  const shaftIn = plane(sd, 3, shaftMat); shaftIn.rotation.y = -Math.PI / 2; shaftIn.position.set(STAIR.x1, H + 1.5, (STAIR.zBottom + ROOM.z1) / 2);
  const shaftEnd = plane(sw, 3, shaftMat); shaftEnd.position.set((STAIR.x0 + STAIR.x1) / 2, H + 1.5, STAIR.zBottom);
  const shaftTop = plane(sw, sd, shaftMat); shaftTop.rotation.x = Math.PI / 2; shaftTop.position.set((STAIR.x0 + STAIR.x1) / 2, H + 3, (STAIR.zBottom + ROOM.z1) / 2);
  room.add(shaftIn, shaftEnd, shaftTop);

  // ---------- Oak stairs with a glass balustrade ----------
  const rise = H / STAIR.steps, run = (STAIR.zTop - STAIR.zBottom) / STAIR.steps;
  const stepBody = new THREE.MeshStandardMaterial({ color: "#e2dcd1", roughness: 0.9 });
  for (let i = 0; i < STAIR.steps; i++) {
    const hgt = (i + 1) * rise, cz = STAIR.zBottom + (i + 0.5) * run;
    const s = box(sw, hgt - 0.04, run, stepBody); s.position.set((STAIR.x0 + STAIR.x1) / 2, (hgt - 0.04) / 2, cz);
    const tread = box(sw, 0.04, run + 0.02, mats.oak); tread.position.set((STAIR.x0 + STAIR.x1) / 2, hgt - 0.02, cz + 0.01);
    room.add(s, tread);
  }
  const glassMat = new THREE.MeshPhysicalMaterial({ color: "#dfe8e6", transparent: true, opacity: 0.18, roughness: 0.05, metalness: 0, side: THREE.DoubleSide, depthWrite: false });
  const slope = Math.atan2(H, STAIR.zTop - STAIR.zBottom), len = Math.hypot(H, STAIR.zTop - STAIR.zBottom);
  const pane = new THREE.Mesh(new THREE.PlaneGeometry(len, 0.9), glassMat);
  pane.rotation.set(0, -Math.PI / 2, -slope); pane.position.set(STAIR.x1 + 0.02, H / 2 + 0.5, (STAIR.zBottom + STAIR.zTop) / 2);
  const rail = cyl(0.02, 0.02, len, mats.blackSteel, 10); rail.rotation.x = Math.PI / 2 - slope; rail.position.set(STAIR.x1 + 0.02, H / 2 + 0.97, (STAIR.zBottom + STAIR.zTop) / 2);
  room.add(pane, rail);

  // ---------- Brand wall: grey plaster, oak slats, neon sign ----------
  const brand = new THREE.Group(); brand.position.set(-1.25, 0, ROOM.z0 + 0.01);
  const greyPanel = plane(2.6, H, A.surface("grey_plaster", 1.3, 1.6, { color: "#8b8680", metalness: 0 })); greyPanel.position.set(0, H / 2, 0.002);
  brand.add(greyPanel);
  const oakSlat = A.surface("white_oak_veneer", 0.12, 1.4, { color: "#c4976c", metalness: 0 });
  for (let i = 0; i < 9; i++) { const sl = box(0.045, H - 0.12, 0.035, oakSlat); sl.position.set(-1.3 + 0.07 + i * 0.075, H / 2, 0.02); brand.add(sl); }
  const neon = new THREE.Group(); neon.position.set(0.35, 1.95, 0.05);
  const tubeGeo = new THREE.CapsuleGeometry(0.035, 0.34, 8, 16);
  const neonA = new THREE.Mesh(tubeGeo, glow("#fff4e8", 2.2)); neonA.position.set(-0.36, 0, 0.02); neonA.rotation.z = -Math.PI / 6;
  const neonB = new THREE.Mesh(tubeGeo, glow("#ff3d1f", 2.6)); neonB.position.set(-0.18, 0, 0.02); neonB.rotation.z = -Math.PI / 6;
  const word = new Screen(1024, 256, 1.2, 0.3, (ctx, t, w, h) => {
    ctx.clearRect(0, 0, w, h);
    ctx.shadowColor = "rgba(255,255,255,.6)"; ctx.shadowBlur = 16;
    ctx.fillStyle = "#fbf6ee"; ctx.font = `600 170px ${FONT}`; ctx.textBaseline = "middle";
    ctx.fillText("Scyne", 8, 118);
  }, { brightness: 1.45, fps: 0 });
  word.material.transparent = true; word.mesh.position.set(0.4, 0.01, 0.02);
  neon.add(neonA, neonB, word.mesh);
  brand.add(neon);
  const neonLight = new THREE.PointLight("#ff6a48", 1.8, 3, 2); neonLight.position.set(0.2, 1.9, 0.5); brand.add(neonLight);
  room.add(brand);

  const win = cityWindow();
  room.add(win.group);

  // ---------- Lights ----------
  const spot = (color, intensity, pos, target, angle, castShadow) => {
    const s = new THREE.SpotLight(color, intensity, 9, angle, 0.7, 1.6);
    s.position.set(...pos); s.target.position.set(...target);
    s.castShadow = shadows && castShadow;
    if (s.castShadow) { s.shadow.mapSize.set(1024, 1024); s.shadow.bias = -0.0004; s.shadow.normalBias = 0.02; s.shadow.radius = 5; }
    room.add(s, s.target);
    return s;
  };
  spot("#ffe9cc", 16, [-6.4, 6.0, 5.6], [-6.4, 0, 1.0], 0.6, false);          // light down the stairs (no shadow map: one fewer for every shader)
  spot("#ffe7c8", 8, [-3.4, H - 0.25, -2.9], [-3.4, 0.7, -4.2], 0.85, true);  // design desk
  spot("#ffe7c8", 13, [1.9, H - 0.25, -2.6], [1.45, 0.75, -4.3], 0.8, true);   // automation desk
  spot("#fff0dc", 9, [-1.6, H - 0.1, 1.8], [-1.6, 0.7, 1.8], 0.95, true);     // meeting table
  spot("#ffe9d2", 7, [-1.2, H - 0.1, -3.6], [-1.2, 1.4, -5.0], 0.7, false);   // wash on the brand wall
  room.add(new THREE.HemisphereLight("#fff4e6", "#5a4a3c", 0.4));

  scene.add(room);

  return {
    group: room,
    update(t) {
      win.update(t);
      word.update(t);
      neonB.material.color.setRGB(1, 0.24, 0.12).multiplyScalar(2.4 + Math.sin(t * 2.1) * 0.15);
    },
  };
}
