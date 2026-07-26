---
name: "email-newsletter"
description: "Operate the agent-first email/newsletter CLI and MCP surfaces for broadcasts, contacts, suppressions, SES sending, tracking, and marketing analytics. Use when an agent needs to inspect or manage this email platform, prepare broadcasts, send tests or due messages, query link/topic/sponsor analytics, analyze subscriber interests, or perform local production smoke tests."
---

# email-newsletter

Use this skill to operate the `email` newsletter platform from the CLI or MCP.
The platform is agent-first: core behavior lives in `packages/core`, and the
CLI, HTTP API, and MCP server expose the same capabilities.

## Ground Rules

- Prefer JSON output for agent work: pass `--json`.
- Treat sends as production actions. Do not run `send due`, `worker send`, or
  retries unless the user clearly asks for it.
- Sending and queue mutation commands require explicit confirmation flags such
  as `--yes`.
- Do not re-add suppressed contacts as active.
- Do not rehearse production imports against a process that can send mail. Use
  a throwaway local database and `EMAIL_PROVIDER=test`.
- Never turn a single email suppression into a domain suppression. A previous
  Gmail-class failure mode could have suppressed all `gmail.com` contacts.
- Unsubscribe is contact consent state; hard bounce, complaint, manual, and bad
  domain suppressions are safety blocks.
- Prefer aggregate analytics for reports, and detailed analytics for debugging.
- Open tracking may be disabled with `EMAIL_TRACK_OPENS=false`; clicks remain
  the stronger signal.

## Setup Checks

From the `apps/newsletter` app directory:

```bash
node --env-file=.env.local packages/cli/dist/index.js doctor --json
```

Get the production checklist:

```bash
node --env-file=.env.local packages/cli/dist/index.js ops checklist --json
```

Run migrations:

```bash
node --env-file=.env.local packages/cli/dist/index.js db migrate --json
```

For production readiness:

```bash
node --env-file=.env.local packages/cli/dist/index.js doctor --json
node --env-file=.env.local packages/cli/dist/index.js ops checklist --json
node --env-file=.env.local packages/cli/dist/index.js broadcast preview-plan --sample-limit 25 --json
```

Start the local API for click/unsubscribe tracking:

```bash
node --env-file=.env.local packages/cli/dist/index.js api serve --port 3000
```

## Contacts

Subscribe one contact:

```bash
node --env-file=.env.local packages/cli/dist/index.js subscribe person@example.com --source site --json
```

Seed Gmail aliases for local tests:

```bash
node --env-file=.env.local packages/cli/dist/index.js contact seed-aliases --email user@gmail.com --count 20 --json
```

Seed Gmail aliases with subscriber intelligence fixtures:

```bash
node --env-file=.env.local packages/cli/dist/index.js contact seed-intelligence --email user@gmail.com --count 20 --json
```

Export/import contacts:

```bash
node --env-file=.env.local packages/cli/dist/index.js contact export --out contacts.json --json
node --env-file=.env.local packages/cli/dist/index.js contact import --file contacts.json --json
```

Tag contacts and attach external customer IDs:

```bash
node --env-file=.env.local packages/cli/dist/index.js contact tag person@example.com --tag high-value --json
node --env-file=.env.local packages/cli/dist/index.js contact external-id person@example.com --provider stripe --external-id cus_123 --json
node --env-file=.env.local packages/cli/dist/index.js contact value person@example.com --json
```

Record purchases idempotently:

```bash
node --env-file=.env.local packages/cli/dist/index.js purchase record --email person@example.com --provider stripe --external-id pi_123 --idempotency-key stripe:pi_123 --product-key prompt-stack --amount-cents 50000 --currency USD --json
```

## Drafts And Broadcasts

Create a draft from Markdown:

```bash
node --env-file=.env.local packages/cli/dist/index.js draft create --subject "Subject" --body-file draft.md --metadata-file draft.metadata.json --json
```

Render the email before sending:

```bash
node --env-file=.env.local packages/cli/dist/index.js template list --json
node --env-file=.env.local packages/cli/dist/index.js template render --subject "Subject" --body-file draft.md --out-dir rendered-email --json
```

Use the default template for normal broadcasts.
Compose emails from Markdown plus shared section directives. Do not make
one-off React email files for individual campaigns; add reusable `packages/core`
sections instead.

Use `metadata.links` to tag tracked links by index:

```json
{
  "links": [
    {
      "index": 0,
      "topics": ["ai-agents"],
      "tags": ["advertiser"],
      "sponsor": "acme"
    }
  ]
}
```

Prepare a broadcast:

```bash
node --env-file=.env.local packages/cli/dist/index.js broadcast create --draft-id <draft_id> --scheduled-at 2026-06-20T12:00:00.000Z --json
```

For production rollout, prefer canary cohorts before a full list send:

```bash
node --env-file=.env.local packages/cli/dist/index.js canary create --draft-id <draft_id> --steps 50,500,2000,all --json
node --env-file=.env.local packages/cli/dist/index.js canary get <canary_id> --json
node --env-file=.env.local packages/cli/dist/index.js canary promote <canary_id> --json
```

Canary steps are cumulative. `50,500,2000,all` sends 50 first, then adds the next
450, then the next 1,500, then everyone remaining in the same ranked audience.

Preview and prepare a segmented broadcast:

