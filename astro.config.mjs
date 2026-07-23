// @ts-check
import { defineConfig } from "astro/config";
import cloudflare from "@astrojs/cloudflare";
import react from "@astrojs/react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  site: "https://swipe.md",
  output: "server",
  trailingSlash: "never",
  integrations: [react()],
  session: {
    driver: {
      entrypoint: new URL("./src/lib/session/noop-driver.ts", import.meta.url),
    },
  },
  vite: {
    plugins: [tailwindcss()],
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
