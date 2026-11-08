/* Baked lighting.
   The studio's static surfaces are lit offline in Blender (Cycles: direct light, bounced light,
   soft shadows) instead of by real-time lights every frame. The pipeline:

   1. Dev: `await __studio.exportBake()` writes the assembled studio for Blender: static opaque
      meshes in world space (receivers, they get lightmaps), unlit glowing parts (emitters: screens,
      neon, lamps, the window), moving parts (occluders: they cast shadows but keep live lighting)
      and the lights. See tools/bake/README.md.
   2. Blender (tools/bake/bake.py) unwraps lightmap UVs, packs atlases, bakes, denoises, and exports
      the receivers' geometry with a second UV set plus the lightmap atlases; tools/bake/pack.mjs
      compresses them into public/bake/.
   3. Runtime: applyBake() swaps each receiver's geometry for its baked twin and gives it the
      shared studio material (albedo × lightmap, plus a reflection for glossy surfaces).
      Plants are "probes": dense organic meshes unwrap into thousands of tiny islands and are half
      the bake's geometry, so pack.mjs reduces each to its average baked light and drops its
      geometry from the download; it keeps its own mesh, lit by that one colour.

   Export and runtime pick receivers with the same rule, in the same order, after the same
   static merge, so receiver N here is receiver N in the bake. A fingerprint in the manifest
   catches a stale bake (the scene changed since it was baked): the studio then keeps live
   lighting instead of applying wrong lightmaps. */

import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { KTX2Loader } from "three/examples/jsm/loaders/KTX2Loader.js";
import { MeshoptDecoder } from "three/examples/jsm/libs/meshopt_decoder.module.js";
import { toFloat } from "./perf.js";
import { studioMaterial } from "./studio-material.js";
import { asset } from "../asset-url.js";

export const BAKE_URL = "/bake/";

/* What part a mesh plays in the bake: "receiver", "emitter", "occluder" or null (ignored) */
export function bakeRole(o) {
  // live: small parts lit in real time on purpose (the laptop keyboards), outside the bake
  if (!o.isMesh || !o.visible || o.userData.proxy || o.userData.live || o.isInstancedMesh) return null;
  const m = o.material;
  if (!m || Array.isArray(m) || m.visible === false) return null;
  let dynamic = false;
  for (let p = o; p; p = p.parent) if (p.userData.dynamic) { dynamic = true; break; }
  if (m.isMeshBasicMaterial || m.isShaderMaterial) {
    if (dynamic) return null;
    return !m.transparent || m.userData.screen ? "emitter" : null;
  }
  if (m.transparent && m.opacity < 0.95) return null; // glass: light passes through
  if (dynamic || o.isSkinnedMesh) return "occluder";
  return "receiver";
}

/* Every mesh with a bake role, in a stable order */
export function collectBake(scene) {
  const out = { receiver: [], emitter: [], occluder: [] };
  scene.updateMatrixWorld(true);
  scene.traverse((o) => { const r = bakeRole(o); if (r) out[r].push(o); });
  return out;
}

const triCount = (g) => (g.index ? g.index.count : g.attributes.position.count) / 3;

/* A short fingerprint of the receivers (count and triangles), to recognise a stale bake */
export function fingerprint(receivers) {
  let h = receivers.length;
  for (const o of receivers) h = (h * 31 + triCount(o.geometry)) % 1000000007;
  return `${receivers.length}:${h}`;
}

/* Download the bake: manifest, receiver geometry (meshopt) and lightmap atlases (KTX2).
   Resolves to null when there is no bake. */
export async function loadBake(renderer) {
  const res = await fetch(asset(`${BAKE_URL}bake.json`)).catch(() => null);
  if (!res || !res.ok) return null;
  const manifest = await res.json();
  const ktx2 = new KTX2Loader().setTranscoderPath("/basis/").detectSupport(renderer);
  const [gltf, ...lightmaps] = await Promise.all([
    new GLTFLoader().setMeshoptDecoder(MeshoptDecoder).loadAsync(asset(`${BAKE_URL}studio-bake.glb`)),
    ...manifest.atlases.map((a) => ktx2.loadAsync(asset(`${BAKE_URL}${a.file}.ktx2`))),
  ]);
  ktx2.dispose();
  for (const t of lightmaps) { t.channel = 1; t.anisotropy = 4; }
  const geometries = new Map();
  gltf.scene.updateMatrixWorld(true);
  gltf.scene.traverse((o) => {
    // quantized geometry carries its scale in the node transform: fold it into float positions
    if (o.isMesh) geometries.set(o.name, toFloat(o.geometry.clone()).applyMatrix4(o.matrixWorld));
  });
  return { manifest, geometries, lightmaps };
}

/* Put the bake on the scene. env: { texture, intensity, maxLod } for reflections.
   Returns false (and changes nothing) when the bake doesn't match this scene. */
export function applyBake(scene, bake, env) {
  const { receiver } = collectBake(scene);
  const fp = fingerprint(receiver);
  if (fp !== bake.manifest.fingerprint) {
    console.warn(`[scyne] the lighting bake is stale (scene ${fp}, bake ${bake.manifest.fingerprint}): using live lighting. Re-bake, see tools/bake/README.md.`);
    return false;
  }
  const inv = new THREE.Matrix4();
  const materials = new Map(); // one studio material per (source material, atlas)
  const probes = bake.manifest.probes || {};
  receiver.forEach((o, i) => {
    const name = `R_${i}`;
    if (probes[name]) {
      // a probe-lit receiver (plants): its own geometry, one baked light colour for all of it
      const key = `${o.material.uuid}:p:${probes[name].join(",")}`;
      if (!materials.has(key)) materials.set(key, studioMaterial(o.material, null, 1, env, new THREE.Color().fromArray(probes[name])));
      o.material = materials.get(key);
      o.castShadow = false; o.receiveShadow = false;
      return;
    }
    const k = bake.manifest.receivers[name], g = bake.geometries.get(name);
    if (g === undefined || k === undefined) return;
    // the baked twin is in world space: bring it into the mesh's own space (in place: no copies)
    g.applyMatrix4(inv.copy(o.matrixWorld).invert());
    g.computeBoundingSphere();
    o.geometry.dispose(); o.geometry = g;
    const key = `${o.material.uuid}:${k}`;
    if (!materials.has(key)) materials.set(key, studioMaterial(o.material, bake.lightmaps[k], bake.manifest.atlases[k].range, env));
    o.material = materials.get(key);
    o.castShadow = false; o.receiveShadow = false;
  });
  bake.geometries.clear(); // the meshes own them now; nothing else should keep them alive
  return true;
}
