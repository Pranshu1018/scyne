"""Bake the Scyne studio's lighting into lightmap atlases with Cycles.

Run (see tools/bake/README.md):
  blender -b --factory-startup -P tools/bake/bake.py -- assets-src/bake/bake-input.glb assets-src/bake/bake-input.json assets-src/bake/out [--size 2048] [--samples 192]

Input comes from the studio itself (`__studio.exportBake()` in the dev build): receivers R_*
(get lightmaps), emitters E_* (screens, neon, lamps, window: they light the room), occluders O_*
(moving parts: they only cast shadows) and the lights as JSON.

Output (in <out>): studio-bake.glb (receivers with a second UV set, no materials), lightmap-N.png
(8-bit sRGB, value = (light / range) ^ (1 / 2.2)), lightmap-N.exr (HDR, for reference) and
bake.json (fingerprint, atlas ranges, which receiver is in which atlas).
"""

import bpy, bmesh, json, math, os, sys, time
import numpy as np
from mathutils import Vector
from bpy_extras.mesh_utils import mesh_linked_uv_islands
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from encode import encode  # HDR → 8-bit PNG with the gaps between islands filled

argv = sys.argv[sys.argv.index("--") + 1:]
IN_GLB, IN_JSON, OUT = (os.path.abspath(p) for p in argv[:3])
opt = {argv[i].lstrip("-"): argv[i + 1] for i in range(3, len(argv) - 1, 2)}
SIZE = int(opt.get("size", 2048))
SAMPLES = int(opt.get("samples", 192))
SHELL_AREA = 20.0  # m²: larger surfaces (walls, floor, ceiling, slat walls) share the shell atlas
OBJECT_ATLASES = int(opt.get("object-atlases", 2))
os.makedirs(OUT, exist_ok=True)
t_start = time.time()
def log(*a): print(f"[bake {time.time() - t_start:6.1f}s]", *a, flush=True)

manifest = json.load(open(IN_JSON))
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=IN_GLB)
objs = {o.name: o for o in bpy.data.objects if o.type == "MESH"}
receivers = [objs[r["name"]] for r in manifest["receivers"] if r["name"] in objs]
log(f"imported {len(objs)} meshes, {len(receivers)} receivers")

# ---------- lights: three.js (Y-up, physical units) → Blender (Z-up, watts) ----------
def to_blender(v): return Vector((v[0], -v[2], v[1]))
scene = bpy.context.scene
for i, L in enumerate(manifest["lights"]):
    color = L["color"]; t = L["type"]; I = L["intensity"]
    if t == "HemisphereLight":
        # uniform sky: outgoing radiance albedo × I / π in three.js equals a world of strength I / π
        world = bpy.data.worlds.new("World"); scene.world = world; world.use_nodes = True
        bg = world.node_tree.nodes["Background"]
        sky, ground = color, L["groundColor"]
        bg.inputs[0].default_value = (*(0.5 * (sky[k] + ground[k]) for k in range(3)), 1)
        bg.inputs[1].default_value = I / math.pi
        continue
    kind = {"SpotLight": "SPOT", "PointLight": "POINT", "RectAreaLight": "AREA"}.get(t)
    if not kind: continue
    data = bpy.data.lights.new(f"L{i}", kind)
    data.color = color[:3]
    ob = bpy.data.objects.new(f"L{i}", data); scene.collection.objects.link(ob)
    ob.location = to_blender(L["position"])
    if kind in ("SPOT", "POINT"):
        data.energy = 4 * math.pi * I        # candela → watts (Blender spreads P over 4π sr)
        data.shadow_soft_size = 0.05
    if kind == "SPOT":
        data.spot_size = 2 * L["angle"]; data.spot_blend = L["penumbra"]
        d = to_blender(L["target"]) - ob.location
        ob.rotation_euler = d.to_track_quat("-Z", "Y").to_euler()
    if kind == "AREA":
        data.shape = "RECTANGLE"; data.size = L["width"]; data.size_y = L["height"]
        data.energy = I * math.pi * L["width"] * L["height"]  # nits → watts
        q = L["quaternion"]  # three.js (x, y, z, w); RectAreaLight shines along its local -Z, like Blender's
        from mathutils import Quaternion
        qt = Quaternion((q[3], q[0], q[1], q[2]))
        conv = Quaternion((1, 0, 0), math.radians(90))  # Y-up → Z-up
        ob.rotation_mode = "QUATERNION"; ob.rotation_quaternion = conv @ qt
