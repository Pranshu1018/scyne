/* Real-world objects shared by the stations, modelled to true size: a space-grey laptop
   (unibody, real keys, glass display with a live screen), a phone, a glazed mug and a
   leather notebook with a pen. */

import * as THREE from "three";
import { box, Screen } from "./kit.js";

const anodised = new THREE.MeshPhysicalMaterial({ color: "#5d6065", roughness: 0.34, metalness: 1, clearcoat: 0.1, clearcoatRoughness: 0.4 });
const keyMat = new THREE.MeshStandardMaterial({ color: "#0f0f11", roughness: 0.62, metalness: 0 });
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

export function laptop(draw, { fps = 8, scale = 1, light = 0, res = 0.8 } = {}) {
  const g = new THREE.Group();
  const W = 0.304, D = 0.215, T = 0.0115;
  g.add(plate(W, D, T, 0.011, anodised));
  // keyboard: 6 rows of keys as one instanced mesh, set into the deck
  const keyGeo = new THREE.BoxGeometry(1, 0.0012, 1);
  const rows = [[14, 0.0118], [14, 0.0158], [14, 0.0158], [13, 0.0158], [12, 0.0158], [9, 0.0158]];
  const total = rows.reduce((n, r) => n + r[0], 0);
  const keys = new THREE.InstancedMesh(keyGeo, keyMat, total); keys.receiveShadow = true;
  const mtx = new THREE.Matrix4(), pitch = 0.0186, kbW = 14 * pitch;
  let k = 0, z = 0.0;
  rows.forEach(([n, h], ri) => {
    const space = ri === 5 ? pitch * 4.2 : 0; // the bottom row has a space bar
    const outer = (kbW - n * pitch - space) / 2; // leftover width goes to the outer keys
    let x = -kbW / 2;
    for (let i = 0; i < n; i++) {
      let kw = pitch - 0.0028;
      if (space && i === 4) kw += space;
      else if (i === 0 || i === n - 1) kw += outer;
      mtx.compose(new THREE.Vector3(x + kw / 2, T + 0.0006, -0.088 + z + h / 2), new THREE.Quaternion(), new THREE.Vector3(kw, 1, h));
      keys.setMatrixAt(k++, mtx);
      x += kw + 0.0028;
    }
    z += h + 0.0028;
  });
  g.add(keys);
  const pad = new THREE.Mesh(new THREE.PlaneGeometry(0.13, 0.08), new THREE.MeshPhysicalMaterial({ color: "#55585d", roughness: 0.22, metalness: 0.9, clearcoat: 0.6 }));
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

