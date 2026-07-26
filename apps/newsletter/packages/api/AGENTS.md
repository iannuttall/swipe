# Agent Notes

This package is the Hono HTTP API for the newsletter platform.

Read `../../AGENTS.md` first.

## Rules

- Keep domain behavior in `@email/core`.
- API code should parse input, authorize requests, call core, and return
  structured responses.
- Protect admin routes with `API_TOKEN`.
- Public webhook routes must keep provider verification in place.
- Unsubscribe must require confirmation; never let scanner `GET` requests change
  consent state.

## Validation

From the monorepo root:

```sh
pnpm newsletter:lint
pnpm newsletter:typecheck
pnpm newsletter:test
```
