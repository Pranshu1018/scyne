/* Shared building blocks: materials, glowing parts, live screens and TVs. */

import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";

export const mats = {
  oak: new THREE.MeshStandardMaterial({ color: "#b38a5e", roughness: 0.55, metalness: 0 }),
  blackSteel: new THREE.MeshStandardMaterial({ color: "#151517", roughness: 0.45, metalness: 0.75 }),
  matteWhite: new THREE.MeshStandardMaterial({ color: "#ece8e1", roughness: 0.45, metalness: 0 }),
  steel: new THREE.MeshStandardMaterial({ color: "#3a3b3f", roughness: 0.42, metalness: 0.85 }),
  darkSteel: new THREE.MeshStandardMaterial({ color: "#1b1c1f", roughness: 0.55, metalness: 0.7 }),
  blackPlastic: new THREE.MeshStandardMaterial({ color: "#0d0d0f", roughness: 0.45, metalness: 0.1 }),
  paintedRed: new THREE.MeshStandardMaterial({ color: "#a3200f", roughness: 0.5, metalness: 0.3 }),
  galvanised: new THREE.MeshStandardMaterial({ color: "#7d8084", roughness: 0.35, metalness: 0.9 }),
  rubber: new THREE.MeshStandardMaterial({ color: "#111113", roughness: 0.9, metalness: 0 }),
  fabric: new THREE.MeshStandardMaterial({ color: "#2a2a2e", roughness: 0.95, metalness: 0 }),
  concrete: new THREE.MeshStandardMaterial({ color: "#6b6a66", roughness: 0.9, metalness: 0 }),
};

/* Unlit, over-bright colours: the bloom pass turns these into light sources. */
export function glow(color, strength = 2) {
  const m = new THREE.MeshBasicMaterial({ color: new THREE.Color(color).multiplyScalar(strength), toneMapped: false });
  m.userData.glow = true;
  return m;
}

export function box(w, h, d, mat, r = 0) {
  const geo = r > 0 ? new RoundedBoxGeometry(w, h, d, 2, Math.min(r, w / 2, h / 2, d / 2)) : new THREE.BoxGeometry(w, h, d);
  const m = new THREE.Mesh(geo, mat);
  m.castShadow = true; m.receiveShadow = true;
  return m;
}
export function cyl(rt, rb, h, mat, seg = 24) {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), mat);
  m.castShadow = true; m.receiveShadow = true;
  return m;
}

/* A live screen: a canvas texture redrawn ~24 times a second by draw(ctx, t, w, h). */
export class Screen {
  constructor(width, height, worldW, worldH, draw, { brightness = 0.85, fps = 12, res = 1 } = {}) {
    // Keep full source resolution on desktop so the UI stays legible on the wall displays.
    // Phones retain each screen's smaller upload scale to protect memory and fill rate.
    const screenRes = Math.min(window.innerWidth, window.innerHeight) < 700 ? res : 1;
    this.canvas = document.createElement("canvas");
    this.canvas.width = Math.round(width * screenRes); this.canvas.height = Math.round(height * screenRes);
    this.w = width; this.h = height; this.res = screenRes;
    // a CPU-side canvas: turning it into a texture is a plain upload, not a slow read back from the GPU
    this.ctx = this.canvas.getContext("2d", { willReadFrequently: true });
    this.texture = new THREE.CanvasTexture(this.canvas);
    this.texture.colorSpace = THREE.SRGBColorSpace;
    this.texture.anisotropy = 4;
    this.texture.generateMipmaps = false; // re-uploaded often; skip rebuilding mipmaps each time
    this.texture.minFilter = THREE.LinearFilter;
    this.interval = fps > 0 ? 1 / fps : Infinity;
    this.draw = draw;
    this.material = new THREE.MeshBasicMaterial({ map: this.texture, toneMapped: false, color: new THREE.Color(1, 1, 1).multiplyScalar(brightness) });
    this.material.userData.screen = true;
    this.mesh = new THREE.Mesh(new THREE.PlaneGeometry(worldW, worldH), this.material);
    this.last = -Infinity;
  }
  /* Uploading a canvas to the GPU is the expensive part, so only a few screens may redraw in
     any one frame; a screen that misses its turn simply redraws on the next frame. This keeps
     every frame about the same cost instead of spiking when several screens are due together. */
  static beginFrame(budget = 2) { Screen.left = budget; }
  update(t) {
    if (this.last !== -Infinity && t >= this.last && t - this.last < this.interval) return;
    if (Screen.left <= 0 && this.last !== -Infinity) return;
    Screen.left--;
    this.last = t;
    this.ctx.setTransform(this.res, 0, 0, this.res, 0, 0);
    this.draw(this.ctx, t, this.w, this.h);
    this.texture.needsUpdate = true;
  }
}

Screen.left = Infinity;

/* A thin-bezel display (monitor or TV) with a live screen and a soft light it casts into the room. */
export function display(w, h, draw, { depth = 0.04, bezel = 0.012, px = 1024, light = 0, brightness = 0.85, fps = 12, res = 1 } = {}) {
  const g = new THREE.Group();
  const body = box(w + bezel * 2, h + bezel * 2, depth, mats.blackPlastic, 0.006);
  const screen = new Screen(px, Math.round((px * h) / w), w, h, draw, { brightness, fps, res });
  screen.mesh.position.z = depth / 2 + 0.001;
  g.add(body, screen.mesh);
  if (light > 0) {
    const l = new THREE.RectAreaLight("#cfdcf0", light, w, h);
    l.position.z = depth / 2 + 0.01;
    l.rotation.y = Math.PI; // RectAreaLight shines along -z; flip to face out of the screen
    g.add(l);
  }
  return { group: g, screen };
}

/* 2D drawing helpers for screens */
export function rr(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}
export const FONT = '"Geist", "Helvetica Neue", Arial, sans-serif';
export const MONO = '"Geist Mono", ui-monospace, Menlo, monospace';
export const ease = (x) => 1 - Math.pow(1 - Math.min(1, Math.max(0, x)), 3);
