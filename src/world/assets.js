/* Loads the CC0 Poly Haven models and textures used in the studio.
   Progress is reported as real bytes-ish (files loaded / files total) for the loader counter. */

import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { KTX2Loader } from "three/examples/jsm/loaders/KTX2Loader.js";
import { MeshoptDecoder } from "three/examples/jsm/libs/meshopt_decoder.module.js";
import { asset } from "../asset-url.js";

export const MODELS = [
  "mid_century_lounge_chair", "modern_arm_chair_01", "Ottoman_01", "coffee_table_round_01",
  "side_table_01", "steel_frame_shelves_03", "wooden_display_shelves_01",
  "modern_ceiling_lamp_01", "potted_plant_01", "potted_plant_02", "potted_plant_04", "desk_lamp_arm_01",
  "ceramic_vase_01", "ceramic_vase_02", "ceramic_vase_04", "standing_picture_frame_02",
  "book_encyclopedia_set_01", "wall_clock",
  "man", // Microsoft Rocketbox avatar (MIT), posed and converted for the automation desk
];
const TEXTURES = [
  "herringbone_parquet", "plastered_wall_02", "grey_plaster",
  "american_walnut_veneer", "white_oak_veneer", "poly_wool_herringbone", "fabric_leather_02",
];
// the moving desk chair (chair.js) is lit live, so its fabrics keep their normal maps even with the bake
const LIVE_NORMALS = ["poly_wool_herringbone", "fabric_leather_02"];

/* normals: false skips the room's normal maps. With baked lighting the room surfaces are drawn
   by the studio material, which does not use them (the bake has the light and shade); if the bake
   then cannot be applied, loadNormals() fetches them after all. */
export function loadAssets(renderer, onProgress, { normals = true } = {}) {
  const manager = new THREE.LoadingManager();
  manager.onProgress = (_, loaded, total) => onProgress && onProgress(loaded / total);
  // Textures come as KTX2 (Basis Universal: they stay compressed on the GPU, see
  // tools/compress-textures.mjs). The WebP/plain-GLB files remain as a fallback.
  const ktx2 = new KTX2Loader(manager).setTranscoderPath("/basis/").detectSupport(renderer);
  const gltf = new GLTFLoader(manager).setMeshoptDecoder(MeshoptDecoder).setKTX2Loader(ktx2);
  const tex = new THREE.TextureLoader(manager);
  const either = (load, a, b) => load.loadAsync(a).catch(() => load.loadAsync(b));
  const maxAniso = renderer.capabilities.getMaxAnisotropy();

  const models = {};
  const textures = {};
  const jobs = [];
  const made = []; // [material, texture set id, repeat x, repeat y] from surface(), for loadNormals()
  const prep = (t) => { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = Math.min(8, maxAniso); return t; };


  for (const id of MODELS) {
    // (man-hd.glb, a 2K-texture copy of the man, loads with broken materials: not used)
    const preferred = asset(`/models/${id}.ktx2.glb`);
    const fallback = asset(`/models/${id}.glb`);
    jobs.push(either(gltf, preferred, fallback).then((g) => {
      g.scene.traverse((o) => {
        if (o.isMesh) {
          o.castShadow = true; o.receiveShadow = true;
          const m = o.material;
          // GLTF wood, leather and fabric often rely on normal/roughness maps as much as
          // their albedo. Filter every texture at grazing angles, not just the color map.
          for (const material of (Array.isArray(m) ? m : [m])) {
            if (!material) continue;
            // refraction (transmission) makes three.js draw the whole opaque scene a second time,
            // every frame, for the wall clock's cover glass: plain see-through glass looks the same there
            if (material.transmission > 0) { material.transmission = 0; material.transparent = true; material.opacity = Math.min(material.opacity, 0.25); material.depthWrite = false; }
            for (const key of Object.keys(material)) {
              const texture = material[key];
              if (texture?.isTexture) texture.anisotropy = Math.min(8, maxAniso);
            }
          }
        }
      });
      models[id] = g.scene;
    }));
  }
  for (const id of TEXTURES) {
    const set = {};
    // colour and roughness/metal/AO as KTX2 (WebP fallback); normal maps stay WebP: as UASTC
    // KTX2 they were 9× the download (4.4 MB vs 0.5 MB) and the bake does not need them
    for (const map of normals || LIVE_NORMALS.includes(id) ? ["Diffuse", "nor_gl", "arm"] : ["Diffuse", "arm"]) {
      const load = map === "nor_gl" ? tex.loadAsync(asset(`/textures/${id}_${map}.webp`))
        : ktx2.loadAsync(asset(`/textures/${id}_${map}.ktx2`)).catch(() => tex.loadAsync(asset(`/textures/${id}_${map}.webp`)));
      jobs.push(load.then((t) => {
        prep(t);
        if (map === "Diffuse") t.colorSpace = THREE.SRGBColorSpace;
        set[map] = t;
      }));
    }
    textures[id] = set;
  }

  return Promise.all(jobs).then(() => (ktx2.dispose(), {
    models,
    textures,
    /* A fresh copy of a model, placed and rotated (degrees), optionally scaled */
    place(id, x, y, z, rotY = 0, scale = 1) {
      const o = models[id].clone(true);
      o.position.set(x, y, z);
      o.rotation.y = THREE.MathUtils.degToRad(rotY);
      o.scale.setScalar(scale);
      return o;
    },
    /* PBR material from one of the texture sets, repeated rx × ry */
    surface(id, rx, ry, extra = {}) {
      const s = textures[id];
      const clone = (t) => { const c = t.clone(); c.repeat.set(rx, ry); c.needsUpdate = true; return c; };
      const m = new THREE.MeshStandardMaterial({
        map: clone(s.Diffuse), normalMap: s.nor_gl ? clone(s.nor_gl) : null, roughnessMap: clone(s.arm), metalnessMap: clone(s.arm), aoMap: clone(s.arm),
        roughness: 1, metalness: 1, ...extra,
      });
      made.push([m, id, rx, ry]);
      return m;
    },
    /* The room's normal maps, when loadAssets() skipped them and they turn out to be needed */
    loadNormals() {
      const loader = new THREE.TextureLoader();
      const want = [...new Set(made.filter(([m]) => !m.normalMap).map(([, id]) => id))];
      return Promise.all(want.map((id) => loader.loadAsync(asset(`/textures/${id}_nor_gl.webp`)).then((t) => { textures[id].nor_gl = prep(t); })))
        .then(() => {
          for (const [m, id, rx, ry] of made) {
            if (m.normalMap || !textures[id].nor_gl) continue;
            m.normalMap = textures[id].nor_gl.clone(); m.normalMap.repeat.set(rx, ry); m.normalMap.needsUpdate = true;
            m.needsUpdate = true;
          }
        });
    },
  }));
}
