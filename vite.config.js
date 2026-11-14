import { defineConfig } from "vite";
import { createHash } from "node:crypto";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

/* The stylesheet is small (≈5 KB gzipped), so it is written straight into index.html at build time:
   one less request standing between the visitor and the first paint. */
function inlineCss() {
  return {
    name: "inline-css",
    apply: "build",
    enforce: "post",
    transformIndexHtml: {
      order: "post",
      handler(html, ctx) {
        for (const f of Object.values(ctx.bundle || {})) {
          if (f.type !== "asset" || !f.fileName.endsWith(".css")) continue;
          const link = new RegExp(`<link[^>]+href="/${f.fileName.replace(/[.]/g, "\\.")}"[^>]*>`);
          html = html.replace(link, () => `<style>${f.source}</style>`);
        }
        return html;
      },
    },
  };
}

/* Asset versions (see src/asset-url.js): a short hash of every file in each public folder the
   studio loads from. Changing one model gives every model URL a new version, so browsers fetch
   the new files instead of showing the previous studio from their cache. */
const VERSIONED = ["models", "textures", "bake", "env", "posters", "projects"];
function folderHash(dir) {
  const h = createHash("sha1");
  const walk = (d) => {
    for (const name of readdirSync(d).sort()) {
      const p = join(d, name);
      if (statSync(p).isDirectory()) walk(p);
      else h.update(name).update(readFileSync(p));
    }
  };
  try { walk(dir); } catch { return null; }
  return h.digest("hex").slice(0, 10);
}
const assetVersions = Object.fromEntries(VERSIONED.map((f) => [f, folderHash(join("public", f))]).filter(([, v]) => v));

/* index.html names the first loading photo itself: give those URLs their version too */
function versionHtmlAssets() {
  return {
    name: "version-html-assets",
    transformIndexHtml(html) {
      return html.replace(/\/(posters|projects)\/[^\s"'?]+/g, (url, folder) => (assetVersions[folder] ? `${url}?v=${assetVersions[folder]}` : url));
    },
  };
}

/* The 3D studio is loaded with a dynamic import, which the browser only discovers once the page's
   script runs; then the models only once the studio's code has arrived. Naming the studio's
   chunks in the HTML lets the browser fetch them alongside the page script instead. */
function preloadStudio() {
  return {
    name: "preload-studio",
    apply: "build",
    enforce: "post",
    transformIndexHtml: {
      order: "post",
      handler(html, ctx) {
        const chunks = Object.values(ctx.bundle || {}).filter((c) => c.type === "chunk");
        const studio = chunks.find((c) => c.facadeModuleId && /world[\\/]studio\.js$/.test(c.facadeModuleId));
        if (!studio) return html;
        const files = [studio.fileName, ...studio.imports];
        const tags = files.map((f) => `<link rel="modulepreload" crossorigin href="/${f}">`).join("\n  ");
        return html.replace("</head>", `  ${tags}\n</head>`);
      },
    },
  };
}

export default defineConfig({
  plugins: [inlineCss(), versionHtmlAssets(), preloadStudio()],
  define: { __ASSET_V__: JSON.stringify(assetVersions) },
  server: { port: 5177, host: true },
  build: { outDir: "dist", emptyOutDir: true, chunkSizeWarningLimit: 1100 },
});
