# A MetaHuman for the automation desk

The man at the automation desk can be any MetaHuman. You make and export him in Unreal Engine;
`convert.py` turns the export into `public/models/man.glb`; `src/world/man.js` sits him in the
chair and poses him (hands behind his head) when the studio loads.

## 0. Licence (check once)

Sign in at <https://www.metahuman.com/license> and read the current terms. As reported when they
changed in June 2025: MetaHumans are covered by the Unreal Engine EULA and may be used in other
software, royalty-free; a business earning over $1M a year from projects that use them needs Unreal
seats; they may not be used to train AI. A web page sends the model file to every visitor, so make
sure the terms you see allow a character to ship inside a website.

## 1. Make him (Unreal Engine 5.6 or newer)

1. Install the Epic Games Launcher and Unreal Engine (latest 5.x). Create a blank project.
2. Enable the MetaHuman plugins (Edit → Plugins → search "MetaHuman"), restart.
3. Create a MetaHuman character (Content Browser → right-click → MetaHuman → MetaHuman Character)
   and open it in MetaHuman Creator.
4. Aim for the reference: a man in his mid-twenties, light skin, short curly brown hair with faded
   sides, light stubble, a grey-blue button-up shirt over a white T-shirt, dark trousers.
   Pick the closest presets and clothing; exact matches are not needed.
5. **Assemble** him with the option for real-time use (optimised for games: it gives level-of-detail
   meshes and hair as cards, not strands; strand hair cannot go on the web).

## 2. Export him

Make one folder for everything: `scyne-studio/assets-src/metahuman/` (it is kept out of git).

1. In the Content Browser, open the assembled character's folder.
2. For each skeletal mesh (the **body**, the **face**, each piece of **clothing**, and the **hair,
   eyebrow, eyelash and beard cards** if they are meshes): right-click → Asset Actions → Export →
   FBX. Options: Level of Detail **on**, Morph Targets **off** (not needed, and huge), Collision off.
3. Export the **textures** those meshes use (base colour, normal, roughness / packed masks for
   face, body, each piece of clothing, the hair, the eyes): select the texture assets → Asset
   Actions → Export → PNG (or TGA), into the same folder. Keep their names; the converter matches
   textures to materials by name.

Then tell Claude the folder is ready. The rest is below, for reference.

## 3. Convert (Claude does this)

```
blender -b --factory-startup -P tools/metahuman/convert.py -- assets-src/metahuman --lod 1
node tools/compress-textures.mjs --models
```

- `--lod 1` keeps the second level of detail (the first is far heavier than the desk view needs);
  `--max 2048` caps the face textures (others get half); `--map map.json` fixes a texture match by
  hand. The converter prints every material and the images it matched: check for "NO".
- `compress-textures.mjs --models` rebuilds `man.ktx2.glb`, which the studio loads first. Without
  it the old man keeps showing.
- Then: look at him in the studio (`npm run dev`, the automation stop), re-bake the lighting if his
  silhouette changed a lot (tools/bake/README.md: he casts the baked shadow on the chair and desk),
  and re-capture the loading photos (`node tools/posters.cjs`).

## How man.js poses him

`POSE` in `src/world/man.js` is measured in the chair's space (+x his left, +y up, +z towards the
desk). A MetaHuman arrives standing; man.js turns him to face the desk, bends spine, neck and legs
into the seated pose, puts his pelvis on the seat, then reaches each wrist to the back of his neck
and curls the fingers. Bone names come from `RIGS.unreal` (the standard Unreal skeleton:
`pelvis`, `spine_01…05`, `neck_01/02`, `head`, `upperarm_l`, `lowerarm_l`, `hand_l`,
`index_01_l…`, `thigh_l`, `calf_l`, `foot_l`, `ball_l`). In development,
`man.userData.repose({ ...POSE, … })` on the live scene tries other numbers.
