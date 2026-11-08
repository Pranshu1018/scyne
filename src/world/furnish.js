/* Furniture that isn't a station: the oak meeting table with armchairs and pendants,
   and a few pieces along the walls (display shelves, steel shelving, plants). */

import * as THREE from "three";
import { mats, glow, box } from "./kit.js";
import { oakTable } from "./stations/web.js";

export function buildFurnish(scene, A) {
  const g = new THREE.Group();

  // meeting table
  const meet = new THREE.Group(); meet.position.set(-1.6, 0, 1.8);
  meet.add(oakTable(A, 2.2, 0.95, 0.74, 0.12));
  [[-0.55, 0.75, 180], [0.55, 0.75, 180], [-0.55, -0.75, 0], [0.55, -0.75, 0]].forEach(([x, z, r]) => meet.add(A.place("modern_arm_chair_01", x, 0, z, r, 0.95)));
  // a laptop, notebooks, mugs and a plant on the table
  const lap = new THREE.Group(); lap.position.set(0.45, 0.74, -0.12); lap.rotation.y = 0.3;
  const base = box(0.31, 0.012, 0.22, new THREE.MeshStandardMaterial({ color: "#b9bcc2", roughness: 0.35, metalness: 0.8 }), 0.004); base.position.y = 0.006;
  const lid = box(0.31, 0.2, 0.008, new THREE.MeshStandardMaterial({ color: "#b9bcc2", roughness: 0.35, metalness: 0.8 }), 0.004); lid.position.set(0, 0.105, -0.115); lid.rotation.x = -0.25;
  const scr = new THREE.Mesh(new THREE.PlaneGeometry(0.28, 0.17), glow("#dbe4f2", 0.55)); scr.position.set(0, 0.105, -0.109); scr.rotation.x = -0.25;
  lap.add(base, lid, scr); meet.add(lap);
  const notebook = box(0.2, 0.012, 0.27, new THREE.MeshStandardMaterial({ color: "#1d1d20", roughness: 0.8 }), 0.003); notebook.position.set(-0.6, 0.746, 0.15); notebook.rotation.y = -0.2; meet.add(notebook);
  const mugMat = new THREE.MeshStandardMaterial({ color: "#d9cfc0", roughness: 0.35 });
  [[-0.2, 0.25], [0.85, 0.2]].forEach(([x, z]) => { const m = new THREE.Mesh(new THREE.CylinderGeometry(0.042, 0.038, 0.095, 20), mugMat); m.position.set(x, 0.79, z); m.castShadow = true; meet.add(m); });
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
