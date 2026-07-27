# Set up subscriber confirmation

This guide covers:

- confirmation of the Ian's List to Swipe move;
- double opt-in for new Swipe signups;
- Cloudflare Turnstile protection against email link scanners;
- confirmation reports;
- removal of migration contacts who do not confirm.

## How confirmation works

The newsletter service signs a one-time confirmation token. Only the token hash
is stored in Postgres.

The email link opens:

```text
https://swipe.md/confirm/<token>
```

Opening the page does not change the subscription. The page runs a managed
Turnstile check. After Turnstile succeeds, Alpine posts the token to the
same-origin Swipe Worker. The Worker validates Turnstile and calls the protected
newsletter API.

Turnstile uses `appearance: interaction-only`. Most readers see the confirmation
complete automatically. Suspicious traffic receives an interactive challenge.

## 1. Create the Turnstile widget

Open [Cloudflare Turnstile](https://dash.cloudflare.com/?to=/:account/turnstile).

1. Select `Add widget`.
2. Name the widget `swipe-confirmation`.
3. Add `swipe.md` as an allowed hostname.
4. Choose `Managed` widget mode.
5. Create the widget.
6. Copy the site key and secret key.

Do not commit either value. The site key is safe to expose in page HTML, but it
still belongs in deployment configuration so it can differ between
environments.

Set both values on the deployed Swipe Worker:

```sh
pnpm -C apps/site exec wrangler secret put TURNSTILE_SITE_KEY
pnpm -C apps/site exec wrangler secret put TURNSTILE_SECRET_KEY
```

For local Worker testing, copy `apps/site/.dev.vars.example` to an ignored
`.dev.vars` file. The example contains Cloudflare's always-pass Turnstile test
keys:

```text
TURNSTILE_SITE_KEY=1x00000000000000000000AA
TURNSTILE_SECRET_KEY=1x0000000000000000000000000000000AA
```

Never use the test keys in production.

## 2. Configure the newsletter service

Generate a signing secret:

```sh
openssl rand -base64 48
```

Add these values to the VPS production environment:

```text
CONFIRMATION_SECRET=<generated-secret>
EMAIL_CONFIRMATION_BASE_URL=https://swipe.md
EMAIL_CONFIRMATION_TTL_HOURS=72
EMAIL_DOUBLE_OPT_IN=true
```

Keep `CONFIRMATION_SECRET` stable. Changing it invalidates every unexpired
confirmation link.

Restart the newsletter API and sender after the values are present:

```sh
vps ssh email -- docker compose \
  --env-file /opt/apps/email/.env.production \
  -f /opt/apps/email/apps/newsletter/docker-compose.prod.yml \
  --profile sender up -d app worker
```

## 3. Run the database migration

Deploy the newsletter code before preparing a confirmation batch. The deploy
must run:

```sh
email db migrate --json
```

Migration `0012_contact_confirmations.sql` adds:

- the `pending` contact status;
- confirmation request and status types;
- the `confirmation_requests` table;
- indexes for tokens, batches, reports, and expiry.

Do not prepare a batch until the migration and new API are both running.

## 4. Prepare the Swipe migration batch

Choose one batch key and one expiry time. Use the same values in every command
and in the draft metadata.

Example:

```sh
email confirmation prepare \
  --yes \
  --batch-key ians-list-to-swipe-2026-07-28 \
  --expires-at 2026-08-11T12:00:00.000Z \
  --source ians-list-transition \
  --json
```

This creates one request for every active contact. It does not include contacts
that are already unsubscribed or suppressed. Existing active contacts remain
active until the cleanup command is explicitly run later.

The command is idempotent for the same batch key. Run it again if the process is
interrupted.

Check the result:

```sh
email confirmation report \
  --purpose swipe_migration \
  --batch-key ians-list-to-swipe-2026-07-28 \
  --json
```

`total` should match the intended active audience before the email is sent.

## 5. Add the link to the transition email

Use the placeholder in the email Markdown:

```md
[Yes, keep sending me Swipe]({{confirmationUrl}})
```

Create a metadata file:

```json
{
  "confirmation": {
    "purpose": "swipe_migration",
    "batchKey": "ians-list-to-swipe-2026-07-28",
    "expiresAt": "2026-08-11T12:00:00.000Z"
  }
}
```

Create the draft with both files:

```sh
email draft create \
  --subject "Ian's List is becoming Swipe" \
  --body-file transition.md \
  --metadata-file transition-metadata.json \
  --json
```

The normal test-send command renders a safe `test-link` preview. It does not
confirm a subscriber. A real planned message receives the one-time token for
its contact.

Use a canary before promoting the whole audience:

```sh
email canary create \
  --draft-id <draft-id> \
  --steps 50,500,2000,all \
  --json
```

Check the first real message in a mailbox you control:

- the link uses `https://swipe.md/confirm/`;
- opening it completes confirmation after Turnstile succeeds;
- reloading the page reports a successful existing confirmation;
- the link is not rewritten through `/t/click/`;
- the unsubscribe footer still works.

## 6. Monitor confirmations

Run:

```sh
email confirmation report \
  --purpose swipe_migration \
  --batch-key ians-list-to-swipe-2026-07-28 \
  --json
```

The report contains:

- `total`;
- `pending`;
- `confirmed`;
- `expired`;
- `cancelled`;
- `activeUnconfirmed`.

Run the report during the response window and once more after the expiry time.

## 7. Remove non-confirmers after the deadline

Always run the cleanup without `--yes` first:

```sh
email confirmation unsubscribe-unconfirmed \
  --batch-key ians-list-to-swipe-2026-07-28 \
  --expired-before 2026-08-11T12:00:00.000Z \
  --json
```

The result includes `dryRun: true`, `matched`, and `unsubscribed: 0`.

Check that:

- the batch key is exact;
- the deadline has passed;
- the matched count is expected;
- the confirmation report has been saved.

Run the mutation only after those checks:

```sh
email confirmation unsubscribe-unconfirmed \
  --batch-key ians-list-to-swipe-2026-07-28 \
  --expired-before 2026-08-11T12:00:00.000Z \
  --yes \
  --source ians-list-transition-cleanup \
  --json
```

The command only changes active contacts that have an expired, unconfirmed
request in that exact migration batch. It does not touch confirmed contacts or
contacts outside the batch.

## Double opt-in for new signups

`EMAIL_DOUBLE_OPT_IN=true` is the production default.

For a new address:

1. `/api/subscribe` creates a pending contact.
2. The address is excluded from newsletter audiences.
3. The service sends a confirmation email.
4. The reader opens the Swipe confirmation page.
5. Turnstile succeeds and the page posts to the protected API.
6. The contact becomes active.

An already active address remains active and does not receive another
confirmation email. A hard-suppressed address cannot become pending.

Set this only if double opt-in must be disabled:

```text
EMAIL_DOUBLE_OPT_IN=false
```

## Troubleshooting

### The confirmation page says it is not configured

Check the deployed Worker has:

```text
TURNSTILE_SITE_KEY
TURNSTILE_SECRET_KEY
NEWSLETTER_API_TOKEN
```

### Turnstile verification fails

Check:

- the widget allows `swipe.md`;
- the site and secret keys belong to the same widget;
- the widget mode is `Managed`;
- the action returned by Turnstile is `confirm_subscription`;
- the page is running on the allowed hostname.

### The newsletter API cannot confirm the token

Check:

- `CONFIRMATION_SECRET` has not changed;
- `EMAIL_CONFIRMATION_BASE_URL` is `https://swipe.md`;
- migration `0012_contact_confirmations.sql` has run;
- the token has not expired;
- the Worker `NEWSLETTER_API_URL` points to the running newsletter API.

### A migration link goes through click tracking

Check that the draft contains both:

- `{{confirmationUrl}}` in the Markdown;
- matching `metadata.confirmation` values.

Confirmation URLs are excluded from click rewriting. Do not replace the
placeholder with a hand-written URL.
