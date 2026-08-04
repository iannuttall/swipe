# Agent Notes

This app is the agent-first email/newsletter platform inside the Swipe
monorepo. Treat it as production marketing infrastructure, not a demo CLI.

## Core Rule

Keep business logic in `packages/core`.

The other packages are interfaces:

- `packages/cli`: command-line and script/agent UX.
- `packages/api`: HTTP endpoints for sites, tracking, webhooks, and admin calls.
- `packages/web`: Astro SSR public pages such as unsubscribe confirmation.
- `packages/mcp`: stdio MCP tools for agents.

Do not duplicate domain behavior in CLI/API/MCP. Add it to core, then expose it
through the interfaces.

## Focused Agent Docs

Read these before touching the matching part of the app:

- `agents/app-map.md`: package boundaries and where behavior belongs.
- `agents/production-readiness.md`: pre-send audit flow, rollout checks, and
  emergency operations.

When production data or sending is involved, read
`agents/production-readiness.md` first.

## Runtime

- Node 24 LTS.
- pnpm workspace.
- Postgres for persistent state.
- Astro SSR for public human-facing pages.
- SQL migrations live in `migrations`.
- Docker uses pnpm's injected workspace packages and modern `pnpm deploy` so
  runtime packaging reuses the installed store without another registry pass.
- `app`, `web`, `ops`, and `worker` share one `APP_IMAGE` and one anchored
  Compose build definition. VPS inventory builds `app` once; do not add the
  other services back to `buildServices`.
- Production deploy is scoped to this app. GitHub Actions builds
  `apps/newsletter/Dockerfile`, syncs root workspace files plus
  `apps/newsletter/**`, runs `apps/newsletter/docker-compose.prod.yml`, migrates
  with `ops`, and starts `postgres`, `app`, and `web`.
- The sender `worker` is never part of the normal deploy start set; it stays
  behind the explicit `sender` profile.

## Validation

Run from the monorepo root before committing newsletter changes:

```bash
pnpm swipe check newsletter
pnpm swipe build newsletter
pnpm newsletter:lint
pnpm newsletter:typecheck
pnpm newsletter:test
pnpm newsletter:build
docker compose -f apps/newsletter/docker-compose.yml config
```

For web-only changes, the short commands are:

```bash
pnpm swipe check newsletter-web
pnpm swipe build newsletter-web
```

`pnpm lint` includes `scripts/check-file-lines.mjs`. New TypeScript modules
are capped at 350 lines unless there is a deliberate allowlist entry.

For database-sensitive changes, also run the integration tests against a real
Postgres database:

```bash
INTEGRATION_DATABASE_URL=postgresql://email:email@127.0.0.1:5432/email_test pnpm --filter @email/core test
```

For runtime/Docker changes, also run:

```bash
docker build -f apps/newsletter/Dockerfile -t email-cli-final .
docker run --rm email-cli-final node dist/index.js help
```

The compose worker is behind the `sender` profile. A normal
`docker compose -f apps/newsletter/docker-compose.yml up` must not start the
sender. Use
`docker compose -f apps/newsletter/docker-compose.yml --profile sender up worker`
only after production readiness checks pass.

## Config Rules

Prefer solid defaults in code. Avoid adding environment variables unless the
value is genuinely deployment-specific.

Acceptable env vars:

- app display name
- secrets
- public/base URLs
- database connection strings
- provider credentials
- coarse operational toggles, such as `EMAIL_TRACK_OPENS`

Sender identity must stay provider-agnostic:

- `EMAIL_FROM_EMAIL`
- `EMAIL_FROM_NAME`

Provider-specific settings should stay namespaced, for example `AWS_*`.

`APP_NAME` is runtime branding. It should affect display/metadata only. Do not
rename the CLI binary, package names, route paths, or MCP tool names based on
`APP_NAME`; those are stable integration contracts.