```bash
node --env-file=.env.local packages/cli/dist/index.js audience preview --contact-tag high-value --purchased-product prompt-stack --min-ltv-cents 25000 --currency USD --json
node --env-file=.env.local packages/cli/dist/index.js broadcast create --draft-id <draft_id> --audience-file audience.json --json
```

Default delivery is warm-first and spread over time:

- previous clickers first
- previous openers next
- recent subscribers next
- cold contacts last
- default cadence is 1,000 messages/hour
- provider sends are throttled in core with `EMAIL_SEND_RATE_PER_SECOND`

## Sending

Send due messages only after explicit user approval:

```bash
node --env-file=.env.local packages/cli/dist/index.js send due --yes --limit 100 --json
```

Run the worker:

```bash
node --env-file=.env.local packages/cli/dist/index.js worker send --yes --batch-size 100 --interval-ms 10000
```

`--limit` and `--batch-size` control queue claim size. The provider call itself
is still paced by `EMAIL_SEND_RATE_PER_SECOND`.

Before a real full-list send, use canary cohorts: 50 to 100 warm contacts, then
500, then 2,000, then the full active audience over 12 to 24 hours.

For tiny local SES tests where you want full manual control, use a small batch
and a normal worker interval:

```bash
node --env-file=.env.local packages/cli/dist/index.js worker send --yes --batch-size 1 --interval-ms 10000
```

## Analytics

Use aggregate link summary for reporting:

```bash
node --env-file=.env.local packages/cli/dist/index.js analytics link-summary --json
node --env-file=.env.local packages/cli/dist/index.js analytics link-summary --sponsor acme --json
node --env-file=.env.local packages/cli/dist/index.js analytics link-summary --topic ai-agents --json
```

`analytics link-summary` groups by URL, topics, tags, and sponsor and returns:

- humanClicks
- botClicks
- uniqueHumanContacts
- uniqueBotContacts
- linkCount
- broadcastCount
- firstClickedAt
- lastClickedAt

Use detailed link insights for debugging specific tracked link instances:

```bash
node --env-file=.env.local packages/cli/dist/index.js analytics links --json
node --env-file=.env.local packages/cli/dist/index.js broadcast links <broadcast_id> --json
```

Use contact analytics for subscriber-level interest research:

```bash
node --env-file=.env.local packages/cli/dist/index.js contact analytics person@example.com --json
node --env-file=.env.local packages/cli/dist/index.js contact links person@example.com --json
node --env-file=.env.local packages/cli/dist/index.js contact topics person@example.com --json
```

Rebuild derived rollups after imports, metadata fixes, or recovery:

```bash
node --env-file=.env.local packages/cli/dist/index.js analytics rebuild-rollups --yes --json
```

Recover stale `sending` messages after a worker crash or deploy interruption:

```bash
node --env-file=.env.local packages/cli/dist/index.js ops recover-stuck --yes --json
```

## MCP Tool Map

Prefer these tools when connected through MCP:

- `email_get_link_summary`: aggregate link/topic/tag/sponsor performance.
- `email_get_link_insights`: detailed per-message/per-recipient link rollups.
- `email_get_contact_analytics`: contact profile, engagement, events, links,
  and topics.
- `email_get_ops_checklist`: production readiness, rollout, and emergency
  commands.
- `email_recover_stuck_messages`: recover stale sending messages only with
  `confirm: true`.
- `email_tag_contact`: attach first-class contact tags.
- `email_upsert_contact_external_id`: attach provider/customer IDs.
- `email_record_purchase`: record idempotent purchase events.
- `email_get_contact_value`: inspect lifetime value rollups.
- `email_preview_audience`: preview segmented audiences before sending.
- `email_create_canary`: create the first warm-first canary cohort.
- `email_promote_canary`: promote to the next cumulative cohort.
- `email_get_canary`: inspect cohorts, broadcasts, and next step.
- `email_rebuild_analytics_rollups`: rebuild rollups only with `confirm: true`.
- `email_get_contact_links`: repeated links clicked by one contact.
- `email_get_contact_topics`: topics clicked by one contact.
- `email_list_templates`: list template keys and engines.
- `email_render_template`: render markdown through a selected template for QA.
- `email_prepare_broadcast`: create the planned send queue.
- `email_send_due`: send due messages only with `confirm: true`.
- `email_retry_failed_messages`: retry failed messages only with `confirm: true`.

## Common Agent Workflows

### Report advertiser performance

```bash
node --env-file=.env.local packages/cli/dist/index.js analytics link-summary --sponsor <sponsor> --json
```

Summarize human clicks, unique human clickers, and repeated interest.

### Find subscriber interests

```bash
node --env-file=.env.local packages/cli/dist/index.js contact topics <email> --json
node --env-file=.env.local packages/cli/dist/index.js contact links <email> --json
```

Use topics and repeated clicks as product/content interest signals.

### Find high-value warm leads

```bash
node --env-file=.env.local packages/cli/dist/index.js audience preview --purchased-product <product_key> --topic <topic> --min-ltv-cents 100000 --currency USD --json
```

Use purchase value, tags, and clicked topics together. Suppressions and
unsubscribes still override every segment.

### Audit a broadcast

```bash
node --env-file=.env.local packages/cli/dist/index.js broadcast stats <broadcast_id> --json
node --env-file=.env.local packages/cli/dist/index.js analytics link-summary --broadcast-id <broadcast_id> --json
node --env-file=.env.local packages/cli/dist/index.js broadcast events <broadcast_id> --limit 100 --json
```

Check sent/failed/skipped counts, human vs bot engagement, and unsubscribes.
