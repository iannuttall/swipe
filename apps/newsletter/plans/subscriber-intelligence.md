# Subscriber Intelligence Build Plan

This is the implementation checklist for making contact intelligence first-class
across core, CLI, API, MCP, docs, and the skill.

## Principles

- Core owns all behavior. CLI, API, and MCP only parse, authorize, and call core.
- `contact_id` is canonical. Email is an address, not the only identity.
- Raw events and ledgers are source of truth. Rollups are derived and rebuildable.
- Suppressions/unsubscribes always win over tags, segments, and imports.
- Mutations must be idempotent where external systems retry.
- Audience preview and broadcast creation must use the same resolver.
- Agents get powerful tools, but sends/rebuilds still need explicit confirmation.

## Data Model

- `tags` / `contact_tags`: existing schema becomes fully supported in store/core.
- `contact_external_ids`: provider-scoped identity map for Stripe/customer/app IDs.
- `purchases`: immutable purchase ledger with provider IDs, idempotency keys, amount
  in minor units, currency, product key/name, and metadata.
- `contact_value_rollups`: per-contact, per-currency LTV rollup rebuilt from
  `purchases`.
- Existing `events`: records `contact.tagged` and `contact.purchase_recorded`.
- Existing link/contact link rollups: public rebuild operation for recovery and
  metadata changes.

## Audience Rules

Audience filters support:

- include/exclude contact tags
- include/exclude link topics
- include/exclude link tags
- sponsor clicked
- purchased/excluded product keys
- minimum/maximum LTV by currency
- limit for previews/local tests

Preview returns:

- matching active contacts
- suppressed contacts excluded
- sample contacts
- applied audience rule object

Broadcast creation accepts the same audience object and freezes planned recipients
into messages at creation time.

## Core Tasks

- Add Drizzle schema and SQL migration for external IDs, purchases, and LTV rollups.
- Add shared typed inputs/results for tags, purchases, external IDs, audience
  filters, previews, and rollup rebuilds.
- Implement `MemoryEmailStore` and `PostgresEmailStore` support.
- Add platform methods:
  - `tagContact`
  - `untagContact`
  - `listContactTags`
  - `upsertContactExternalId`
  - `findContactByExternalId`
  - `recordPurchase`
  - `getContactValue`
  - `previewAudience`
  - `rebuildAnalyticsRollups`
- Extend `createBroadcast` to accept `audience` and `deliveryPolicy`.

## Interface Tasks

- CLI:
  - contact tag/list/untag
  - contact external-id
  - contact value
  - purchase record
  - audience preview
  - segmented broadcast creation through `--audience-file`
  - analytics rebuild-rollups
- API:
  - protected contact tag/external ID/purchase/value endpoints
  - protected audience preview endpoint
  - protected rollup rebuild endpoint
  - extend protected broadcast creation body with audience/delivery policy
- MCP:
  - mirror the same safe primitives for agent callers
  - require confirmation for rollup rebuilds
- Docs:
  - README human workflows
  - AGENTS.md coding rules
  - `skills/email-newsletter/SKILL.md` agent workflows

## Quality Gates

Each completed slice must run:

```bash
pnpm exec biome check . --write
pnpm typecheck
pnpm test
pnpm build
pnpm lint
docker compose config
git status --short
```

Database-sensitive slices also run core integration tests against local Postgres.

## File Size Rule

New modules should stay below 350 lines. Existing large modules are grandfathered
only while being split; new feature work should move reusable behavior into small
core modules instead of making `store.ts`, `postgres-store.ts`, `platform.ts`,
`api/index.ts`, `cli/index.ts`, or `mcp/index.ts` larger.
