# Scyne Studio

A walk-through 3D studio. Scrolling flies the camera through a warm, professional small studio (oak, herringbone parquet, plaster walls, pendant lights) where every station is something Scyne builds for clients. Below the tour sits a plain, readable version of the same content for search engines, phones and anyone who skips the tour.

```bash
npm install
npm run dev        # http://localhost:5177
npm run build      # dist/
```

Add `?still` to the URL to snap the camera straight to each stop (handy for screenshots or very slow machines).

## The tour

| Stop | Station | What it shows |
|---|---|---|
| Overview | The whole studio, neon Scyne mark on the brand wall | Hover or click any station |
| 01 Websites | Design desk with a laptop, a landscape and a portrait monitor | A site builds itself from a short brief: the laptop ticks off seven steps and writes the code, the big monitor shows an "AI" cursor placing each part of the page, the portrait monitor builds the mobile version, then it goes live and a visitor books a check-up (one 20 s loop) |
| 02 Automation | A man leaning back in his chair, hands behind his head, laptop open in front of him | Glass cards around him finish jobs on their own (email answered, meeting booked, support chat closed, invoice sent, lead saved), each fed by a line of light from the laptop; the wall board moves the day's work to "Invoiced" |
| 03 AI assistants | Lounge corner with nobody in it: leather lounge chair, ottoman, coffee table with a laptop and a phone, smart speaker, wall screen | The phone rings and buzzes, the assistant picks up on the first ring; the laptop shows the live call (both voices as waveforms, listening/speaking, transcript, what it did: checked the calendar, booked, sent a WhatsApp confirmation), the wall screen shows the conversation, the speaker glows while it talks (one 18 s loop) |
| 04 Ads | Slatted results wall with six screens and a ticker | Ad versions tested, kept or stopped; enquiries up, cost per customer down |
| Exit | An oak door open onto a lit room, "Let's talk" in neon | Leads into the contact form |

### Around the room
A dusk city window on the left wall, stairs with a glass balustrade, the brand wall with oak slats and the neon mark, an oak meeting table with armchairs under glass pendants, track lights and downlights, shelving with books and ceramics, and plants throughout.

### Interaction
- **Hover** a station: red outline, cursor says what a click does, small sound blip (if sound is on).
- **Click** a station: flies there; click it again (or **Open details** in the caption) to open a side panel with what is included and where we start. **Esc** closes it.
- **Sound** (off by default): a generated room hum, plus a soft chime as jobs finish at the automation desk. No audio files.
- **Real / Machine**: switches the room to glowing edges with a 1-bit dither.

