/* The room's own reflections.
   Rendering the finished studio into a cube map is what makes chrome, glass, lacquer and the
   floor reflect the real walls and lamps, but doing it on arrival blocks the page for seconds
   on a phone. So it is baked once (in dev: `__studio.bakeEnv()`, see the README) into
   /env/room.webp: a 512 × 256 panorama stored as RGBE (8-bit colour with a shared exponent in the
   alpha channel, so the bright lamps keep their real intensity) in a lossless WebP. Visitors
   download that one small image and it is decoded on the GPU in a single pass. */

import * as THREE from "three";
import { asset } from "../asset-url.js";

export const ENV_URL = asset("/env/room.webp");
const W = 512, H = 256;

/* Render the scene into a cube map from a point in the room */
export function captureCube(renderer, scene, position, size = 256) {
  const rt = new THREE.WebGLCubeRenderTarget(size, { type: THREE.HalfFloatType });
  const cam = new THREE.CubeCamera(0.05, 30, rt);
  cam.position.copy(position);
  cam.update(renderer, scene);
  return rt;
}

const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2));
const ortho = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
const VERT = "varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }";
function draw(renderer, material, target) {
  quad.material = material;
  const prev = renderer.getRenderTarget();
  renderer.setRenderTarget(target); renderer.render(quad, ortho); renderer.setRenderTarget(prev);
}

/* Load the baked panorama: returns a half-float equirectangular texture ready for PMREM, or null */
export async function loadRoomEnv(renderer, url = ENV_URL) {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    // raw bytes: no premultiplied alpha, no colour conversion, or the exponent would be damaged
    const bmp = await createImageBitmap(await res.blob(), { premultiplyAlpha: "none", colorSpaceConversion: "none" });
    const src = new THREE.Texture(bmp);
    src.flipY = false; src.premultiplyAlpha = false; // (flipY is ignored for ImageBitmaps; the shader flips instead) src.colorSpace = THREE.NoColorSpace;
    src.minFilter = src.magFilter = THREE.NearestFilter; src.generateMipmaps = false; src.needsUpdate = true;
    // with mipmaps: rough surfaces sample blurrier levels of the same panorama for their reflections
    const target = new THREE.WebGLRenderTarget(bmp.width, bmp.height, { type: THREE.HalfFloatType, depthBuffer: false, generateMipmaps: true, minFilter: THREE.LinearMipmapLinearFilter });
    const decode = new THREE.ShaderMaterial({
      uniforms: { map: { value: src } }, vertexShader: VERT, depthTest: false, depthWrite: false,
      fragmentShader: "uniform sampler2D map; varying vec2 vUv; void main(){ vec4 t = texture2D(map, vec2(vUv.x, 1.0 - vUv.y)) * 255.0; gl_FragColor = vec4(t.a > 0.0 ? (t.rgb + 0.5) / 256.0 * exp2(t.a - 128.0) : vec3(0.0), 1.0); }",
    });
    draw(renderer, decode, target);
    decode.dispose(); src.dispose(); bmp.close && bmp.close();
    target.texture.mapping = THREE.EquirectangularReflectionMapping;
    return target;
  } catch {
    return null;
  }
}

/* Dev only: turn a captured cube map into the RGBE panorama, as raw RGBA bytes */
export async function bakeRoomEnv(renderer, cubeTexture) {
  const target = new THREE.WebGLRenderTarget(W, H, { type: THREE.FloatType, depthBuffer: false });
  const unwrap = new THREE.ShaderMaterial({
    uniforms: { cube: { value: cubeTexture } }, vertexShader: VERT, depthTest: false, depthWrite: false,
    // the inverse of three.js's equirectangular lookup: u = atan(z, x) / 2π + 0.5, v = asin(y) / π + 0.5
    fragmentShader: "uniform samplerCube cube; varying vec2 vUv; void main(){ float phi = (vUv.x - 0.5) * 6.2831853; float th = (vUv.y - 0.5) * 3.1415927; vec3 d = vec3(cos(phi) * cos(th), sin(th), sin(phi) * cos(th)); gl_FragColor = vec4(textureCube(cube, d).rgb, 1.0); }",
  });
  draw(renderer, unwrap, target);
  const px = new Float32Array(W * H * 4);
  renderer.readRenderTargetPixels(target, 0, 0, W, H, px);
  unwrap.dispose(); target.dispose();
  // raw RGBA bytes (a canvas would premultiply the alpha and damage the exponent); the dev script
  // turns them into a lossless WebP with sharp
  const out = new Uint8Array(W * H * 4);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const s = ((H - 1 - y) * W + x) * 4, d = (y * W + x) * 4; // GPU rows run bottom-up, image rows top-down
    const r = px[s], g = px[s + 1], b = px[s + 2], v = Math.max(r, g, b);
    if (v < 1e-32) continue;
    const e = Math.floor(Math.log2(v)) + 1, k = 256 / Math.pow(2, e);
    out[d] = Math.min(255, Math.floor(r * k)); out[d + 1] = Math.min(255, Math.floor(g * k)); out[d + 2] = Math.min(255, Math.floor(b * k)); out[d + 3] = e + 128;
  }
  return { data: out, width: W, height: H };
}
