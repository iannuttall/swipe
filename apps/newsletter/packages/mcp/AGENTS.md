# Agent Notes

This package is the stdio MCP server for the newsletter platform.

Read `../../AGENTS.md` first.

## Rules

- Keep domain behavior in `@email/core`.
- MCP tools should be thin wrappers around core capabilities.
- Prefer structured, agent-friendly outputs.
- Risky send or queue mutation tools must require explicit confirmation fields.
- Keep tool names stable; do not make them depend on runtime branding.

## Validation

From the monorepo root:

```sh
pnpm newsletter:lint
pnpm newsletter:typecheck
pnpm newsletter:test
```
