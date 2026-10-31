/* Performance helpers.

   mergeStatic(root): everything under `root` that never moves is baked into one mesh per
   material. Hundreds of draw calls (beams, steps, rollers, every copy of a cardboard box…)
   become a few dozen. Anything inside a subtree flagged `userData.dynamic` is left alone. */

import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";

const GET = ["getX", "getY", "getZ", "getW"];

/* Quantized (meshopt) or interleaved attributes become plain float arrays, so they can be
   transformed and merged safely. */
function toFloat(geo) {
  for (const name of Object.keys(geo.attributes)) {
    const a = geo.attributes[name];
    if (a.isInterleavedBufferAttribute || !(a.array instanceof Float32Array) || a.normalized) {
      const out = new Float32Array(a.count * a.itemSize);
      for (let i = 0; i < a.count; i++) for (let c = 0; c < a.itemSize; c++) out[i * a.itemSize + c] = a[GET[c]](i);
      geo.setAttribute(name, new THREE.BufferAttribute(out, a.itemSize));
    }
  }
  if (geo.morphAttributes) geo.morphAttributes = {};
  return geo;
}

function isDynamic(o, root) {
  for (let p = o; p && p !== root; p = p.parent) if (p.userData.dynamic) return true;
  return false;
}

export function mergeStatic(root) {
  root.updateMatrixWorld(true);
  const inv = new THREE.Matrix4().copy(root.matrixWorld).invert();
  const local = new THREE.Matrix4();
  const buckets = new Map();

  root.traverse((o) => {
    if (!o.isMesh || o.isInstancedMesh || o.isSkinnedMesh || o.children.length) return;
    const m = o.material;
    if (!m || Array.isArray(m) || m.transparent || m.userData.screen || isDynamic(o, root)) return;
    const g = o.geometry;
    const key = [m.uuid, Object.keys(g.attributes).sort().join(","), g.index ? "i" : "n", o.castShadow, o.receiveShadow, local.multiplyMatrices(inv, o.matrixWorld).determinant() < 0].join("|");
    let b = buckets.get(key);
    if (!b) buckets.set(key, (b = { material: m, meshes: [], cast: o.castShadow, receive: o.receiveShadow }));
    b.meshes.push(o);
  });

  let removed = 0, added = 0;
  for (const b of buckets.values()) {
    if (b.meshes.length < 2) continue;
    const geos = b.meshes.map((o) => toFloat(o.geometry.clone()).applyMatrix4(local.multiplyMatrices(inv, o.matrixWorld)));
    // keep only attributes every geometry shares
    const common = Object.keys(geos[0].attributes).filter((n) => geos.every((g) => g.attributes[n] && g.attributes[n].itemSize === geos[0].attributes[n].itemSize));
    geos.forEach((g) => Object.keys(g.attributes).forEach((n) => { if (!common.includes(n)) g.deleteAttribute(n); }));
    const merged = mergeGeometries(geos, false);
    geos.forEach((g) => g.dispose());
    if (!merged) continue;
    merged.computeBoundingSphere();
    const mesh = new THREE.Mesh(merged, b.material);
    mesh.castShadow = b.cast; mesh.receiveShadow = b.receive;
    mesh.userData.merged = true;
    mesh.matrixAutoUpdate = false;
    root.add(mesh);
    for (const o of b.meshes) o.parent.remove(o);
    removed += b.meshes.length; added++;
  }
  return { removed, added };
}

/* An invisible box around a station, used for hover/click raycasts instead of every triangle. */
export function pickProxy(group, pad = 0.15) {
  group.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(group, true).expandByScalar(pad);
  const size = box.getSize(new THREE.Vector3()), center = box.getCenter(new THREE.Vector3());
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(size.x, size.y, size.z), new THREE.MeshBasicMaterial({ visible: false }));
  mesh.position.copy(center);
  mesh.userData.proxy = true;
  return mesh;
}
