"""MetaHuman → public/models/man.glb, for the automation desk (see README.md next to this file).

Takes the folder you exported from Unreal (FBX meshes and texture images), and writes one web
model: one skeleton (Unreal's body skeleton, which src/world/man.js knows), every part skinned to
it, textures resized, no facial shapes. man.js sits him in the chair and poses him at load.

  blender -b --factory-startup -P tools/metahuman/convert.py -- <export folder> [options]

  --out public/models/man.glb   where to write
  --lod 1                       which level of detail to keep when the FBX files carry several
  --max 2048                    largest texture side for the face; other textures get half
  --map map.json                textures per material, when the automatic matching gets one wrong:
                                {"<material>": {"color": "file.png", "normal": "file.png",
                                 "roughness": "file.png", "alpha": "file.png"}}

What it does, in order:
  1. imports every .fbx in the folder (Unreal exports centimetres; the importer makes metres)
  2. keeps one level of detail (objects named …_LOD<n>)
  3. finds the body skeleton (the armature with pelvis, upperarm_l, index_01_l and the most bones)
  4. moves every other skinned part onto it: a weight on a bone the body does not have (the
     face's FACIAL_* bones) goes to its nearest ancestor the body does have (head, neck)
  5. parents unskinned parts (hair or brow cards exported as static meshes) to the head bone
  6. gives every material a plain PBR setup from the images in the folder, matched by name
  7. exports a GLB without animation or shape keys, textures as WebP

It prints what it matched and what it could not; check that before shipping the result.
"""

import bpy, json, os, re, sys

argv = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
if not argv or argv[0].startswith("--"):
    raise SystemExit("usage: blender -b --factory-startup -P tools/metahuman/convert.py -- <export folder> [--out …] [--lod 1] [--max 2048] [--map map.json]")
SRC = os.path.abspath(argv[0])
opt = {"out": os.path.join("public", "models", "man.glb"), "lod": "1", "max": "2048", "map": ""}
for i, a in enumerate(argv[1:], 1):
    if a.startswith("--") and a[2:] in opt and i + 1 < len(argv):
        opt[a[2:]] = argv[i + 1]
OUT, LOD, MAX = os.path.abspath(opt["out"]), int(opt["lod"]), int(opt["max"])
OVERRIDES = json.load(open(opt["map"], encoding="utf8")) if opt["map"] else {}
IMAGE_EXT = (".png", ".tga", ".jpg", ".jpeg", ".tif", ".tiff", ".exr", ".bmp")

def log(*a):
    print("[metahuman]", *a, flush=True)

# ---------- 1. import ----------
bpy.ops.wm.read_factory_settings(use_empty=True)
files = sorted(f for f in os.listdir(SRC) if f.lower().endswith(".fbx"))
if not files:
    raise SystemExit(f"no .fbx files in {SRC}")
for f in files:
    log("import", f)
    bpy.ops.import_scene.fbx(filepath=os.path.join(SRC, f), use_anim=False, ignore_leaf_bones=False, automatic_bone_orientation=False)  # Unreal adds no end bones; True would drop real ones (head is a leaf)

# ---------- 2. one level of detail ----------
lod_re = re.compile(r"_LOD(\d+)", re.I)
lods = {}
for o in bpy.data.objects:
    if o.type == "MESH":
        m = lod_re.search(o.name) or lod_re.search(o.data.name)
        if m:
            lods.setdefault(lod_re.sub("", o.name), []).append((int(m.group(1)), o))
for base, items in lods.items():
    have = sorted(n for n, _ in items)
    keep = LOD if LOD in have else min(have, key=lambda n: abs(n - LOD))
    for n, o in items:
        if n != keep:
            bpy.data.objects.remove(o, do_unlink=True)
    if keep != LOD:
        log(f"{base}: no LOD{LOD}, kept LOD{keep}")

# ---------- 3. the body skeleton ----------
arms = [o for o in bpy.data.objects if o.type == "ARMATURE"]
def is_body(a):
    names = a.data.bones.keys()
    return all(n in names for n in ("pelvis", "upperarm_l", "index_01_l", "head"))
