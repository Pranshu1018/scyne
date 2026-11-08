/* The studio material: one small shader for every surface with baked lighting.
   colour = albedo × (1 − metalness) × lightmap (direct + bounced light and soft shadows, baked in Blender), plus,
   for glossy surfaces only, a reflection of the room taken from its baked panorama, blurred by
   roughness and faded where the room is dark. No real-time lights or shadow maps, so it costs a
   few texture reads per pixel and compiles once for the whole scene, a handful of variants at most.
   Fog and the output encoding match the built-in materials. */

import * as THREE from "three";

const vertexShader = /* glsl */ `
#include <common>
#include <fog_pars_vertex>
attribute vec2 uv1;
uniform mat3 mapTransform;
uniform mat3 armTransform;
varying vec2 vUv;
varying vec2 vUvArm;
varying vec2 vUv1;
varying vec3 vWorldPos;
varying vec3 vWorldNormal;
void main() {
  vUv = (mapTransform * vec3(uv, 1.0)).xy;
  vUvArm = (armTransform * vec3(uv, 1.0)).xy;
  vUv1 = uv1;
  vec4 wp = modelMatrix * vec4(position, 1.0);
  vWorldPos = wp.xyz;
  vWorldNormal = normalize(mat3(modelMatrix) * normal);
  vec4 mvPosition = viewMatrix * wp;
  gl_Position = projectionMatrix * mvPosition;
  #include <fog_vertex>
}`;

const fragmentShader = /* glsl */ `
#include <common>
#include <fog_pars_fragment>
uniform vec3 color;
uniform sampler2D map;
uniform sampler2D lightMap;
uniform vec3 probe;
uniform float lightMapScale;
uniform float lightMapIntensity;
uniform float lightMapSaturation;
uniform float roughness;
uniform float metalness;
uniform float alphaTest;
uniform sampler2D roughnessMap;
uniform sampler2D metalnessMap;
uniform vec3 emissive;
uniform sampler2D emissiveMap;
uniform sampler2D envMap;
uniform float envIntensity;
uniform float envMaxLod;
varying vec2 vUv;
varying vec2 vUv1;
varying vec2 vUvArm;
varying vec3 vWorldPos;
varying vec3 vWorldNormal;
void main() {
  // glTF packs roughness in green and metalness in blue; the factors scale them
  float rough = roughness;
  float metal = metalness;
  #ifdef USE_ROUGHNESSMAP
    rough *= texture2D(roughnessMap, vUvArm).g;
  #endif
  #ifdef USE_METALNESSMAP
    metal *= texture2D(metalnessMap, vUvArm).b;
  #endif
  vec4 albedo = vec4(color, 1.0);
  #ifdef USE_MAP
    albedo *= texture2D(map, vUv);
  #endif
  #ifdef USE_ALPHATEST
    if (albedo.a < alphaTest) discard;
  #endif
  #ifdef USE_PROBE
    vec3 light = probe * lightMapIntensity;
  #else
    vec3 light = texture2D(lightMap, vUv1).rgb * lightMapScale * lightMapIntensity;
  #endif
  // bounce light off the warm floor tints everything; pull it part way back to neutral
  light = mix(vec3(dot(light, vec3(0.2126, 0.7152, 0.0722))), light, lightMapSaturation);
  vec3 col = albedo.rgb * (1.0 - metal) * light;
  #ifdef USE_REFLECTION
    vec3 V = normalize(cameraPosition - vWorldPos);
    vec3 N = normalize(vWorldNormal) * (gl_FrontFacing ? 1.0 : -1.0);
    vec3 R = reflect(-V, N);
    vec3 env = textureLod(envMap, equirectUv(R), rough * envMaxLod).rgb * envIntensity;
    vec3 F0 = mix(vec3(0.04), albedo.rgb, metal);
    float fres = pow(1.0 - clamp(dot(N, V), 0.0, 1.0), 5.0);
    vec3 F = F0 + (max(vec3(1.0 - rough), F0) - F0) * fres;
    // a reflection is only as bright as the light around it: fade it in the shade
    float shade = clamp(dot(light, vec3(0.3333)) * 2.5, 0.0, 1.0);
    col += env * F * shade;
  #endif
  #ifdef USE_EMISSIVE
    vec3 glow = emissive;
    #ifdef USE_EMISSIVEMAP
      glow *= texture2D(emissiveMap, vUv).rgb;
    #endif
    col += glow;
  #endif
  gl_FragColor = vec4(col, albedo.a);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
  #include <fog_fragment>
}`;

