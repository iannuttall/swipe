# Set up Swipe email

This guide configures:

```txt
Inbound
sender
  -> Cloudflare Email Routing
  -> Mailroom Worker
  -> Mailroom storage
  -> verified Gmail destination

Newsletter sending
Swipe newsletter service
  -> Amazon SES
  -> recipient

Delivery feedback
Amazon SES
  -> Amazon SNS
  -> https://swipe.md/api/webhooks/<secret>/ses
  -> newsletter API
```

The current Swipe values are:

| Setting | Value |
| --- | --- |
| Public From | `ian@swipe.md` |
| Reply-To | `ian@swipe.md` |
| SES identity | `swipe.md` |
| Custom MAIL FROM | `m.swipe.md` |
| AWS region | `us-east-1` |
| SNS topic name | `swipe-ses-feedback` |
| Public webhook host | `swipe.md` |
| Private newsletter origin | `https://list.ian.is` |
| Inbound Worker | `mailroom` |

The visible From address and the custom MAIL FROM domain are separate. Readers
see `ian@swipe.md`. SES uses `m.swipe.md` for the envelope return path and
bounce alignment.

## Before changing DNS

Save a DNS export. Record the current:

- nameservers;
- MX records and priorities;
- SPF records;
- DKIM records;
- DMARC record;
- provider verification records;
- forwarding rules;
- catch-all rules.

Do not leave MX records from two inbound providers active. A sender chooses one
MX host; two providers do not each receive a reliable copy.

The domain must use Cloudflare nameservers before Cloudflare Email Routing can
manage its inbound records.

## 1. Configure Mailroom

Deploy Mailroom first. Follow the Mailroom repository guides:

- `docs/deploy.md`
- `docs/gmail.md`
- `docs/migration.md`
- `docs/testing.md`

Create a Mailroom domain:

```sh
mailroom operations run domains.upsert \
  --params '{"domain":"swipe.md","fromAddress":"ian@swipe.md","replyTo":"ian@swipe.md"}' \
  --json
```

Create the inbox:

```sh
mailroom operations run inboxes.upsert \
  --params '{"domain":"swipe.md","localPart":"ian","name":"Swipe"}' \
  --json
```

Copy the returned inbox ID. Create an exact route:

```sh
mailroom operations run routes.upsert \
  --params '{"inboxId":"inb_replace","domain":"swipe.md","kind":"exact","localPart":"ian","enabled":true,"priority":100}' \
  --json
```

Create the catch-all only when every unmatched `@swipe.md` address should reach
the same inbox:

```sh
mailroom operations run routes.upsert \
  --params '{"inboxId":"inb_replace","domain":"swipe.md","kind":"catchall","localPart":null,"enabled":true,"priority":100}' \
  --json
```

List the stored routes before changing MX:

```sh
mailroom operations run domains.list --params '{}' --json
mailroom operations run inboxes.list --params '{}' --json
mailroom operations run routes.list --params '{}' --json
```

## 2. Verify the Gmail destination

