/* Exit · Contact
   An oak door in the right-hand wall, standing open onto a warmly lit meeting room,
   with "Let's talk" in red neon script above it. */

import * as THREE from "three";
import { mats, glow, box, Screen, FONT } from "../kit.js";

export function buildDoor(A) {
  const g = new THREE.Group();
  g.position.set(6.99, 0, 3.7);
  g.rotation.y = -Math.PI / 2;

  const W = 0.95, H = 2.2, T = 0.05;
  const jambL = box(T, H + T, 0.12, mats.blackSteel); jambL.position.set(-W / 2 - T / 2, (H + T) / 2, 0);
  const jambR = jambL.clone(); jambR.position.x = W / 2 + T / 2;
  const head = box(W + 2 * T, T, 0.12, mats.blackSteel); head.position.set(0, H + T / 2, 0);
  g.add(jambL, jambR, head);
  // warm light beyond the opening
  // a warmly lit room beyond: brighter near the top, a floor and a table edge for depth
  const bc = document.createElement("canvas"); bc.width = 256; bc.height = 600;
  const b2 = bc.getContext("2d");
  const grd = b2.createLinearGradient(0, 0, 0, 600);
  grd.addColorStop(0, "#fff1dc"); grd.addColorStop(0.62, "#f2c79a"); grd.addColorStop(0.63, "#b98a5e"); grd.addColorStop(1, "#8a6040");
  b2.fillStyle = grd; b2.fillRect(0, 0, 256, 600);
  b2.fillStyle = "rgba(60,40,25,.55)"; b2.fillRect(90, 330, 166, 26); b2.fillRect(110, 356, 10, 120); b2.fillRect(236, 356, 10, 120);
  const bt = new THREE.CanvasTexture(bc); bt.colorSpace = THREE.SRGBColorSpace;
  const beyond = new THREE.Mesh(new THREE.PlaneGeometry(W, H), new THREE.MeshBasicMaterial({ map: bt, toneMapped: false, color: new THREE.Color(0.62, 0.6, 0.58) }));
  beyond.position.set(0, H / 2, 0.012);
  g.add(beyond);
  // oak door leaf, swung open into the room
  const hinge = new THREE.Group(); hinge.position.set(W / 2, 0, 0.05);
  const leaf = box(W, H, 0.045, A.surface("white_oak_veneer", 0.5, 1.1, { color: "#c4976c", metalness: 0 })); leaf.position.set(-W / 2, H / 2, 0);
  const handle = box(0.02, 0.3, 0.03, mats.blackSteel); handle.position.set(-W + 0.08, 1.05, 0.04);
  hinge.add(leaf, handle); hinge.rotation.y = 1.15;
  g.add(hinge);
  // neon script above: drawn once (the glow blur is costly), the flicker is just the material fading.
  // Filled letters only, never outlined: the font's letters are built from overlapping shapes and an
  // outline would trace every overlap. A soft halo, the red glass, then a white-hot core that is
  // brightest down the middle of each stroke (a blurred copy of the letters, masked to them).
  const sign = new Screen(2048, 512, 1.3, 0.325, (ctx, t, w, h) => {
    ctx.clearRect(0, 0, w, h);
    const font = `italic 600 300px ${FONT}`, y = h / 2 + 10, word = "Let's talk";
    ctx.font = font; ctx.textBaseline = "middle"; ctx.textAlign = "center";
    ctx.shadowColor = "rgba(255,40,15,1)"; ctx.shadowBlur = 30; ctx.fillStyle = "#ff2a10";
    ctx.fillText(word, w / 2, y); // halo
    ctx.shadowBlur = 0; ctx.fillStyle = "#ff3c1e";
    ctx.fillText(word, w / 2, y); // the red glass
    const core = document.createElement("canvas"); core.width = w; core.height = h;
    const c = core.getContext("2d");
    c.font = font; c.textBaseline = "middle"; c.textAlign = "center";
    // the blur comes from a shadow cast back from far off-canvas: works in every browser
    c.shadowColor = "#ffe6dc"; c.shadowBlur = 12; c.shadowOffsetX = w * 2; c.fillStyle = "#ffe6dc";
    c.fillText(word, w / 2 - w * 2, y);
    c.shadowColor = "transparent"; c.globalCompositeOperation = "destination-in"; c.fillStyle = "#000";
    c.fillText(word, w / 2, y); // keep it inside the letters
    ctx.globalAlpha = 0.85; ctx.drawImage(core, 0, 0); ctx.globalAlpha = 1;
  }, { brightness: 1.6, fps: 0, res: 1 });
  sign.material.transparent = true;
  // the light below it baked a shadow of the letters onto the wall about 3 cm higher: the sign sits
  // over that shadow (seen from the tour), so the letters hide it
  sign.mesh.position.set(0, H + 0.529, 0.03);
  g.add(sign.mesh);

  const spill = new THREE.PointLight("#ffc890", 4, 5, 1.8); spill.position.set(0, 1.4, 0.8); g.add(spill);
  const redGlow = new THREE.PointLight("#ff4a2a", 1.2, 2.5, 2); redGlow.position.set(0, H + 0.5, 0.4); g.add(redGlow);
  g.add(A.place("potted_plant_02", -1.2, 0, 0.4, 20, 1.1));

  return { group: g, anchor: new THREE.Vector3(0, H + 1.0, 0.1), update: (t) => { sign.update(t); sign.material.opacity = (t % 7) > 6.7 && (t % 7) < 6.78 ? 0.35 : 1; } };
}
