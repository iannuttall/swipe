# Production Readiness For Agents

Read this before deployment, imports, canaries, or real sends.

Command examples in this file assume the current working directory is
`apps/newsletter`.

## No-Send Audit Mode

For production rehearsal, point commands at the rehearsal database and force the
test provider:

```bash
DATABASE_URL=postgresql://email:email@127.0.0.1:55436/email_rehearsal \
EMAIL_PROVIDER=test \
node --env-file=.env.local packages/cli/dist/index.js doctor --json
```

Do not run `send due`, `worker send`, or `broadcast test` against production
data unless the user explicitly asks for a send and the provider/config are
intended for that send.

The Docker Compose sender is opt-in. A normal `docker compose up` should start
Postgres and the API only. The worker requires:

```bash
docker compose --profile sender up worker
```

## Pre-Send Checklist

Run:

```bash
email doctor --json
email ops checklist --json
email broadcast preview-plan --sample-limit 25 --json
email analytics rebuild-rollups --yes --json
```

Then verify database invariants:

- no active contacts blocked by active suppressions
- no accidental Gmail/Yahoo/etc domain suppressions
- no suppression rows targeting both email and domain
- no planned/sending messages unless a deliberate broadcast has just been
  created
- no scheduled/sending broadcasts unless a deliberate broadcast has just been
  created
- link and contact-link rollups match expected click-derived rows

## Rollout Shape

Use canaries before a full list send:

1. 50 to 100 warm contacts
2. 500
3. 2,000
4. full active audience over 12 to 24 hours

Canary steps are cumulative. A 50,500,2000 rollout means add the next 450, then
the next 1,500. Do not resend earlier cohorts.

The default planner ranks:

1. prior clickers
2. prior openers
3. recent subscribers
4. cold contacts

Default delivery policy spreads over 12 hours unless overridden.

## Emergency Commands

Pause future sends:

```bash
email broadcast pause <broadcast_id> --json
```

Cancel remaining planned messages:

```bash
email broadcast cancel <broadcast_id> --json
```

Recover stale `sending` messages only after checking why they got stuck:

```bash
email ops recover-stuck --yes --json
```

Retry failed messages only after fixing the provider/content problem:

```bash
email message retry-failed --yes --broadcast-id <broadcast_id> --json
```