### Code
- `src/world/studio.js`: renderer, post-processing, camera path (`STOPS`), quality tiers, hover/click, Machine mode
- `src/world/assets.js`: loads the models, textures and the lighting map
- `src/world/room.js`: floor, walls, ceiling, stairs, city window, brand wall, lights
- `src/world/furnish.js`: meeting table and the pieces along the walls
- `src/world/stations/*.js`: one file per station, including the live screen drawings (each station's story runs on one timeline that all its screens read)
- `src/world/chair.js`, `devices.js`: the task chair; the laptop, phone, mug and notebook shared by the stations
- `src/world/kit.js`, `perf.js`: shared materials and live screens; static-mesh merging
- `src/world/bake.js`, `studio-material.js`: baked lighting (which meshes take part, loading and applying the bake) and the one shader that draws every baked surface
- `tools/bake/`: the offline lighting bake (Blender Cycles) and packing for the web; see `tools/bake/README.md`
- `src/ui/drawer.js`, `cursor.js`, `sound.js`, `form.js`: detail panel, custom cursor, optional sound, contact form
- `src/main.js`: scroll, loader, captions, floating tags, Real/Machine switch

### Assets and licences
- Furniture, plants, decor, floor and wall textures, the walnut and white-oak veneers, the wool upholstery and the leather, and the lighting map: [Poly Haven](https://polyhaven.com), CC0. `node scripts-download.cjs` fetches the sources into `assets-src/`.
- The man at the automation desk: Male_Adult_08 from the [Microsoft Rocketbox Avatar Library](https://github.com/microsoft/Microsoft-Rocketbox) (MIT). Started from its "sitting relaxed" motion capture, re-posed (leaning back, hands behind his head), given PBR materials and compressed to `public/models/man.glb` (~0.8 MB). The MIT notice ships next to it in `public/models/LICENSE-rocketbox.txt`.
- Built in code to real-world proportions: the task chair (`src/world/chair.js`: upholstered seat, curved mesh back, leather arm pads, polished aluminium base, twin-wheel castors), the laptop (unibody, real keys, glass display), the desks (continuous veneer tops with a satin lacquer), the mug, notebook, screens and job cards.

### Rendering
- **Baked lighting** (`tools/bake/`, `src/world/bake.js`): the room's light (direct light, light bounced off the walls and floor, soft shadows, contact shading) is computed offline in Blender Cycles and stored in three lightmap atlases. Every static surface is drawn by one small shader (`studio-material.js`): its own colour and texture × its lightmap, plus a roughness-blurred reflection of the room on glossy surfaces. At rest no real-time lights or shadow maps light the room; only the moving parts (the man and his chair, the job cards, the phone) keep two live lights. `?nobake` shows the live-lit version for comparison.
- **Reflections of the room itself**: a panorama of the finished room is the lighting environment for the few live-lit parts and the reflection the studio shader samples.
- **AgX tone mapping**: a film-like curve, so lamp highlights roll off softly and warm light stays natural instead of turning orange.
- Light bloom and film grain; ambient occlusion only when the bake is missing or stale.

## Influences

- **basement.studio**: a real-feeling room as the homepage, floating station tags, and the Real/Machine switch (their Human/Machine toggle).
- **Active Theory**: a cinematic space, a camera that flies between scenes, and a floating pill nav.
- **Lusion**: a 0–100 loading counter, things that react to the pointer, and a page end that leads into contact.
- **Itom**: the site as a place you explore, with crawlable text underneath.

## Before launch

- **Placeholders:** the four projects in "Recent projects" and the LinkedIn/Instagram links are placeholders (outlined in dev). The names on the station screens (for example "Brightsmile Dental") are illustrative scenes, not client claims.
- **Form:** set `data-endpoint` on `#contact-form` to a Formspree / Web3Forms / serverless URL. Without it, the form opens the visitor's email app.
- **Social image:** add `public/og.jpg` (1200×630) and an `og:image` tag.
- **Performance:** every device gets the 3D studio; phones get no MSAA, lower resolution and lighter bloom, and their own camera framing for narrow screens. Photos of each stop show while it loads; only without WebGL (or with software WebGL) do they stay, with the text over them.

## Performance

The studio adapts to the device it runs on:

- **Every device gets the 3D.** A photo of the first stop paints at once and the studio fades in over it; photos are only the loading placeholder and the fallback without WebGL. With Data Saver or on 2G the 3D waits for the first scroll or tap.
- **Quality tiers** (`TIERS` in `src/world/studio.js`): low, medium and high set resolution, anti-aliasing (MSAA), bloom and how many screens may redraw per frame. Phones start on low, others on medium. It watches real frame times and steps down after ~1.5 s of slow frames (below low, to 80% and then 65% resolution), or up once after ~5 s of very fast ones. A device still struggling on low draws every other frame, for an even pace. `?quality=low|medium|high` pins a tier.
- **Baked lighting** replaced 13 real-time lights (4 with shadow maps) and screen-space ambient occlusion with texture reads; the shader set dropped from 48 programs to 37.
- **GPU-compressed textures** (KTX2 / Basis Universal, `tools/compress-textures.mjs`): colour and roughness maps stay compressed in graphics memory and are transcoded off the main thread. With the bake, the room's normal maps are not loaded at all (the studio shader does not use them).
- **Merged geometry** (`src/world/perf.js`): everything that never moves is baked into one mesh per material at load (441 meshes → about 200).
- **No refraction**: the one glass with `transmission` (the wall clock) made three.js draw the whole room twice every frame; it is plain see-through glass now (draw calls at the first stop 360 → 195).
- **Simplified models**: heavy Poly Haven models were decimated at export (`--simplify-error` per model).
- **Live screens** are 2D canvases kept in CPU memory (`willReadFrequently`), redrawn at 6–15 fps, and only 2–4 may upload in any one frame. Stations out of view animate every 30th frame.
- **One loop**: the 3D frame runs on the same GSAP ticker as Lenis smooth scrolling, so camera and page never drift apart.
- **No blur over the canvas**: the nav, tags and switches use solid backgrounds, because `backdrop-filter` over a moving WebGL canvas is re-blurred every frame.

### Benchmarks

Production build (`vite build` + `vite preview`) opened with `?bench`: headless Chrome on Windows (ANGLE / Direct3D 11), cache off, 1440×900 at DPR 1. "Phone" is 412×915 at DPR 2 with the CPU slowed 4×. Measured 8 Nov 2026 on a laptop with Intel UHD graphics (Chrome's default) and an RTX 3050.

| | Before (live lights) | After (baked) |
|---|---|---|
| Studio ready, desktop / phone | 14.2 s / 18.8 s | 3.5–5.1 s / 8.2 s |
| First 3D frame, desktop / phone | 16.3 s / 22.4 s | 4.6–6.1 s / 9.2 s |
| Main-thread blocking (long tasks), desktop / phone | 7.2 s / 22.1 s | 1.7 s / 6.9 s |
| Scrolling the tour, Intel UHD, frames/s | 17.4 (callbacks) | 21.8 (drawn, low tier) |
| Scrolling the tour, RTX 3050, frames drawn/s (p95 frame) | not measured | 123 (15.9 ms) |
| Real-time lights / with shadow maps | 13 / 4 | 2 / 0 |
| Shader programs | 48 | 37 |
| Texture memory, estimated | 364 MB | 223 MB |
| Download | 6.0 MB | 11.8 MB |

The download grew. The bake adds 3.8 MB: geometry with lightmap UVs (2.0 MB) and three ETC1S lightmaps (1.85 MB). The Basis transcoder adds 0.5 MB. ETC1S textures are also 1.4 MB larger than the WebP files they replace, in exchange for staying compressed on the GPU. "Before" could not be re-measured on the RTX 3050. Its frame rate counts animation-frame callbacks, which over-counts a device drawing every other frame; the "after" figures count frames actually drawn.

To re-export models after changing them, see the `gltf-transform optimize ... --simplify-error` commands used in `assets-src/` (sources are not shipped).