Human-facing public pages should live in `packages/web`. Keep mutation and
business logic in `packages/core` and `packages/api`; web pages can call the
internal API with `EMAIL_API_INTERNAL_URL`.

## Safety Rules

- Risky send actions must require explicit confirmation.
- JSON mode is for scripts and agents. Never prompt in JSON mode.
- Never send to the real provider from tests.
- Never store raw tracking tokens; store hashes.
- Do not count bot/scanner events as human engagement.
- Do not let unsubscribe scanners suppress users through `GET`.
- Do not re-add suppressed contacts as active by accident.
- Keep API admin routes protected by `API_TOKEN`.
- Never create a suppression row with both `email` and `domain`. That can turn
  one address into a whole-domain block.
- Never convert a single Gmail/Yahoo/etc address into a domain suppression.
  This is a general production safety rule, not just a migration concern.

## Delivery Rules

The default broadcast behavior is intentional:

- spread delivery over time
- rank prior clickers first
- rank prior openers next
- then recent subscribers
- then cold contacts

Provider sends are throttled in core with `EMAIL_SEND_RATE_PER_SECOND`.
`send due --limit` and `worker send --batch-size` only control queue claim size;
do not bypass `sendDue` for production sending.

Postgres queue claiming must remain concurrency-safe. Use `FOR UPDATE SKIP
LOCKED` or an equivalent approach so multiple workers cannot send the same
message.

## Tracking And Analytics Rules

This project is data-first, not dashboard-first. Preserve raw events and keep
fast rollups useful for agents.

Important signals:

- repeated clicks by the same subscriber
- human vs bot click separation
- link topics
- link tags
- sponsors/advertisers
- URL host and UTM metadata
- per-contact interests
- contact tags
- external customer IDs
- purchase ledgers
- lifetime value rollups
- aggregate link/topic/sponsor performance

Open tracking is optional. If `EMAIL_TRACK_OPENS=false`, do not emit open pixel
events or inferred opens from clicks.

## Template Rules

Markdown is the authoring format. The default template is the normal Swipe
React Email shell.

Emails must stay composable and deterministic: write campaign bodies in
Markdown, then use shared component-style blocks such as `<Links>` and `<Box>`
for layout. These blocks are parsed as data; do not execute arbitrary MDX or
create custom React email components for one campaign. If a new visual pattern
is needed, add it as a reusable section in `packages/core` and cover it with
render tests. For multi-item blocks like `<Links>` and `<Classifieds>`, start
each item with a normal Markdown heading. Classifieds button attrs are `button`
and `button-url`. The legacy `:::` dialect stays supported for published issues
but must not be used for new drafts.

New Swipe picks use one first-class `<Item>` block per pick. `id` and `title`
are required. Use `url` for the destination and a four-to-five-word `summary`
for the contents list. The item body starts with one short sentence explaining
what it is, followed by a required `<Why>` block and a required `<Try>` block.
Keep that opening description to 5 to 12 words so it stays on one email line.
Put the explanation in `<Why>` and `<Try>`. Each block normally takes two or
three short sentences. The
contents list uses the same small square bullet for every item. Full item
details have no leading symbol.

Set `sponsor="true"` for a paid placement. Sponsored items are ads, not
editorial reviews. They use the same what, `<Why>`, and `<Try>` shape so the
reader gets a useful example, but the copy is an ad rather than an editorial
verdict. Do not add legacy `<Like>` or `<Dislike>` blocks to a sponsor. The
default paid label is `[sponsor]`; use `sponsor-label` only when an issue needs
different wording. Archive anchors are generated from item IDs. Email contents
links use the full
`https://swipe.md/issues/<slug>#<item-id>` URL because local email anchors are
not reliable across clients.

Author items in display order. A sponsor goes first when present. A normal
issue contains up to five tools and up to five skills, loops, or workflows;
these are ceilings rather than quotas. Sponsor responses use
`mailto:ian@swipe.md?subject=Sponsor%20Swipe` until the placement has enough
data to justify a landing page.

