# App Map For Agents

This app is an agent-first newsletter platform. The stable rule is simple:
business logic lives in `packages/core`; every other package is an interface.

## Packages

- `packages/core`: domain logic, config, database stores, migrations, template
  rendering, delivery planning, tracking, analytics, provider abstraction, and
  production readiness checks.
- `packages/cli`: command parsing, JSON output, and local/operator UX.
- `packages/api`: Hono HTTP API for sites, admin calls, tracking, unsubscribe,
  and provider webhooks.
- `packages/web`: Astro SSR public pages for humans, such as unsubscribe
  confirmation.
- `packages/mcp`: stdio MCP tools for agents.
- `skills/email-newsletter`: installable instructions for external agents.
- `migrations`: SQL migrations run by `email db migrate`.

## Interface Rule

When adding a capability:

1. Add the behavior to `packages/core`.
2. Add tests at the core level.
3. Expose it through CLI/API/MCP if it is useful to operators, sites, or agents.
4. Add Astro web only for human-facing public pages.
5. Keep interface code thin: parse input, authorize, call core, return
   structured output.

Do not copy segmentation, suppression checks, scheduling, provider send logic,
unsubscribe mutation, or analytics rollup logic into interface packages.

## Data Model Intent

- Contacts use internal contact IDs as canonical identity.
- Emails are contact attributes, not the only identity.
- Suppressions are hard blocks for bounces, complaints, manual blocks, and bad
  domains. Unsubscribe is contact consent state.
- Messages are planned/sent delivery records.
- Events are append-only source data for tracking and lifecycle history.
- Rollups are derived and must be rebuildable.
- Purchases are ledger records. Lifetime value is derived from the ledger.

## Validation

Before committing:

```bash
pnpm exec biome check . --write
pnpm typecheck
pnpm test
pnpm build
pnpm lint
```

For database-sensitive changes, also run the Postgres integration tests against
a real local database.
