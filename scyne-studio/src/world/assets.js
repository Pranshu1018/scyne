/* Loads the CC0 Poly Haven models and textures used in the studio (no lighting map: the room
   lights itself, see the cube capture in studio.js).
   Progress is reported as real bytes-ish (files loaded / files total) for the loader counter. */

import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { MeshoptDecoder } from "three/examples/jsm/libs/meshopt_decoder.module.js";

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

export function loadAssets(renderer, onProgress) {
  const manager = new THREE.LoadingManager();
  manager.onProgress = (_, loaded, total) => onProgress && onProgress(loaded / total);
  const gltf = new GLTFLoader(manager).setMeshoptDecoder(MeshoptDecoder);
  const tex = new THREE.TextureLoader(manager);
  const maxAniso = renderer.capabilities.getMaxAnisotropy();

  const models = {};
  const textures = {};
  const jobs = [];

  for (const id of MODELS) {
    jobs.push(gltf.loadAsync(`/models/${id}.glb`).then((g) => {
      g.scene.traverse((o) => {
        if (o.isMesh) {
          o.castShadow = true; o.receiveShadow = true;
          const m = o.material;
          if (m && m.map) m.map.anisotropy = Math.min(8, maxAniso);
        }
      });
      models[id] = g.scene;
    }));
  }
  for (const id of TEXTURES) {
    const set = {};
    for (const map of ["Diffuse", "nor_gl", "arm"]) {
      jobs.push(tex.loadAsync(`/textures/${id}_${map}.webp`).then((t) => {
        t.wrapS = t.wrapT = THREE.RepeatWrapping;
        t.anisotropy = Math.min(8, maxAniso);
        if (map === "Diffuse") t.colorSpace = THREE.SRGBColorSpace;
        set[map] = t;
      }));
    }
    textures[id] = set;
  }

  return Promise.all(jobs).then(() => ({
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
      return new THREE.MeshStandardMaterial({
        map: clone(s.Diffuse), normalMap: clone(s.nor_gl), roughnessMap: clone(s.arm), metalnessMap: clone(s.arm), aoMap: clone(s.arm),
        roughness: 1, metalness: 1, ...extra,
      });
    },
  }));
}
