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
- `src/ui/drawer.js`, `cursor.js`, `sound.js`, `form.js`: detail panel, custom cursor, optional sound, contact form
- `src/main.js`: scroll, loader, captions, floating tags, Real/Machine switch

### Assets and licences
- Furniture, plants, decor, floor and wall textures, the walnut and white-oak veneers, the wool upholstery and the leather, and the lighting map: [Poly Haven](https://polyhaven.com), CC0. `node scripts-download.cjs` fetches the sources into `assets-src/`.
- The man at the automation desk: Male_Adult_08 from the [Microsoft Rocketbox Avatar Library](https://github.com/microsoft/Microsoft-Rocketbox) (MIT). Started from its "sitting relaxed" motion capture, re-posed (leaning back, hands behind his head), given PBR materials and compressed to `public/models/man.glb` (~0.8 MB). The MIT notice ships next to it in `public/models/LICENSE-rocketbox.txt`.
- Built in code to real-world proportions: the task chair (`src/world/chair.js`: upholstered seat, curved mesh back, leather arm pads, polished aluminium base, twin-wheel castors), the laptop (unibody, real keys, glass display), the desks (continuous veneer tops with a satin lacquer), the mug, notebook, screens and job cards.

### Rendering
- **Reflections of the room itself**: once everything is built, the studio is rendered into a cube map from the middle of the room and used as the lighting environment, so chrome, glass, lacquer and the floor reflect the real walls and lamps, and surfaces pick up warm bounced light.
- **AgX tone mapping**: a film-like curve, so lamp highlights roll off softly and warm light stays natural instead of turning orange.
- Ambient occlusion on the medium and high tiers, shadow maps, light bloom and film grain.

## Influences

- **basement.studio**: a real-feeling room as the homepage, floating station tags, and the Real/Machine switch (their Human/Machine toggle).
- **Active Theory**: a cinematic space, a camera that flies between scenes, and a floating pill nav.
- **Lusion**: a 0–100 loading counter, things that react to the pointer, and a page end that leads into contact.
- **Itom**: the site as a place you explore, with crawlable text underneath.

## Before launch

- **Placeholders:** the four projects in "Recent projects" and the LinkedIn/Instagram links are placeholders (outlined in dev). The names on the station screens (for example "Brightsmile Dental") are illustrative scenes, not client claims.
- **Form:** set `data-endpoint` on `#contact-form` to a Formspree / Web3Forms / serverless URL. Without it, the form opens the visitor's email app.
- **Social image:** add `public/og.jpg` (1200×630) and an `og:image` tag.
- **Performance:** phones get no shadows, no MSAA, lower resolution and lighter bloom, and their own camera framing for narrow screens. If a device has no WebGL, the tour falls back to text over a dark background.

## Performance

The studio adapts to the device it runs on:

- **Quality tiers** (`TIERS` in `src/world/studio.js`): low, medium (with ambient occlusion) and high. Phones and integrated or mobile graphics (Intel, Mali, Adreno and similar, read from the WebGL renderer name) start on low; dedicated graphics start on medium. It watches real frame times and steps down after ~1.5 s of slow frames, or up once after ~5 s of very fast ones. Each tier sets resolution, anti-aliasing (MSAA), ambient occlusion and how many screens may redraw per frame.
- **Merged geometry** (`src/world/perf.js`): everything that never moves is baked into one mesh per material at load (473 meshes → about 170).
- **Shadows** are rendered once at load; nothing in the room moves enough to need them redrawn.
- **Simplified models**: heavy Poly Haven models were decimated at export (`--simplify-error` per model), cutting the frame from ~1.8M to ~370k triangles.
- **Live screens** are 2D canvases kept in CPU memory (`willReadFrequently`), so turning them into textures is a plain upload instead of a slow read back from the GPU. They redraw at 6–15 fps, the large ones at a lower internal resolution (`res`), and only 2–4 may upload in any one frame, so frame times stay even. Stations out of view animate every 30th frame.
- **Lights**: area lights are the costliest, so only two remain (the city window and the ads wall); screens no longer cast light. Ambient occlusion runs at half resolution.
- **One loop**: the 3D frame runs on the same GSAP ticker as Lenis smooth scrolling, so camera and page never drift apart.
- **No blur over the canvas**: the nav, tags and switches use solid backgrounds, because `backdrop-filter` over a moving WebGL canvas is re-blurred every frame.

To re-export models after changing them, see the `gltf-transform optimize ... --simplify-error` commands used in `assets-src/` (sources are not shipped).
