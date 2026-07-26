// @ts-check
import { defineConfig } from "astro/config";
import cloudflare from "@astrojs/cloudflare";
import mdx from "@astrojs/mdx";
import react from "@astrojs/react";
import tailwindcss from "@tailwindcss/vite";

const reactRuntimeDeps = [
  "react",
  "react-dom",
  "react-dom/client",
  "react-dom/server",
  "react/jsx-runtime",
  "react/jsx-dev-runtime",
];

export default defineConfig({
  site: "https://swipe.md",
  output: "server",
  trailingSlash: "never",
  integrations: [mdx(), react()],
  session: {
    driver: {
      entrypoint: new URL("./src/lib/session/noop-driver.ts", import.meta.url),
    },
  },
  vite: {
    plugins: [tailwindcss()],
    optimizeDeps: {
      include: [...reactRuntimeDeps, "astro/virtual-modules/transitions.js"],
    },
    ssr: {
      optimizeDeps: {
        exclude: ["clsx", "tailwind-merge"],
      },
    },
    resolve: {
      alias: {
        "@": new URL("./src", import.meta.url).pathname,
      },
      dedupe: ["react", "react-dom"],
    },
  },
  adapter: cloudflare({
    configPath: "./wrangler.jsonc",
    remoteBindings: false,
    imageService: "passthrough",
  }),
});
