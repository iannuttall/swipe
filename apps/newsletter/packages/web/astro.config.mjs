// @ts-check
import node from '@astrojs/node'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'astro/config'

const site = process.env.BASE_URL ?? 'https://newsletter.example.com'
const siteUrl = new URL(site)

export default defineConfig({
  site,
  output: 'server',
  adapter: node({
    mode: 'standalone',
  }),
  security: {
    allowedDomains: [
      {
        hostname: siteUrl.hostname,
        protocol: siteUrl.protocol.slice(0, -1),
        ...(siteUrl.port ? { port: siteUrl.port } : {}),
      },
    ],
  },
  trailingSlash: 'never',
  vite: {
    plugins: [tailwindcss()],
    resolve: {
      alias: {
        '@': new URL('./src', import.meta.url).pathname,
      },
    },
  },
})