# Recessed downlights are only glowing discs in the live scene. Light is free once baked, so each
# disc on the ceiling gets a real warm spot pointing down: soft pools of light on floor and walls.
DOWN_CD = float(opt.get("downlight-cd", 3.0))
n_down = 0
for ob in [o for o in bpy.data.objects if o.type == "MESH" and o.name.startswith("E_")]:
    zs = [v.co.z for v in ob.data.vertices]
    if not zs or min(zs) < 3.0: continue  # only things set in the ceiling (3.2 m)
    bm = bmesh.new(); bm.from_mesh(ob.data); bm.verts.ensure_lookup_table()
    seen = set()
    for v0 in bm.verts:
        if v0.index in seen: continue
        part, stack = [], [v0]; seen.add(v0.index)
        while stack:
            v = stack.pop(); part.append(v.co.copy())
            for e in v.link_edges:
                w = e.other_vert(v)
                if w.index not in seen: seen.add(w.index); stack.append(w)
        lo = Vector((min(p.x for p in part), min(p.y for p in part), min(p.z for p in part)))
        hi = Vector((max(p.x for p in part), max(p.y for p in part), max(p.z for p in part)))
        if max(hi.x - lo.x, hi.y - lo.y) > 0.3: continue  # a fitting, not a light source
        data = bpy.data.lights.new(f"down{n_down}", "SPOT")
        data.energy = 4 * math.pi * DOWN_CD; data.color = (1.0, 0.86, 0.7)
        data.spot_size = math.radians(100); data.spot_blend = 0.85; data.shadow_soft_size = 0.04
        lt = bpy.data.objects.new(f"down{n_down}", data); scene.collection.objects.link(lt)
        lt.location = (lo + hi) / 2 - Vector((0, 0, 0.03))  # just below the disc, pointing down
        n_down += 1
    bm.free()
log(f"added {n_down} downlights")

if not scene.world:
    scene.world = bpy.data.worlds.new("World"); scene.world.use_nodes = True
    scene.world.node_tree.nodes["Background"].inputs[1].default_value = 0.0

# ---------- Cycles ----------
scene.render.engine = "CYCLES"
cy = scene.cycles
# The fastest device available: NVIDIA (OptiX, then CUDA), AMD, Intel Arc, Apple; else the CPU.
# `--device CPU` forces the processor.
cy.device = "CPU"
if opt.get("device", "GPU").upper() == "GPU":
    prefs = bpy.context.preferences.addons["cycles"].preferences
    for kind in ("OPTIX", "CUDA", "HIP", "ONEAPI", "METAL"):
        try:
            prefs.compute_device_type = kind; prefs.get_devices()
        except Exception:
            continue
        found = [d for d in prefs.devices if d.type == kind]
        if found:
            for d in prefs.devices: d.use = d.type == kind
            cy.device = "GPU"
            log(f"baking on {kind}: {', '.join(d.name for d in found)}")
            break
if cy.device == "CPU": log("baking on the CPU")
cy.samples = SAMPLES; cy.use_denoising = False
cy.max_bounces = 6; cy.diffuse_bounces = 4; cy.glossy_bounces = 1; cy.transmission_bounces = 2; cy.transparent_max_bounces = 4
cy.caustics_reflective = False; cy.caustics_refractive = False
scene.render.bake.margin = 6; scene.render.bake.margin_type = "EXTEND"

# Glass-like receivers excluded at export; for the bake every receiver is a plain diffuse surface:
# metals get irradiance too (the shader uses it to dim their reflections in the shade).
for o in receivers:
    for slot in o.material_slots:
        m = slot.material
        if not m or not m.use_nodes: continue
        for n in m.node_tree.nodes:
            if n.type == "BSDF_PRINCIPLED":
                n.inputs["Metallic"].default_value = 0.0

# ---------- atlases: shell surfaces in one, everything else spread over the rest by area ----------
area = {r["name"]: r["area"] for r in manifest["receivers"]}
shell = [o for o in receivers if area[o.name] >= SHELL_AREA]
rest = sorted([o for o in receivers if area[o.name] < SHELL_AREA], key=lambda o: -area[o.name])
groups = [shell] + [[] for _ in range(OBJECT_ATLASES)]
load = [0.0] * OBJECT_ATLASES
for o in rest:  # greedy balance of surface area across the object atlases
    k = load.index(min(load)); groups[k + 1].append(o); load[k] += area[o.name]
log("atlas areas m²:", [round(sum(area[o.name] for o in g), 1) for g in groups])

def count_islands(o):
    o.data.uv_layers.active = o.data.uv_layers["lightmap"]
    return len(mesh_linked_uv_islands(o.data))