bodies = sorted((a for a in arms if is_body(a)), key=lambda a: len(a.data.bones), reverse=True)
if not bodies:
    raise SystemExit("no body skeleton (pelvis, upperarm_l, index_01_l, head) among: " + ", ".join(a.name for a in arms))
body = bodies[0]
body_bones = set(body.data.bones.keys())
log(f"body skeleton: {body.name} ({len(body_bones)} bones)")

# ---------- 4. every skinned part onto the body skeleton ----------
def nearest_in_body(arm, name):
    b = arm.data.bones.get(name)
    while b is not None and b.name not in body_bones:
        b = b.parent
    return b.name if b is not None else "head"

for o in [o for o in bpy.data.objects if o.type == "MESH"]:
    mod = next((m for m in o.modifiers if m.type == "ARMATURE"), None)
    if mod is None or mod.object is None:
        continue
    if mod.object != body:
        own = mod.object
        moved = 0
        for g in list(o.vertex_groups):
            if g.name in body_bones:
                continue
            target = nearest_in_body(own, g.name)
            tg = o.vertex_groups.get(target) or o.vertex_groups.new(name=target)
            for v in o.data.vertices:
                for e in v.groups:
                    if e.group == g.index and e.weight > 0:
                        tg.add([v.index], e.weight, "ADD")
            o.vertex_groups.remove(g)
            moved += 1
        log(f"{o.name}: skinned to {own.name} → body ({moved} bone weights folded into their parents)")
        mod.object = body
    mw = o.matrix_world.copy()
    o.parent = body
    o.matrix_world = mw

# ---------- 5. unskinned parts follow the head ----------
for o in [o for o in bpy.data.objects if o.type == "MESH" and not any(m.type == "ARMATURE" for m in o.modifiers)]:
    mw = o.matrix_world.copy()
    o.parent = body
    o.parent_type = "BONE"
    o.parent_bone = "head"
    o.matrix_world = mw
    log(f"{o.name}: not skinned, follows the head bone")

# everything else (other skeletons, LOD groups, empties) goes
for o in list(bpy.data.objects):
    if o.type not in ("MESH",) and o != body:
        bpy.data.objects.remove(o, do_unlink=True)
for o in bpy.data.objects:
    if o.type == "MESH" and o.data.shape_keys:
        o.shape_key_clear()  # no facial animation on the web: drop the blend shapes (most of the file)

tris = sum(sum(len(p.vertices) - 2 for p in o.data.polygons) for o in bpy.data.objects if o.type == "MESH")
log(f"{sum(1 for o in bpy.data.objects if o.type == 'MESH')} meshes, {tris} triangles")

# ---------- 6. materials ----------
images = [f for f in os.listdir(SRC) if f.lower().endswith(IMAGE_EXT)]
CHANNELS = {
    "color": ("basecolor", "base_color", "albedo", "diffuse", "color", "_bc", "_d."),
    "normal": ("normal", "_n.", "_nrm", "_nm"),
    "roughness": ("roughness", "rough", "_r.", "_orm", "_arm"),
    "alpha": ("opacity", "alpha", "mask", "_a."),
}
PART = [  # material keywords → image keywords
    (("face", "head"), ("face", "head")), (("body",), ("body",)), (("top", "shirt", "tshirt", "torso"), ("top", "shirt", "tshirt", "torso")),
    (("bottom", "pants", "jeans", "legs", "trouser"), ("bottom", "pants", "jeans", "legs", "trouser")), (("shoe", "feet", "foot"), ("shoe", "feet", "foot")),
    (("eyelash", "lash"), ("eyelash", "lash")), (("eyebrow", "brow"), ("eyebrow", "brow")), (("teeth", "tooth", "mouth"), ("teeth", "tooth", "mouth")),
    (("eye",), ("eye", "iris", "sclera")), (("hair", "groom", "card"), ("hair", "groom", "card")), (("beard", "mustache", "facial_hair"), ("beard", "mustache")),
]

