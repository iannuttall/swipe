# Agent Notes

This package is the Astro SSR public web surface for the newsletter platform.

Read `../../AGENTS.md` first.

## Rules

- Keep public human-facing pages here.
- Keep mutation and business logic in `@email/core` and `@email/api`.
- Use `EMAIL_API_INTERNAL_URL` for web-to-api mutations.
- Do not change the unsubscribe page design or behavior unless the user asks.
- Keep the page visually aligned with `apps/site`, but avoid importing site code
  directly until a shared package preserves exact output and removes real
  duplication.

## Validation

From the monorepo root:

```sh
pnpm newsletter:lint
pnpm newsletter:typecheck
pnpm newsletter:build
```