def uv_area(o):
    lm = o.data.uv_layers["lightmap"].data
    s = 0.0
    for p in o.data.polygons:
        pts = [lm[i].uv for i in p.loop_indices]
        for j in range(1, len(pts) - 1):
            a, b, c = pts[0], pts[j], pts[j + 1]
            s += abs((b.x - a.x) * (c.y - a.y) - (c.x - a.x) * (b.y - a.y)) / 2
    return s

def shelf_pack(sides, gap):
    """Place squares (largest first) in rows across the unit square; None if they don't fit."""
    order = sorted(range(len(sides)), key=lambda i: -sides[i])
    pos, x, y, row = [None] * len(sides), 0.0, 0.0, 0.0
    for i in order:
        s = sides[i] + gap
        if x + s > 1.0: x, y, row = 0.0, y + row, 0.0
        if y + s > 1.0: return None
        pos[i] = (x + gap / 2, y + gap / 2); x += s; row = max(row, s)
    return pos

def unwrap(group):
    # 1. each object unwrapped on its own (Smart UV Project, islands packed inside its own square)
    for o in group:
        # several meshes arrive as triangle soups (every triangle separate): weld them, or each triangle
        # becomes its own lightmap island with its own margin. UVs and normals live on face corners in
        # Blender, so welding does not disturb them.
        bm = bmesh.new(); bm.from_mesh(o.data)
        bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=1e-5)
        bm.to_mesh(o.data); bm.free()
        if not o.data.uv_layers:  # keep the lightmap as the second UV set
            o.data.uv_layers.new(name="UVMap")
        lm = o.data.uv_layers.get("lightmap") or o.data.uv_layers.new(name="lightmap")
        o.data.uv_layers.active = lm
        bpy.ops.object.select_all(action="DESELECT"); o.select_set(True); bpy.context.view_layer.objects.active = o
        bpy.ops.object.mode_set(mode="EDIT"); bpy.ops.mesh.select_all(action="SELECT")
        # dense organic meshes (leather, pots) would shatter into thousands of tiny islands, each
        # needing its own margin: a wider angle keeps them in a few large pieces
        angle = 66 if len(o.data.polygons) < 1500 else 85
        bpy.ops.uv.smart_project(angle_limit=math.radians(angle), island_margin=0.02, area_weight=0.0, correct_aspect=True, scale_to_bounds=True)
        bpy.ops.object.mode_set(mode="OBJECT")
    log("  islands per object (largest):", sorted(((count_islands(o), o.name) for o in group), reverse=True)[:5])
    # 2a. preferred: Blender packs every island of every object together at one texel density
    bpy.ops.object.select_all(action="DESELECT")
    for o in group: o.select_set(True)
    bpy.context.view_layer.objects.active = group[0]
    scene.tool_settings.use_uv_select_sync = True
    bpy.ops.object.mode_set(mode="EDIT"); bpy.ops.mesh.select_all(action="SELECT")
    bpy.ops.uv.average_islands_scale()
    bpy.ops.uv.pack_islands(udim_source="ACTIVE_UDIM", scale=True, rotate=True, shape_method="CONCAVE", margin_method="FRACTION", margin=4.0 / SIZE)
    bpy.ops.object.mode_set(mode="OBJECT")
    uv = np.concatenate([np.array([d.uv[:] for d in o.data.uv_layers["lightmap"].data]) for o in group])
    if uv.min() >= -0.001 and uv.max() <= 1.001:
        dens = math.sqrt(sum(uv_area(o) for o in group) / sum(area[o.name] for o in group)) * SIZE
        log(f"unwrapped {len(group)} objects (island pack): {dens:.0f} texels per metre")
        return
    log("  island pack failed, falling back to packing each object's square")
    for o in group:  # back to each object's own 0..1 layout
        bpy.ops.object.select_all(action="DESELECT"); o.select_set(True); bpy.context.view_layer.objects.active = o
        bpy.ops.object.mode_set(mode="EDIT"); bpy.ops.mesh.select_all(action="SELECT")
        bpy.ops.uv.smart_project(angle_limit=math.radians(66), island_margin=0.02, area_weight=0.0, correct_aspect=True, scale_to_bounds=True)
        bpy.ops.object.mode_set(mode="OBJECT")
    # 2b. fallback: one texel density across the atlas, each object's square sized by its real surface area
    want = [math.sqrt(area[o.name] / max(uv_area(o), 1e-6)) for o in group]
    gap = 4.0 / SIZE
    lo, hi = 0.0, 1.0 / max(want)
    for _ in range(40):  # the largest scale at which everything still fits
        mid = (lo + hi) / 2
        if shelf_pack([max(w * mid, 6.0 / SIZE) for w in want], gap): lo = mid
        else: hi = mid
    sides = [max(w * lo, 6.0 / SIZE) for w in want]
    pos = shelf_pack(sides, gap)
    for o, s, (px, py) in zip(group, sides, pos):
        for d in o.data.uv_layers["lightmap"].data:
            d.uv = (px + d.uv.x * s, py + d.uv.y * s)
    used = sum(s * s for s in sides)
    log(f"unwrapped {len(group)} objects: {lo * SIZE:.0f} texels per √m², atlas {used * 100:.0f}% used")

