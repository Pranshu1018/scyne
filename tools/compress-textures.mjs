// GPU-compressed textures (KTX2 / Basis Universal) for the studio.
//   node tools/compress-textures.mjs [--models]   (needs KTX-Software's `ktx`; set KTX=path or PATH)
//   --models: only the models
// public/textures/*.webp → public/textures/*.ktx2   colour, roughness/AO: ETC1S. Normal maps are
//   left as WebP: as UASTC they were 9× the download, and with baked lighting they are not loaded
// public/models/*.glb    → public/models/*.ktx2.glb, colour/roughness/AO as ETC1S inside each
//   model (via glTF-Transform); its normal maps keep their format, for the same reason
// A WebP texture is 32 bits per pixel once it reaches the GPU; these stay compressed there
// (4–8 bits per pixel), which is what keeps graphics memory and upload time down.
import { execFileSync } from "node:child_process";
import { readdirSync, statSync, mkdirSync, renameSync } from "node:fs";
import { join, resolve, dirname } from "node:path";
import { tmpdir } from "node:os";

const KTX = process.env.KTX || "ktx";
const GLTF_TRANSFORM = resolve("node_modules/@gltf-transform/cli/bin/cli.js");
const env = { ...process.env, PATH: `${dirname(KTX)}${process.platform === "win32" ? ";" : ":"}${process.env.PATH}` };
const run = (cmd, args) => execFileSync(cmd, args, { stdio: ["ignore", "pipe", "inherit"], env });
const kb = (f) => Math.round(statSync(f).size / 1024);
const tmp = join(tmpdir(), "scyne-ktx"); mkdirSync(tmp, { recursive: true });

let before = 0, after = 0;
const onlyModels = process.argv.includes("--models");
for (const f of onlyModels ? [] : readdirSync("public/textures").filter((f) => f.endsWith(".webp") && !f.includes("_nor_gl"))) {
  const src = join("public/textures", f), png = join(tmp, f.replace(".webp", ".png")), out = src.replace(".webp", ".ktx2");
  run(process.execPath, ["-e", `require("sharp")(${JSON.stringify(resolve(src))}).flip().png().toFile(${JSON.stringify(png)})`]); // stored flipped: KTX2 is not flipped on upload, images are
  const colour = f.includes("_Diffuse");
  const args = ["create", "--format", colour ? "R8G8B8_SRGB" : "R8G8B8_UNORM", "--generate-mipmap"];
  args.push("--encode", "basis-lz", "--clevel", "4", "--qlevel", colour ? "220" : "180");
  if (!colour) args.push("--assign-tf", "linear");
  run(KTX, [...args, png, out]);
  before += kb(src); after += kb(out);
  console.log(f, kb(src), "KB →", kb(out), "KB");
}
if (!onlyModels) console.log(`textures: ${before} KB → ${after} KB`);

before = after = 0;
for (const f of readdirSync("public/models").filter((f) => f.endsWith(".glb") && !f.endsWith(".ktx2.glb"))) {
  const src = join("public/models", f), a = join(tmp, "a-" + f);
  run(process.execPath, [GLTF_TRANSFORM, "etc1s", src, a, "--slots", "{baseColorTexture,emissiveTexture,metallicRoughnessTexture,occlusionTexture}", "--quality", "200"]);
  before += kb(src); after += kb(a);
  console.log(f, kb(src), "KB →", kb(a), "KB");
  renameSync(a, src.replace(".glb", ".ktx2.glb"));
}
console.log(`models: ${before} KB → ${after} KB`);
