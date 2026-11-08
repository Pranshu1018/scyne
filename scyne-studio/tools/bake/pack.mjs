// Pack a Blender bake for the web: tools/bake/pack.mjs <bake output dir>  →  public/bake/
//   studio-bake.glb  → meshopt-compressed geometry (positions, normals, both UV sets), without the
//                      probe-lit receivers (below)
//   lightmap-N.png   → KTX2, ETC1S (Basis LZ) at the highest quality level, with mipmaps.
//                      A quarter the size of UASTC (≈0.7 vs 2.9 MB per 2048² atlas) at 36 dB
//                      PSNR: lightmaps are smooth and sit under textured surfaces, which hide the
//                      difference. Set LIGHTMAP_CODEC=uastc for the larger, cleaner encoding.
//   bake.json        → the manifest, plus "probes": { R_n: [r, g, b] } in linear light
// Probes: receivers whose source matches PROBE (default: the potted plants). Dense organic meshes
// unwrap into thousands of tiny islands and were half the bake's vertices; each becomes the
// average of its own baked light, and the studio keeps drawing its original mesh.
// Needs KTX-Software's `ktx` (set KTX to its path, or have it on PATH).
import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { tmpdir } from "node:os";
import { NodeIO } from "@gltf-transform/core";
import { prune } from "@gltf-transform/functions";
import sharp from "sharp";

const src = resolve(process.argv[2] || "assets-src/bake/out");
const input = resolve(process.argv[3] || join(src, "..", "bake-input.json"));
const out = resolve("public/bake");
const KTX = process.env.KTX || "ktx";
const PROBE = new RegExp(process.env.PROBE || "potted_plant");
mkdirSync(out, { recursive: true });
const kb = (f) => `${Math.round(statSync(f).size / 1024)} KB`;
const run = (cmd, args) => execFileSync(cmd, args, { stdio: ["ignore", "pipe", "inherit"] });
const GLTF_TRANSFORM = resolve("node_modules/@gltf-transform/cli/bin/cli.js");

const manifest = JSON.parse(readFileSync(join(src, "bake.json"), "utf8"));
const sources = Object.fromEntries(JSON.parse(readFileSync(input, "utf8")).receivers.map((r) => [r.name, r.src]));

// ---------- probes: average baked light under each one's lightmap UVs, then drop its geometry ----------
const atlases = await Promise.all(manifest.atlases.map(async (a) => {
  const { data, info } = await sharp(join(src, `${a.file}.png`)).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  return { data, w: info.width, h: info.height, range: a.range };
}));
const io = new NodeIO();
const doc = await io.read(join(src, "studio-bake.glb"));
const probes = {};
const el = [];
for (const node of doc.getRoot().listNodes()) {
  const name = node.getName(), k = manifest.receivers[name], mesh = node.getMesh();
  if (!mesh || k === undefined || !PROBE.test(sources[name] || "")) continue;
  const A = atlases[k], samples = [];
  for (const prim of mesh.listPrimitives()) {
    const uv = prim.getAttribute("TEXCOORD_1");
    for (let i = 0; i < uv.getCount(); i++) {
      uv.getElement(i, el);
      const x = Math.min(A.w - 1, Math.max(0, Math.floor(el[0] * A.w))), y = Math.min(A.h - 1, Math.max(0, Math.floor(el[1] * A.h)));
      const p = (y * A.w + x) * 3;
      samples.push([0, 1, 2].map((c) => Math.pow(A.data[p + c] / 255, 2.2) * A.range)); // undo the PNG encoding
    }
  }
  // the brighter half: the side you see (a pot's inside and the soil would drag a plain mean down)
  const lum = (c) => 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
  samples.sort((a, b) => lum(b) - lum(a));
  const top = samples.slice(0, Math.max(1, samples.length >> 1));
  probes[name] = [0, 1, 2].map((c) => +(top.reduce((s, v) => s + v[c], 0) / top.length).toFixed(4));
  node.dispose();
}
await doc.transform(prune());
const trimmed = join(tmpdir(), "scyne-bake-trimmed.glb");
await io.write(trimmed, doc);
console.log(`probes: ${Object.keys(probes).length} receivers (${PROBE})`);

run(process.execPath, [GLTF_TRANSFORM, "meshopt", trimmed, join(out, "studio-bake.glb")]);
console.log("studio-bake.glb", kb(join(src, "studio-bake.glb")), "→", kb(join(out, "studio-bake.glb")));
for (const a of manifest.atlases) {
  const png = join(src, `${a.file}.png`), ktx2 = join(out, `${a.file}.ktx2`);
  const codec = process.env.LIGHTMAP_CODEC === "uastc"
    ? ["--encode", "uastc", "--uastc-quality", "2", "--uastc-rdo", "--zstd", "18"]
    : ["--encode", "basis-lz", "--clevel", "4", "--qlevel", "255"];
  run(KTX, ["create", "--format", "R8G8B8_SRGB", "--assign-tf", "srgb", ...codec, "--generate-mipmap", png, ktx2]);
  console.log(`${a.file}.ktx2`, kb(png), "→", kb(ktx2));
}
writeFileSync(join(out, "bake.json"), JSON.stringify({ ...manifest, probes }, null, 1));
console.log("done →", out);
