/* Dev only: writes the studio out for the Blender bake (see bake.js and tools/bake/README.md).
   Geometry goes out in world space. Receivers carry a flat colour (the average of their texture:
   enough for bounced light to pick up the right tint) and keep their texture only when it cuts
   out a shape (leaves). Emitters carry their actual picture, so screens and the window light the
   room with their own colours. */

import * as THREE from "three";
import { GLTFExporter } from "three/examples/jsm/exporters/GLTFExporter.js";
import { collectBake, fingerprint } from "./bake.js";

const averages = new Map();
function averageColor(tex) {
  const img = tex.image, key = tex.source ? tex.source.uuid : tex.uuid;
  if (averages.has(key)) return averages.get(key);
  const c = new THREE.Color(1, 1, 1);
  try {
    const cv = document.createElement("canvas"); cv.width = cv.height = 8;
    const ctx = cv.getContext("2d", { willReadFrequently: true });
    ctx.drawImage(img, 0, 0, 8, 8);
    const d = ctx.getImageData(0, 0, 8, 8).data;
    let r = 0, g = 0, b = 0;
    for (let i = 0; i < d.length; i += 4) { r += d[i]; g += d[i + 1]; b += d[i + 2]; }
    c.setRGB(r / 64 / 255, g / 64 / 255, b / 64 / 255, THREE.SRGBColorSpace);
  } catch { /* unreadable image: stay white */ }
  averages.set(key, c);
  return c;
}

/* A plain copy of the mesh in world space: position, normal, uv only (skinned meshes posed) */
function worldGeometry(o) {
  const src = o.geometry, n = src.attributes.position.count, v = new THREE.Vector3();
  const g = new THREE.BufferGeometry();
  const pos = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    if (o.isSkinnedMesh) o.getVertexPosition(i, v); else v.fromBufferAttribute(src.attributes.position, i);
    v.applyMatrix4(o.matrixWorld).toArray(pos, i * 3);
  }
  g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  if (src.attributes.uv) {
    const uv = new Float32Array(n * 2), a = src.attributes.uv;
    for (let i = 0; i < n; i++) { uv[i * 2] = a.getX(i); uv[i * 2 + 1] = a.getY(i); }
    g.setAttribute("uv", new THREE.BufferAttribute(uv, 2));
  }
  if (src.index) g.setIndex(Array.from(src.index.array));
  // a mirrored transform turns the triangles inside out: put the winding back
  if (o.matrixWorld.determinant() < 0) {
    if (!g.index) g.setIndex(Array.from({ length: n }, (_, i) => i));
    const idx = g.index.array;
    for (let i = 0; i < idx.length; i += 3) { const t = idx[i]; idx[i] = idx[i + 2]; idx[i + 2] = t; }
  }
  g.computeVertexNormals();
  return g;
}

function area(g) {
  const p = g.attributes.position, a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3();
  const idx = g.index ? g.index.array : null, count = idx ? idx.length : p.count;
  let s = 0;
  for (let i = 0; i < count; i += 3) {
    a.fromBufferAttribute(p, idx ? idx[i] : i); b.fromBufferAttribute(p, idx ? idx[i + 1] : i + 1); c.fromBufferAttribute(p, idx ? idx[i + 2] : i + 2);
    s += b.sub(a).cross(c.sub(a)).length() / 2;
  }
  return s;
}

function lightData(l) {
  const p = new THREE.Vector3(), q = new THREE.Quaternion();
  l.getWorldPosition(p); l.getWorldQuaternion(q);
  const base = { type: l.type, name: l.name, color: l.color.toArray(), intensity: l.intensity, position: p.toArray() };
  if (l.isSpotLight) return { ...base, target: l.target.getWorldPosition(new THREE.Vector3()).toArray(), angle: l.angle, penumbra: l.penumbra, distance: l.distance, decay: l.decay };
  if (l.isPointLight) return { ...base, distance: l.distance, decay: l.decay };
  if (l.isRectAreaLight) return { ...base, width: l.width, height: l.height, quaternion: q.toArray() };
  if (l.isHemisphereLight) return { ...base, groundColor: l.groundColor.toArray() };
  return base;
}

export async function exportBake(scene) {
  const { receiver, emitter, occluder } = collectBake(scene);
  const root = new THREE.Scene();
  const receivers = receiver.map((o, i) => {
    const m = o.material, g = worldGeometry(o);
    const color = m.color ? m.color.clone() : new THREE.Color(1, 1, 1);
    const mat = new THREE.MeshStandardMaterial({ name: `R_${i}`, roughness: m.roughness ?? 1, metalness: 0, side: m.side });
    if (m.alphaTest > 0 && m.map) { mat.map = m.map; mat.alphaTest = m.alphaTest; mat.color.copy(color); }
    else mat.color.copy(m.map ? color.multiply(averageColor(m.map)) : color);
    const mesh = new THREE.Mesh(g, mat); mesh.name = `R_${i}`; root.add(mesh);
    const src = [m.name, o.name, o.parent && o.parent.name].filter(Boolean).join(" / ") || m.type;
    return { name: mesh.name, src, alpha: m.alphaTest > 0, tris: (g.index ? g.index.count : g.attributes.position.count) / 3, area: +area(g).toFixed(4), metal: +(m.metalness ?? 0).toFixed(2), rough: +(m.roughness ?? 1).toFixed(2) };
  });
  emitter.forEach((o, i) => {
    const m = o.material, c = m.color.clone(), k = Math.max(c.r, c.g, c.b, 1e-4);
    const mat = new THREE.MeshStandardMaterial({ name: `E_${i}`, color: 0x000000, emissive: c.multiplyScalar(1 / k), emissiveIntensity: k, emissiveMap: m.map || null, side: m.side });
    // a see-through emitter (the neon sign is script on a clear canvas) needs its picture as base
    // colour too: glTF takes alpha from there, and without it the whole plane bakes as a solid
    // glowing board that shadows the wall behind it
    if (m.transparent && m.map) { mat.map = m.map; mat.alphaTest = 0.3; }
    const mesh = new THREE.Mesh(worldGeometry(o), mat); mesh.name = `E_${i}`; root.add(mesh);
  });
  occluder.forEach((o, i) => {
    const m = o.material, color = (m.color ? m.color.clone() : new THREE.Color(0.5, 0.5, 0.5));
    if (m.map) color.multiply(averageColor(m.map));
    const mesh = new THREE.Mesh(worldGeometry(o), new THREE.MeshStandardMaterial({ name: `O_${i}`, color, roughness: 1, side: m.side }));
    mesh.name = `O_${i}`; root.add(mesh);
  });
  const lights = [];
  scene.traverse((o) => { if (o.isLight && o.visible) lights.push(lightData(o)); });
  const glb = await new GLTFExporter().parseAsync(root, { binary: true, maxTextureSize: 256 });
  root.traverse((o) => { if (o.isMesh) { o.geometry.dispose(); o.material.dispose(); } });
  return { glb, manifest: { version: 1, fingerprint: fingerprint(receiver), receivers, emitters: emitter.length, occluders: occluder.length, lights } };
}