def bake(group, k):
    img = bpy.data.images.new(f"lightmap-{k}", SIZE, SIZE, alpha=False, float_buffer=True)
    for o in group:
        for slot in o.material_slots:
            if not slot.material: continue
            slot.material = slot.material.copy()  # its own copy: the active image node is per atlas
            nt = slot.material.node_tree
            node = nt.nodes.new("ShaderNodeTexImage"); node.image = img
            nt.nodes.active = node
    bpy.ops.object.select_all(action="DESELECT")
    for o in group: o.select_set(True)
    bpy.context.view_layer.objects.active = group[0]
    t = time.time()
    bpy.ops.object.bake(type="DIFFUSE", pass_filter={"DIRECT", "INDIRECT"}, margin=6, use_clear=True, uv_layer="lightmap")
    px = np.empty(SIZE * SIZE * 4, dtype=np.float32); img.pixels.foreach_get(px)
    log(f"atlas {k}: baked {len(group)} objects in {time.time() - t:.0f}s, raw mean {float(px.reshape(-1, 4)[:, :3].mean()):.4f}")
    return img

def denoise(img):
    # OIDN through the compositor: an Image node → Denoise → Composite, rendered with Workbench
    scene.use_nodes = True
    nt = scene.node_tree; nt.nodes.clear()
    n_img = nt.nodes.new("CompositorNodeImage"); n_img.image = img
    n_dn = nt.nodes.new("CompositorNodeDenoise"); n_dn.prefilter = "ACCURATE"; n_dn.use_hdr = True
    n_out = nt.nodes.new("CompositorNodeComposite"); n_out.use_alpha = False
    nt.links.new(n_img.outputs["Image"], n_dn.inputs["Image"]); nt.links.new(n_dn.outputs["Image"], n_out.inputs["Image"])
    engine = scene.render.engine
    scene.render.engine = "BLENDER_WORKBENCH"
    scene.render.resolution_x = img.size[0]; scene.render.resolution_y = img.size[1]; scene.render.resolution_percentage = 100
    scene.render.image_settings.file_format = "OPEN_EXR"; scene.render.image_settings.color_depth = "16"
    scene.render.image_settings.exr_codec = "ZIP"
    path = os.path.join(OUT, f"{img.name}.exr")
    scene.render.filepath = path
    bpy.ops.render.render(write_still=True)
    scene.render.engine = engine
    return bpy.data.images.load(path, check_existing=False)

# bake every atlas first, then denoise them all (the denoise pass switches engine and resolution)
groups = [g for g in groups if g]
baked = []
for k, g in enumerate(groups):
    unwrap(g)
    baked.append(bake(g, k))
atlases, where = [], {}
for k, (g, img) in enumerate(zip(groups, baked)):
    rng = encode(denoise(img), os.path.join(OUT, f"lightmap-{k}.png"))
    atlases.append({"file": f"lightmap-{k}", "range": round(rng, 4), "objects": len(g)})
    for o in g:
        where[o.name] = k
        o["lm"] = k

# ---------- export the receivers with both UV sets ----------
bpy.ops.object.select_all(action="DESELECT")
for o in list(bpy.data.objects):
    if o.type == "MESH" and o.name in where: o.select_set(True)
bpy.ops.export_scene.gltf(
    filepath=os.path.join(OUT, "studio-bake.glb"), export_format="GLB", use_selection=True,
    export_materials="NONE", export_texcoords=True, export_normals=True, export_extras=True,
    export_yup=True, export_apply=False, export_animations=False, export_skins=False, export_morph=False)
json.dump({"version": 1, "fingerprint": manifest["fingerprint"], "size": SIZE, "samples": SAMPLES,
           "atlases": atlases, "receivers": where}, open(os.path.join(OUT, "bake.json"), "w"), indent=1)
log("done")
