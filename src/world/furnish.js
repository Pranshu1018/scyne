/* Furniture that isn't a station: the oak meeting table with armchairs and pendants,
   and a few pieces along the walls (display shelves, steel shelving, plants). */

import * as THREE from "three";
import { mats, glow, box, FONT, rr } from "./kit.js";
import { laptop, mug, live, contactShadow } from "./devices.js";
import { oakTable } from "./stations/web.js";

/* the laptop on the meeting table: a growth plan, as it would be presented to a client */
function drawPlan(ctx, t, w, h) {
  ctx.fillStyle = "#f4f1ea"; ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = "#121212"; ctx.font = `600 22px ${FONT}`; ctx.textBaseline = "middle";
  ctx.fillText("Scyne", 48, 44);
  ctx.fillStyle = "#8a867e"; ctx.font = `500 18px ${FONT}`; ctx.fillText("Growth plan · 12 weeks", w - 48 - ctx.measureText("Growth plan · 12 weeks").width, 44);
  ctx.fillStyle = "#121212"; ctx.font = `600 58px ${FONT}`;
  ctx.fillText("From 12 leads a month", 48, 140); ctx.fillText("to 74, in 12 weeks", 48, 206);
  const bars = [1, 1.7, 2.4, 3.1, 3.8, 4.3], bw = 62, x0 = 48, base = h - 70;
  bars.forEach((v, i) => {
    const bh = v * 58;
    rr(ctx, x0 + i * (bw + 22), base - bh, bw, bh, 8); ctx.fillStyle = i === bars.length - 1 ? "#ff3d1f" : "#d9d3c7"; ctx.fill();
  });
  ctx.fillStyle = "#121212"; ctx.font = `600 30px ${FONT}`; ctx.fillText("×6", x0 + 5 * (bw + 22) + 10, base - 4.3 * 58 - 24);
  ctx.fillStyle = "#8a867e"; ctx.font = `500 17px ${FONT}`; ctx.fillText("leads a month, from Google & Meta ads", x0, base + 34);
  rr(ctx, w - 330, h - 210, 282, 140, 18); ctx.fillStyle = "#121212"; ctx.fill();
  ctx.fillStyle = "#9a978f"; ctx.font = `500 17px ${FONT}`; ctx.fillText("New leads this week", w - 306, h - 172);
  ctx.fillStyle = "#3ddc84"; ctx.font = `600 50px ${FONT}`; ctx.fillText("19", w - 306, h - 118);
}

export function buildFurnish(scene, A) {
  const g = new THREE.Group();

  // meeting table
  const meet = new THREE.Group(); meet.position.set(-1.6, 0, 1.8);
  meet.add(oakTable(A, 2.2, 0.95, 0.74, 0.12));
  [[-0.55, 0.75, 180], [0.55, 0.75, 180], [-0.55, -0.75, 0], [0.55, -0.75, 0]].forEach(([x, z, r]) => meet.add(A.place("modern_arm_chair_01", x, 0, z, r, 0.95)));
  // a laptop, notebooks, mugs and a plant on the table
  // (the first, boxy laptop and the plain cylinders stay for the lighting bake to match, and are
  // hidden once it is applied: material.userData.retire, see studio.js)
  const retire = (m) => { m.userData.retire = true; return m; };
  const lap = new THREE.Group(); lap.position.set(0.45, 0.74, -0.12); lap.rotation.y = 0.3;
  const base = box(0.31, 0.012, 0.22, retire(new THREE.MeshStandardMaterial({ color: "#b9bcc2", roughness: 0.35, metalness: 0.8 })), 0.004); base.position.y = 0.006;
  const lid = box(0.31, 0.2, 0.008, retire(new THREE.MeshStandardMaterial({ color: "#b9bcc2", roughness: 0.35, metalness: 0.8 })), 0.004); lid.position.set(0, 0.105, -0.115); lid.rotation.x = -0.25;
  const scr = new THREE.Mesh(new THREE.PlaneGeometry(0.28, 0.17), retire(glow("#dbe4f2", 0.55))); scr.position.set(0, 0.105, -0.109); scr.rotation.x = -0.25;
  lap.add(base, lid, scr); meet.add(lap);
  // the real laptop in its place, open on the growth plan, lit live with a soft shadow under it
  const real = laptop(drawPlan, { fps: 0 });
  real.group.position.copy(lap.position); real.group.rotation.y = lap.rotation.y;
  real.group.add(contactShadow(0.36, 0.27, 0.5)); live(real.group);
  real.screen.update(0); // a still slide: drawn once
  meet.add(real.group);
  const notebook = box(0.2, 0.012, 0.27, new THREE.MeshStandardMaterial({ color: "#1d1d20", roughness: 0.8 }), 0.003); notebook.position.set(-0.6, 0.746, 0.15); notebook.rotation.y = -0.2; meet.add(notebook);
  const mugMat = retire(new THREE.MeshStandardMaterial({ color: "#d9cfc0", roughness: 0.35 }));
  [[-0.2, 0.25, 2.4], [0.85, 0.2, 0.9]].forEach(([x, z, r]) => {
    const m = new THREE.Mesh(new THREE.CylinderGeometry(0.042, 0.038, 0.095, 20), mugMat); m.position.set(x, 0.79, z); m.castShadow = true; meet.add(m);
    const cup = mug(); cup.position.set(x, 0.7425, z); cup.rotation.y = r; meet.add(cup);
  });
  meet.add(A.place("ceramic_vase_01", -0.05, 0.74, -0.05, 0, 0.7));
  [-0.55, 0.55].forEach((x) => meet.add(A.place("modern_ceiling_lamp_01", x, 3.2 - 1.17, 0)));
  g.add(meet);

  // along the walls
  g.add(A.place("wooden_display_shelves_01", -6.8, 0, -0.6, 0));
  g.add(A.place("ceramic_vase_02", -6.82, 1.52, -0.85, 0, 0.8));
  g.add(A.place("potted_plant_01", 6.5, 0, -1.4, 90, 1.05));
  g.add(A.place("potted_plant_02", -5.2, 0, 0.6, 140, 1.15));
  g.add(A.place("potted_plant_01", 6.4, 0, 4.6, 200, 0.95));

  scene.add(g);
  return g;
}
