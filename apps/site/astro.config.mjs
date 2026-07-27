// @ts-check
import { defineConfig } from "astro/config";
import cloudflare from "@astrojs/cloudflare";
import mdx from "@astrojs/mdx";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  site: "https://swipe.md",
  output: "server",
  trailingSlash: "never",
  security: {
    checkOrigin: false,
  },
  integrations: [mdx()],
  session: {
    driver: {
      entrypoint: new URL("./src/lib/session/noop-driver.ts", import.meta.url),
    },
  },
  vite: {
    plugins: [tailwindcss()],
    optimizeDeps: {
      include: ["astro/virtual-modules/transitions.js"],
    },
    resolve: {
      alias: {
        "@": new URL("./src", import.meta.url).pathname,
      },
    },
  },
  adapter: cloudflare({
    configPath: "./wrangler.jsonc",
    remoteBindings: false,
    imageService: "passthrough",
  }),
});
