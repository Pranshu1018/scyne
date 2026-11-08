/* Loading photos: captures every camera stop of the running studio and writes public/posters/.

   The photos stand in while the 3D loads (and stay where WebGL is missing), and the studio fades
   in over them, so they must show the studio as it is now. Re-run after changing how it looks;
   otherwise every reload flashes the previous version before the 3D takes over.

   usage (with the dev server running, `npm run dev`):
     node tools/posters.cjs [http://localhost:5177]
   needs Chrome and puppeteer-core (PUPPETEER_CORE=<path to puppeteer-core> if it is not installed
   here); encodes with sharp. Landscape 1920 × 1200 and portrait 1080 × 1920 shots, each written
   as AVIF and WebP at the widths main.js asks for. */

const path = require("path");
const fs = require("fs");
const puppeteer = require(process.env.PUPPETEER_CORE || "puppeteer-core");
const sharp = require("sharp");

const BASE = (process.argv[2] || "http://localhost:5177").replace(/\/$/, "");
const OUT = path.join(__dirname, "..", "public", "posters");
const CHROME = process.env.CHROME || "C:/Program Files/Google/Chrome/Application/chrome.exe";
const SHOTS = [
  { o: "land", w: 1920, h: 1200, widths: [960, 1440, 1920] },
  { o: "port", w: 1080, h: 1920, widths: [480, 720, 840, 1080] },
];
// the poster names main.js uses, by camera stop
const NAME = { intro: "intro", websites: "websites", automation: "automation", assistants: "assistants", ads: "ads", contact: "contact" };

/* write a file, retrying briefly: on Windows a file the dev server is serving can be locked */
async function save(file, buf) {
  for (let i = 0; ; i++) {
    try { fs.writeFileSync(file, buf); return; } catch (e) {
      if (i >= 10) throw e;
      await new Promise((r) => setTimeout(r, 300));
    }
  }
}

(async () => {
  const browser = await puppeteer.launch({
    executablePath: CHROME, headless: true,
    args: ["--use-angle=d3d11", "--ignore-gpu-blocklist", "--enable-gpu", "--force_high_performance_gpu", "--hide-scrollbars"],
  });
  try {
    for (const shot of SHOTS) {
      const page = await browser.newPage();
      await page.setViewport({ width: shot.w, height: shot.h, deviceScaleFactor: 1 });
      await page.goto(`${BASE}/?still&quality=high`, { waitUntil: "load", timeout: 120000 });
      await page.waitForFunction(() => performance.getEntriesByName("scyne:first-frame").length > 0, { timeout: 180000, polling: 250 });
      // only the 3D: no text, no photos underneath, no fade
      await page.addStyleTag({ content: "body{visibility:hidden!important} .world{visibility:visible!important;opacity:1!important;transition:none!important}" });
      const stops = await page.evaluate(() => window.__studio.stops.map((s) => s.id));
      for (let i = 0; i < stops.length; i++) {
        await page.evaluate((p) => { const S = window.__studio; S.state.active = true; S.state.progress = p; }, i / (stops.length - 1));
        await new Promise((r) => setTimeout(r, 2500)); // screens redraw, the camera settles
        const png = await page.screenshot({ type: "png" });
        const name = NAME[stops[i]] || stops[i];
        for (const w of shot.widths) {
          const img = sharp(png).resize({ width: w });
          await save(path.join(OUT, `${name}-${shot.o}-${w}.avif`), await img.clone().avif({ quality: 52, effort: 6 }).toBuffer());
          await save(path.join(OUT, `${name}-${shot.o}-${w}.webp`), await img.clone().webp({ quality: 80, effort: 6 }).toBuffer());
        }
        console.log(`${name} ${shot.o}`);
      }
      await page.close();
    }
  } finally { await browser.close(); }
  const kb = fs.readdirSync(OUT).reduce((s, f) => s + fs.statSync(path.join(OUT, f)).size, 0) / 1024;
  console.log(`posters: ${Math.round(kb)} KB in ${OUT}`);
})().catch((e) => { console.error(e); process.exit(1); });