def pick(material, channel):
    name = material.name.lower()
    keys = next((imgk for matk, imgk in PART if any(k in name for k in matk)), None)
    best = None
    for f in images:
        low = f.lower()
        if not any(k in low for k in CHANNELS[channel]):
            continue
        if channel == "color" and any(k in low for k in CHANNELS["normal"] + CHANNELS["roughness"]):
            continue
        score = (2 if keys and any(k in low for k in keys) else 0) + (1 if any(t in low for t in re.split(r"[^a-z0-9]+", name) if len(t) > 2) else 0)
        if score and (best is None or score > best[0]):
            best = (score, f)
    return best[1] if best else None

def load(f, non_color, size):
    img = bpy.data.images.load(os.path.join(SRC, f), check_existing=True)
    if non_color:
        img.colorspace_settings.name = "Non-Color"
    w, h = img.size
    if max(w, h) > size:
        k = size / max(w, h)
        img.scale(max(1, int(w * k)), max(1, int(h * k)))
    return img

report = []
for mat in {s.material for o in bpy.data.objects if o.type == "MESH" for s in o.material_slots if s.material}:
    over = OVERRIDES.get(mat.name, {})
    chosen = {c: over.get(c) or pick(mat, c) for c in CHANNELS}
    face = any(k in mat.name.lower() for k in ("face", "head"))
    size = MAX if face else MAX // 2
    mat.use_nodes = True
    nt = mat.node_tree
    nt.nodes.clear()
    out = nt.nodes.new("ShaderNodeOutputMaterial")
    bsdf = nt.nodes.new("ShaderNodeBsdfPrincipled")
    nt.links.new(bsdf.outputs["BSDF"], out.inputs["Surface"])
    bsdf.inputs["Roughness"].default_value = 0.6
    if chosen["color"]:
        t = nt.nodes.new("ShaderNodeTexImage"); t.image = load(chosen["color"], False, size)
        nt.links.new(t.outputs["Color"], bsdf.inputs["Base Color"])
        if chosen["alpha"] is None and t.image.channels == 4 and any(k in mat.name.lower() for k in ("lash", "brow", "hair", "card")):
            nt.links.new(t.outputs["Alpha"], bsdf.inputs["Alpha"])
    if chosen["normal"]:
        t = nt.nodes.new("ShaderNodeTexImage"); t.image = load(chosen["normal"], True, size)
        nm = nt.nodes.new("ShaderNodeNormalMap")
        nt.links.new(t.outputs["Color"], nm.inputs["Color"]); nt.links.new(nm.outputs["Normal"], bsdf.inputs["Normal"])
    if chosen["roughness"]:
        t = nt.nodes.new("ShaderNodeTexImage"); t.image = load(chosen["roughness"], True, size)
        packed = any(k in chosen["roughness"].lower() for k in ("_orm", "_arm"))
        if packed:  # occlusion / roughness / metal packed: roughness is green
            sep = nt.nodes.new("ShaderNodeSeparateColor")
            nt.links.new(t.outputs["Color"], sep.inputs["Color"]); nt.links.new(sep.outputs["Green"], bsdf.inputs["Roughness"])
        else:
            nt.links.new(t.outputs["Color"], bsdf.inputs["Roughness"])
    if chosen["alpha"]:
        t = nt.nodes.new("ShaderNodeTexImage"); t.image = load(chosen["alpha"], True, size)
        nt.links.new(t.outputs["Color"], bsdf.inputs["Alpha"])
    if bsdf.inputs["Alpha"].is_linked:
        mat.blend_method = "CLIP"; mat.alpha_threshold = 0.4  # cards: cut out, no sorting
    report.append((mat.name, chosen))

for name, chosen in sorted(report):
    missing = [c for c in ("color", "normal") if not chosen[c]]
    log(f"material {name}: " + ", ".join(f"{c}={v}" for c, v in chosen.items() if v) + (f"   (NO {' / '.join(missing)})" if missing else ""))

# ---------- 7. export ----------
os.makedirs(os.path.dirname(OUT), exist_ok=True)
for o in bpy.data.objects:
    o.select_set(True)
bpy.ops.export_scene.gltf(
    filepath=OUT, export_format="GLB", use_selection=False,
    export_skins=True, export_animations=False, export_morph=False,
    export_image_format="WEBP", export_yup=True, export_apply=False,
)
log(f"wrote {OUT} ({os.path.getsize(OUT) // 1024} KB, {tris} triangles)")
