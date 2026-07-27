# Site agent notes

This is the Astro + Cloudflare Worker site for `https://swipe.md`.

## Commands

Run from the repository root:

```sh
pnpm dev
pnpm check
pnpm build
pnpm site:deploy:dry-run
```

## Rules

- Keep the existing homepage composition and Alpine background-card behavior
  intact.
- Use Astro components for shared site chrome, content pages, issue pages, and tools.
- Keep canonical metadata, Open Graph tags, structured data, navigation, and
  footer behavior in `src/layouts/Layout.astro`.
- Use `src/components/content` before writing page-specific versions of the
  same pattern.
- General Markdown/MDX pages live in `src/content/pages`.
- Newsletter issues live in `src/content/issues` and use the shared issue
  dialect from the newsletter core.
- The issue parser exists in the site and newsletter core. The build parity
  check must keep the copies identical.
- Keep pages slashless and generate exact sitemap XML into `public/`.
- The same-origin `/api/subscribe` route owns the public signup boundary. It
  forwards to the newsletter API without exposing its token.
- The public SES endpoint is `/api/webhooks/<secret>/ses`. Its route lives at
  `src/pages/api/webhooks/[secret]/ses.ts` and proxies to the newsletter VPS.
- Keep the Worker `NEWSLETTER_WEBHOOK_SECRET` equal to the VPS
  `AWS_SNS_WEBHOOK_SECRET`. The Worker rejects invalid paths at the edge, while
  the VPS still owns SNS topic allowlisting and signature verification.
- Keep Astro's global `security.checkOrigin` disabled. SNS sends webhook POSTs
  as `text/plain` without a browser `Origin` header, so Astro otherwise rejects
  them before the secret and signature checks run.
- Never log or display the complete webhook URL.
- `NEWSLETTER_API_URL` may stay on `https://list.ian.is` as the private origin
  during migration. Do not create a public `list.swipe.md` surface.
- Keep the homepage prerendered. Use Alpine for its form and background-card
  behavior. Do not add a client framework or route `/` through the Worker.
- Use a Cloudflare Redirect Rule for `www.swipe.md` to `swipe.md`.
- Keep `nodejs_compat` enabled because Astro server output uses `process`.
- Do not deploy or attach Cloudflare routes unless the user asks.
- Use `pnpm`, not npm.
