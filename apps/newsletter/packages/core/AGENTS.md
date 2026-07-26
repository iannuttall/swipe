# Agent Notes

This package is the newsletter domain core.

Read `../../AGENTS.md` first.

## Rules

- Business logic belongs here before it is exposed through CLI, API, MCP, or web.
- Keep Postgres behavior, in-memory behavior, and tests aligned.
- Never store raw tracking tokens; store hashes.
- Do not count bot/scanner activity as human engagement.
- Queue claiming must stay concurrency-safe.
- Add SQL migrations for schema changes and keep migrations linear.

## Validation

From the monorepo root:

```sh
pnpm newsletter:lint
pnpm newsletter:typecheck
pnpm newsletter:test
```

For database-sensitive changes, also run the Postgres integration tests:

```sh
INTEGRATION_DATABASE_URL=postgresql://email:email@127.0.0.1:5432/email_test pnpm --filter @email/core test
```