/* Shared by every studio material, tuned once per bake: the overall lightmap strength and how
   much of its colour to keep (1 = as baked). Matched to the live-lit studio by comparing the mean
   colour of the same three camera stops with and without the bake (?nobake). */
export const lightMapIntensity = { value: 2.4 };
export const lightMapSaturation = { value: 0.7 };

/* Turn a surface's existing material (for its colour, texture, roughness, metalness, cut-outs)
   into a studio material lit by one lightmap atlas, or (probe, a linear colour) by one baked
   light value for the whole mesh */
export function studioMaterial(src, lightMap, scale, env, probe = null) {
  const map = src.map || null;
  if (map) map.updateMatrix();
  const rough = src.isMeshPhysicalMaterial && src.clearcoat > 0.2 ? Math.min(src.roughness ?? 1, src.clearcoatRoughness ?? 1) : src.roughness ?? 1;
  const metal = src.metalness ?? 0;
  const rmap = src.roughnessMap || null, mmap = src.metalnessMap || null, arm = rmap || mmap;
  if (arm) arm.updateMatrix();
  // with a map the factor is only an upper bound, so judge glossiness by the map being there
  const reflective = !!env && (rough < 0.75 || metal > 0.3 || !!arm);
  const glow = src.emissive && src.emissiveIntensity > 0 && src.emissive.getHex() !== 0 ? src.emissive.clone().multiplyScalar(src.emissiveIntensity) : null;
  const m = new THREE.ShaderMaterial({
    name: `studio:${src.name || src.type}`,
    vertexShader, fragmentShader,
    // only the fog uniforms go through merge(): it copies values, and it drops render-target
    // textures (the reflection panorama is one), so the textures are attached as they are
    uniforms: {
      ...THREE.UniformsUtils.clone(THREE.UniformsLib.fog),
      color: { value: src.color ? src.color.clone() : new THREE.Color(1, 1, 1) },
      map: { value: map },
      mapTransform: { value: map ? map.matrix : new THREE.Matrix3() },
      lightMap: { value: lightMap },
      probe: { value: probe || new THREE.Color(0, 0, 0) },
      lightMapScale: { value: scale },
      roughness: { value: rough },
      metalness: { value: metal },
      alphaTest: { value: src.alphaTest || 0 },
      roughnessMap: { value: rmap },
      metalnessMap: { value: mmap },
      armTransform: { value: arm ? arm.matrix : new THREE.Matrix3() },
      emissive: { value: glow || new THREE.Color(0, 0, 0) },
      emissiveMap: { value: src.emissiveMap || null },
      envMap: { value: env ? env.texture : null },
      envIntensity: { value: env ? env.intensity : 0 },
      envMaxLod: { value: env ? env.maxLod : 0 },
    },
    defines: {},
    fog: true,
    side: src.side,
  });
  // shared, not copied, so one change re-grades every surface
  m.uniforms.lightMapIntensity = lightMapIntensity;
  m.uniforms.lightMapSaturation = lightMapSaturation;
  if (map) m.defines.USE_MAP = "";
  if (src.alphaTest > 0) m.defines.USE_ALPHATEST = "";
  if (reflective) m.defines.USE_REFLECTION = "";
  if (probe) m.defines.USE_PROBE = "";
  if (rmap) m.defines.USE_ROUGHNESSMAP = "";
  if (mmap) m.defines.USE_METALNESSMAP = "";
  if (glow) m.defines.USE_EMISSIVE = "";
  if (glow && src.emissiveMap) m.defines.USE_EMISSIVEMAP = "";
  return m;
}
