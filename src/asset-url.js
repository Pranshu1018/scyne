/* Versioned URLs for the files in public/ (models, textures, the lighting bake, the reflection
   panorama, the loading photos). Their names never change, so without a version a browser that
   cached them kept showing the previous studio after a deploy. The build hashes each folder's
   contents (vite.config.js) and every URL carries its folder's hash: a changed folder gets new
   URLs, an unchanged one stays cached, and the files can be cached for good (vercel.json). */

/* global __ASSET_V__ */
const V = typeof __ASSET_V__ === "object" ? __ASSET_V__ : {};

export function asset(path) {
  const v = V[path.split("/")[1]];
  return v ? `${path}?v=${v}` : path;
}
