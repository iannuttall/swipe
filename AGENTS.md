# Agent Notes

This is the static Astro site for `swipe.md`.
This deploys as an Astro app on Cloudflare Workers with prerendered static HTML/assets.

## Commands

```sh
pnpm install
pnpm dev
pnpm dev:cf
pnpm build
pnpm generate-types
```

## App Rules

- Keep the homepage prerendered unless a real runtime need appears.
- Do not use `assets.run_worker_first` for static pages.
- Use a Cloudflare Redirect Rule for `www.swipe.md` -> `swipe.md`.
- Add a narrow Worker-first route, for example `/api/*`, only when a runtime API such as `/api/subscribe` exists.
- Use `pnpm`, not npm.
- Keep the home page visually aligned with the archived README `/readme` route until a component system is introduced.
- Follow the shared content and design rules from the Workers blueprint for public copy and UI.
