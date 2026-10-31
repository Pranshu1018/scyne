import { defineConfig } from "vite";

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

export default defineConfig({
  plugins: [inlineCss()],
  server: { port: 5177, host: true },
  build: { outDir: "dist", emptyOutDir: true, chunkSizeWarningLimit: 1100 },
});
