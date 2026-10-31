// Downloads the CC0 Poly Haven assets used by the studio into assets-src/ (not shipped).
const fs = require("fs"), path = require("path");
const ROOT = path.join(__dirname, "assets-src");
const MODELS = ["modern_arm_chair_01","Ottoman_01","modern_coffee_table_01","coffee_table_round_01","side_table_01","modern_wooden_cabinet","steel_frame_shelves_01","steel_frame_shelves_03","wooden_display_shelves_01","drawer_cabinet","modern_ceiling_lamp_01","potted_plant_01","ceramic_vase_01","ceramic_vase_02","ceramic_vase_04","hanging_picture_frame_02","standing_picture_frame_02","book_encyclopedia_set_01","wall_clock"];
const TEXTURES = ["herringbone_parquet","plastered_wall_02","grey_plaster","wood_floor","american_walnut_veneer","poly_wool_herringbone","fabric_leather_02","white_oak_veneer"];
const RES = { american_walnut_veneer: "2k", poly_wool_herringbone: "2k", fabric_leather_02: "2k", white_oak_veneer: "2k" };
async function save(url, file) {
  if (fs.existsSync(file)) return 0;
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const r = await fetch(url); if (!r.ok) throw new Error(url + " " + r.status);
  const b = Buffer.from(await r.arrayBuffer()); fs.writeFileSync(file, b); return b.length;
}
(async () => {
  let total = 0;
  for (const id of MODELS) {
    const j = await (await fetch(`https://api.polyhaven.com/files/${id}`)).json();
    const g = j.gltf["1k"].gltf;
    const dir = path.join(ROOT, "models", id);
    total += await save(g.url, path.join(dir, path.basename(new URL(g.url).pathname)));
    for (const [rel, f] of Object.entries(g.include)) total += await save(f.url, path.join(dir, rel));
    console.log("model", id);
  }
  for (const id of TEXTURES) {
    const j = await (await fetch(`https://api.polyhaven.com/files/${id}`)).json();
    for (const map of ["Diffuse", "nor_gl", "arm"]) total += await save(j[map][RES[id] || "1k"].jpg.url, path.join(ROOT, "textures", id, `${map}.jpg`));
    console.log("texture", id);
  }
  console.log("done", (total / 1e6).toFixed(1), "MB");
})().catch((e) => { console.error(e); process.exit(1); });