Open [Cloudflare Email Routing](https://dash.cloudflare.com/?to=%2F%3Aaccount%2Femail-service%2Frouting).

1. Select the Cloudflare account that owns the Mailroom Worker.
2. Open `Destination addresses`.
3. Add a Gmail plus address dedicated to Swipe.
4. Open the verification message in Gmail.
5. Select the verification link.
6. Confirm Cloudflare shows the destination as verified.

Store the domain-to-destination map as the Mailroom Worker secret
`MAILROOM_FORWARD_TO_BY_DOMAIN`.

Use one JSON line:

```json
{"swipe.md":"your-account+swipe@gmail.com"}
```

From the Mailroom repository:

```sh
pnpm --filter @mailroom/worker exec wrangler secret put \
  MAILROOM_FORWARD_TO_BY_DOMAIN \
  --config wrangler.local.jsonc
```

Do not put the Gmail address map in tracked Wrangler configuration.

## 3. Enable Cloudflare Email Routing

Open [Cloudflare Email Routing](https://dash.cloudflare.com/?to=%2F%3Aaccount%2Femail-service%2Frouting)
and select `swipe.md`.

1. Start Email Routing onboarding.
2. Review the MX records Cloudflare will replace.
3. Remove conflicting old-provider MX records when prompted.
4. Keep unrelated TXT verification and DMARC records.
5. Create an exact `ian@swipe.md` rule that sends to the `mailroom` Worker.
6. Enable the catch-all and send it to `mailroom` if the catch-all is required.
7. Confirm Email Routing reports the domain as enabled.

Cloudflare Email Routing MX records belong at the apex. The SES custom MAIL
FROM MX record belongs at `m.swipe.md`. They do not conflict.

Send an external test to `ian@swipe.md`, then to a made-up catch-all address.
Confirm each message exists in Mailroom and Gmail.

## 4. Create the Gmail filter

Open [Gmail filters](https://mail.google.com/mail/u/0/#settings/filters).

Use the verified plus address:

```text
deliveredto:your-account+swipe@gmail.com
```

Create a filter that:

- applies the `swipe.md` label;
- skips the Inbox if Swipe mail should live only under the label;
- never deletes the message.

Do not use:

```text
to:(*@swipe.md)
```

Gmail wildcard matching does not reliably identify a forwarded catch-all.
`deliveredto:` matches the exact Cloudflare forwarding destination.

## 5. Create the SES domain identity

Open [Amazon SES identities in `us-east-1`](https://us-east-1.console.aws.amazon.com/ses/home?region=us-east-1#/identities).

1. Select `Create identity`.
2. Choose `Domain`.
3. Enter `swipe.md`.
4. Enable Easy DKIM.
5. Use RSA 2048-bit DKIM.
6. Create the identity.

SES shows three DKIM CNAME records. Add all three to Cloudflare DNS. Keep them
DNS-only. Do not proxy mail records.

Each record has this shape:

| Type | Name | Target |
| --- | --- | --- |
| CNAME | `<token>._domainkey` | `<token>.dkim.amazonses.com` |

Wait until SES shows:

- identity verification: `Success`;
- DKIM: `Success`.

The domain identity authorizes sending from addresses under `@swipe.md`.
Creating a separate `ian@swipe.md` email identity is not required after the
domain identity is verified.

## 6. Configure the custom MAIL FROM domain

Open the `swipe.md` SES identity and edit `Custom MAIL FROM domain`.

Use:

```text
m.swipe.md
```

Choose `Use default MAIL FROM domain` as the fallback behavior.

Add the records SES provides:

| Type | Name | Value |
| --- | --- | --- |
| MX | `m` | `10 feedback-smtp.us-east-1.amazonses.com` |
| TXT | `m` | `v=spf1 include:amazonses.com ~all` |

Keep the records DNS-only.

Do not create a mailbox at `m.swipe.md`. It is the SES envelope return path,
not the public From or Reply-To address.

Wait until the SES identity shows the MAIL FROM status as `Success`.

## 7. Add DMARC

Add this DNS record while the new sender is being tested:

| Type | Name | Value |
| --- | --- | --- |
| TXT | `_dmarc` | `v=DMARC1; p=none;` |

Move to a stricter DMARC policy only after normal sends pass and reports show
that DKIM and SPF align correctly.

## 8. Create a dedicated SES API user

Open [AWS IAM users](https://us-east-1.console.aws.amazon.com/iam/home#/users).

Create a dedicated IAM user for the newsletter sender. Do not reuse a personal
AWS CLI key or an account-wide administrator key.

The newsletter uses the SES API. Its policy must include both API and raw email
sending:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "ses:SendEmail",
        "ses:SendRawEmail"
      ],
      "Resource": "*"
    }
  ]
}
```

Create one access key for the VPS. Store it only in the VPS production
environment:

```text
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
```

Set the sender identity:

```text
EMAIL_FROM_EMAIL=ian@swipe.md
EMAIL_FROM_NAME=Ian Nuttall
```

Restart the API and sender containers after changing the credential:

```sh
vps ssh email -- docker compose \
  --env-file /opt/apps/email/.env.production \
  -f /opt/apps/email/apps/newsletter/docker-compose.prod.yml \
  --profile sender up -d app worker
```

Send a test before deleting any previous key. Follow
[the rotation procedure](email-operations.md#rotate-an-ses-access-key).

## 9. Create the SNS feedback topic

Open [Amazon SNS topics in `us-east-1`](https://us-east-1.console.aws.amazon.com/sns/v3/home?region=us-east-1#/topics).

1. Select `Create topic`.
2. Choose `Standard`.
3. Name it `swipe-ses-feedback`.
4. Create the topic.
5. Copy its ARN.

Store the ARN on the newsletter VPS:

```text
AWS_SNS_ALLOWED_TOPICS=arn:aws:sns:us-east-1:<account-id>:swipe-ses-feedback
```

Multiple allowed topics use one comma-separated value:

```text
AWS_SNS_ALLOWED_TOPICS=arn:aws:sns:us-east-1:<account-id>:old-topic,arn:aws:sns:us-east-1:<account-id>:swipe-ses-feedback
```

Do not use a JSON array.

Restart the API container after changing the allowlist.

## 10. Create the webhook secret

Generate a new random value:

```sh
openssl rand -hex 32
```

Store the same value in two places:

| Service | Secret name |
| --- | --- |
| Swipe Cloudflare Worker | `NEWSLETTER_WEBHOOK_SECRET` |
| Newsletter VPS | `AWS_SNS_WEBHOOK_SECRET` |

Set the Worker secret from `apps/site`:

```sh
pnpm exec wrangler secret put NEWSLETTER_WEBHOOK_SECRET
```

Set the VPS value in `/opt/apps/email/.env.production`, then restart the API
container.

Never print or store the complete public webhook URL. Its shape is:

```text
https://swipe.md/api/webhooks/<secret>/ses
```

The public Worker checks the path secret. The newsletter API then checks the
topic allowlist and AWS signature.

## 11. Keep the Astro origin setting

SNS sends HTTP subscriptions and notifications as:

```text
Content-Type: text/plain; charset=UTF-8
```

It does not send a browser `Origin` header. Astro otherwise treats the request
as a cross-site form submission and returns `403` before the webhook route
runs.

Keep this in `apps/site/astro.config.mjs`:

```js
security: {
  checkOrigin: false,
},
```

The repository has only two POST routes:

- `/api/subscribe`, which forwards a public signup;
- the SNS webhook, which requires the path secret, topic allowlist, and AWS
  signature.

Do not remove the webhook's own checks when the Astro origin check is disabled.

## 12. Deploy the public webhook

From the repository root:

```sh
pnpm check
pnpm site:deploy:dry-run
pnpm site:deploy
```

Check that a false secret is rejected:

```sh
curl -i -X POST \
  https://swipe.md/api/webhooks/not-the-secret/ses \
  -H 'content-type: application/json' \
  --data '{}'
```

Expected status: `404`.

## 13. Create and confirm the SNS subscription

The public `swipe.md` Worker and newsletter API must both be live before this
step.

Open the `swipe-ses-feedback` SNS topic.

1. Select `Create subscription`.
2. Choose protocol `HTTPS`.
3. Enter the complete secret webhook URL.
4. Leave raw message delivery disabled.
5. Create the subscription.

SNS sends a signed `SubscriptionConfirmation` request. The newsletter API
verifies it and visits the AWS `SubscribeURL`. The subscription should change
from `Pending confirmation` to an ARN without a manual browser visit.

Do not paste the URL into logs or screenshots.

## 14. Connect SES bounce and complaint notifications

Open the `swipe.md` SES identity.

Under notifications:

1. Set `Bounce feedback` to the `swipe-ses-feedback` SNS topic.
2. Set `Complaint feedback` to the same topic.
3. Leave delivery notifications unset unless they are deliberately needed.
4. Save the changes.

This installation uses identity-level notifications. It does not require an
SES configuration set.

## 15. Run the acceptance tests

Complete every check in
[Email tests and maintenance](email-operations.md#acceptance-tests).

Do not remove an old provider, old credential, or rollback DNS record until the
matching test has passed.
