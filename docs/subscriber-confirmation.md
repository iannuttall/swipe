# Set up subscriber confirmation

Ian's List and Swipe are separate newsletters.

- Ian's List runs from `/opt/apps/ian`.
- Swipe runs from `/opt/apps/swipe`.
- Each app has its own Postgres database, contacts, API token, and email secrets.
- A reader stays on Ian's List unless Ian removes them from that list.
- A reader joins Swipe only after confirming on `swipe.md`.

Never import the Ian's List audience into the Swipe database. A person can be
on either list, both lists, or neither list.

## How the Ian invitation works

The final Ian's List email contains a different encrypted invitation for each
reader. The invitation includes the destination email address, batch key, and
expiry time. None of those values can be read or changed from the URL.

The email link opens:

```text
https://swipe.md/confirm?token=<token>
```

Opening that page does not subscribe anyone. The page runs a managed Turnstile
check, then posts the token to the same-origin Swipe Worker. The Worker validates
Turnstile and calls the protected Swipe newsletter API.

Swipe decrypts and validates the invitation after that POST. It creates and
activates the contact in one confirmation flow. An expired or modified token
creates no contact.

The Ian database stores no Swipe migration requests. Swipe stores only accepted
invitations.

## Configure Turnstile

Create a managed Turnstile widget named `swipe-confirmation`. Allow `swipe.md`
as its hostname.

Set both values on the Swipe Worker:

```sh
pnpm -C apps/site exec wrangler secret put TURNSTILE_SITE_KEY
pnpm -C apps/site exec wrangler secret put TURNSTILE_SECRET_KEY
```

The example development values are Cloudflare's always-pass test keys:

```text
TURNSTILE_SITE_KEY=1x00000000000000000000AA
TURNSTILE_SECRET_KEY=1x0000000000000000000000000000000AA
```

Never use those test keys in production.

## Share one invitation secret

Generate one secret:

```sh
openssl rand -hex 48
```

Set the same `SWIPE_INVITE_SECRET` value in:

```text
/opt/apps/ian/.env.production
/opt/apps/swipe/.env.production
```

This is the only application secret the two stacks share. Keep their
`CONFIRMATION_SECRET`, `API_TOKEN`, `TRACKING_SECRET`, `UNSUBSCRIBE_SECRET`, and
database credentials different.

Set this in both environments too:

```text
SWIPE_INVITE_BASE_URL=https://swipe.md
```

Changing `SWIPE_INVITE_SECRET` invalidates every invitation that has not been
accepted yet. Keep it stable until the transition window has closed.

## Point the site at the Swipe stack

The Swipe Worker needs the Swipe origin and API token:

```text
NEWSLETTER_API_URL=https://origin.swipe.md
NEWSLETTER_API_TOKEN=<Swipe API token>
```

Do not point the confirmation route at the Ian API. The public route stays on
`swipe.md`; `origin.swipe.md` is the Cloudflare-restricted private origin.

## Deploy the invitation migration

Migration `0013_swipe_invites.sql` adds the `swipe_invite` confirmation purpose.
The normal Swipe deploy applies it before starting the API.

Check the Swipe stack:

```sh
vps status swipe
```

The normal services are `postgres`, `app`, and `web`. The `worker` service stays
off until a real Swipe broadcast has been approved.

## Add the button to the final Ian email

Use the placeholder in the email Markdown:

```md
[Yes, subscribe me to Swipe]({{confirmationUrl}})
```

Use this draft metadata:

```json
{
  "confirmation": {
    "purpose": "swipe_invite",
    "batchKey": "ians-list-to-swipe-2026-07-28",
    "expiresAt": "2026-08-11T12:00:00.000Z"
  }
}
```

The Ian sender replaces the placeholder with an encrypted token for the
message recipient. It does not write anything to the Swipe database.

Test sends use a safe `test-link` preview. A planned message receives the real
recipient invitation. Confirmation URLs are excluded from click rewriting.

Before the real send check a message in a mailbox you control:

- The From name and address are still the familiar Ian's List sender.
- The button points to `https://swipe.md/confirm?token=`.
- Opening the URL alone does not create a Swipe contact.
- Completing Turnstile creates one active Swipe contact.
- Reloading the confirmation page reports that the invitation was already
  accepted.
- The normal Ian's List unsubscribe link still works.

## Check accepted invitations

Run the report against the Swipe stack:

```sh
email confirmation report \
  --purpose swipe_invite \
  --batch-key ians-list-to-swipe-2026-07-28 \
  --json
```

`confirmed` is the number of readers who explicitly joined Swipe. No row exists
for a reader who did not click and confirm.

There is no migration cleanup command for Swipe. Nonconfirmers were never added.
Pruning Ian's List is a separate operation against `/opt/apps/ian` and must not
depend on the Swipe report.

## Double opt-in for new Swipe signups

`EMAIL_DOUBLE_OPT_IN=true` is the production default.

The normal signup flow creates a pending Swipe contact and sends a confirmation
email. The contact stays out of every audience until Turnstile and the signed
confirmation POST succeed.

An active address does not receive another confirmation email. A hard-suppressed
address cannot become pending.

## Fix a failed confirmation

### The link opens a 404 page

The email must use this format:

```text
https://swipe.md/confirm?token=<token>
```

Do not use `/confirm/<token>`.

### The page says confirmation is not configured

Check the Swipe Worker has:

```text
TURNSTILE_SITE_KEY
TURNSTILE_SECRET_KEY
NEWSLETTER_API_TOKEN
NEWSLETTER_API_URL
```

### Turnstile fails

Check the widget allows `swipe.md`, both keys belong to the same widget, and the
returned action is `confirm_subscription`.

### The API rejects an Ian invitation

Check:

- `SWIPE_INVITE_SECRET` is identical on both stacks.
- `SWIPE_INVITE_BASE_URL` is `https://swipe.md`.
- migration `0013_swipe_invites.sql` ran on Swipe.
- the invitation has not expired.
- `NEWSLETTER_API_URL` points to the Swipe API.

Do not replace `{{confirmationUrl}}` with a hand-written URL. The Ian sender
must generate the encrypted recipient token.