Use `<ReachOut>` for the closing action list and `<Disclosure>` for the final
editorial note. When a draft has a stable name, the template adds the direct
`/issues/<slug>.md` agent link before the disclosure.

Legacy section blocks can still define their own markers. First-class item
details do not use them.

Run `pnpm email:logo` from `apps/newsletter` after changing the logo source.
It creates the light and dark static PNGs used in the email header and footer.
`pnpm swipe issue preview` points those assets at `http://localhost:4321`;
test and send renders keep the production `https://swipe.md` asset base.

There is no poll block. Polls cannot be answered inside an email without a
round trip, and the archive could only ever show them as dead options.

Available templates:

- `default`: Swipe shell. Body text renders at 18px; it accepts component
  blocks (`<Item>`, `<ReachOut>`, `<Disclosure>`, `<Links>`, `<Sponsor>`,
  `<Box>`, `<Classifieds>`, `<Quote>`) for mixed campaigns. Use
  `<Header name="Issue 001" />` to override the top-right label.
  `<Conditional if="status:cold">` is the only recipient condition; it is
  hidden from the public archive.

Before real sends, render the email locally:

```bash
pnpm swipe newsletter render --subject "Subject" --body-file apps/newsletter/draft.md --out-dir apps/newsletter/rendered-email
```

When adding template behavior, keep rendering in `packages/core`, then expose it
through CLI, API, and MCP.

## Subscriber Intelligence Rules

Email is not the only identity. Use the internal contact ID as canonical and
store provider/customer IDs in `contact_external_ids`.

Purchases are ledger records. Do not store lifetime value only as contact
attributes. Record the purchase, dedupe with provider/external IDs or
idempotency keys, and let `contact_value_rollups` be rebuilt.

Tags are contact labels. Link tags are link metadata. Keep API names explicit
when both concepts appear.

Audience preview and broadcast creation must use the same core audience resolver.
Do not implement separate segmentation logic in CLI, API, or MCP.

Canary sends must also use the same core planner. Promotion steps are cumulative:
50, then 500, then 2,000 means add the next 450, then the next 1,500, not resend
the earlier cohorts.

Rollups must be rebuildable from raw events and ledgers. If a change affects
rollup semantics, add tests for both write-time updates and rebuilds.

## Migrations

- Add SQL migrations for schema changes.
- Keep migrations linear and clean on a fresh database.
- Do not edit old migrations casually after release. This repo is still early,
  but production migrations should become append-only once deployed.
- Keep Drizzle schema and SQL migrations in sync.
- Run the Postgres integration tests for queue, migration, and rollup changes.

## Provider Abstraction

SES is the first production provider, but the core should stay provider-neutral.

Provider-specific behavior belongs behind the provider interface or in clearly
named provider webhook normalization code. Future providers, such as Cloudflare
email sending, should not require rewriting broadcast planning, tracking,
suppressions, analytics, or interface code.

## Interface Expectations

When adding a core capability, consider exposing it in all relevant surfaces:

- CLI for operators and local agents.
- HTTP API for sites and remote automation.
- Astro web only when a human-facing public page is needed.
- MCP for coding/research agents.

Keep interface code thin: parse input, authorize if needed, call core, return
structured output.

For production operations, prefer `ops checklist` / `email_get_ops_checklist`
before sending. Queue recovery must go through confirmed core methods such as
`ops recover-stuck --yes` or `email_recover_stuck_messages` with `confirm: true`.

For local Gmail-alias smoke tests, use `contact seed-intelligence` when the test
needs tags, external IDs, purchases, LTV rollups, and audience previews.

## Commit Style

Use conventional commits:

```bash
feat(core): add subscriber interest rollups
fix(worker): prevent duplicate queue claims
test(core): cover postgres broadcast claiming
docs(runtime): explain docker deployment
```
