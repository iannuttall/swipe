# Agent Notes

This package is the operator and agent CLI for the newsletter platform.

Read `../../AGENTS.md` first.

## Rules

- Keep domain behavior in `@email/core`.
- Prefer `--json` for machine-facing output.
- Risky send or queue mutation commands must require explicit confirmation.
- Never prompt in JSON mode.
- Keep command handlers thin: parse flags, call core, print output.

## Validation

From the monorepo root:

```sh
pnpm newsletter:lint
pnpm newsletter:typecheck
pnpm newsletter:test
```
