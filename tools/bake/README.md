# Baked lighting

The studio's static surfaces are lit offline with Blender Cycles: direct light, bounced light,
soft shadows and contact occlusion, stored in lightmap atlases. At runtime they are drawn by one
small shader (`src/world/studio-material.js`): albedo × lightmap, plus a roughness-aware reflection
of the room on glossy surfaces. There are no real-time lights or shadow maps on them.

Only the parts that move keep live lighting, from the lights flagged `userData.live` (the
automation-desk spot and the hemisphere light): the man and his chair, the job cards, the phone.

## Tools

- Blender 4.2 LTS (the portable zip from blender.org is enough)
- KTX-Software 4.4 (`ktx` command; Khronos release)

On this machine they live in `C:\Users\PRANSHU\tools\`.

## Re-baking after you change the room

Anything that changes a static surface (moving furniture, a new prop, a different light) needs a
re-bake. The studio detects a stale bake on its own: it logs a warning and falls back to live
lighting rather than drawing wrong lightmaps.

1. **Export** the scene from the dev build, with the current bake switched off:

   ```
   npm run dev            # open http://localhost:5177/?nobake
   ```

   In the browser console:

   ```js
   const r = await __studio.exportBake();
   // save r.glb as assets-src/bake/bake-input.glb and r.manifest as assets-src/bake/bake-input.json
   ```

   (`assets-src/` is not shipped.)

2. **Bake** (about 8 minutes on the RTX 3050 with OptiX, which bake.py picks on its own; 20–40 on a laptop CPU; try `--size 512 --samples 16` first):

   ```
   blender -b --factory-startup -P tools/bake/bake.py -- assets-src/bake/bake-input.glb assets-src/bake/bake-input.json assets-src/bake/out --size 2048 --samples 128
   ```

   Options: `--object-atlases 2` (furniture atlases besides the room-shell one), `--downlight-cd 3`
   (strength of the spots added under each ceiling downlight; baked light costs nothing at runtime).

   The lightmaps are encoded by `tools/bake/encode.py`, which also fills the empty space between
   UV islands (otherwise mipmaps blend black into small or distant objects). To re-encode a
   finished bake without baking again:

   ```
   blender -b --factory-startup -P tools/bake/encode.py -- assets-src/bake/out
   ```

3. **Pack** for the web (meshopt geometry, KTX2 ETC1S lightmaps, plant probes) into `public/bake/`:

   ```
   KTX=C:/Users/PRANSHU/tools/ktx/bin/ktx.exe node tools/bake/pack.mjs assets-src/bake/out assets-src/bake/bake-input.json
   ```

   The potted plants (`PROBE`, a pattern on the receiver's source name) become probes: each is
   reduced to the average light on its brighter half, and its geometry is left out of the
   download. `LIGHTMAP_CODEC=uastc` gives larger, cleaner lightmaps.

4. Reload. `?nobake` compares against live lighting. `lightMapIntensity` (2.4) and
   `lightMapSaturation` (0.7) in `src/world/studio-material.js` grade every lightmap at once; they
   were matched to the live-lit studio by the mean colour of the same camera stops.

## What goes in the bake

`src/world/bake.js` decides each mesh's part (`bakeRole`), and the same rule runs at export and at
runtime, after the same static merge:

| Part | Which meshes | In the bake | At runtime |
|---|---|---|---|
| receiver | static, opaque, lit | gets a lightmap | baked geometry + studio material |
| probe | receivers matching `PROBE` (plants) | baked, then averaged | own geometry + studio material, one light colour |
| emitter | unlit glowing parts: screens, neon, lamps, the window | lights the room with its picture (cut out where it is see-through) | unchanged |
| occluder | parts under a `userData.dynamic` group, the man | casts shadows only | live lighting |
| — | glass, instanced keyboards, hidden helpers | ignored | unchanged |
