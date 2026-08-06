# Test and maintain Swipe email

Use this guide after
[the email setup](email-setup.md) and whenever credentials, DNS, routing, or
webhooks change.

## Acceptance tests

### Check DNS

```sh
dig MX swipe.md +short
dig CNAME <token>._domainkey.swipe.md +short
dig MX m.swipe.md +short
dig TXT m.swipe.md +short
dig TXT _dmarc.swipe.md +short
```

Expected:

- apex MX records point only to Cloudflare Email Routing;
- all three DKIM records point to SES;
- `m.swipe.md` MX points to the `us-east-1` SES feedback host;
- `m.swipe.md` SPF includes `amazonses.com`;
- `_dmarc.swipe.md` contains the intended policy.

### Check the SES identity

Run in AWS CloudShell or an AWS CLI session with SES read access:

```sh
aws sesv2 get-email-identity \
  --region us-east-1 \
  --email-identity swipe.md \
  --query '{
    Verification:VerificationStatus,
    Dkim:DkimAttributes.Status,
    MailFrom:MailFromAttributes.MailFromDomain,
    MailFromStatus:MailFromAttributes.MailFromDomainStatus
  }' \
  --output table
```

All three statuses should be `SUCCESS`. MAIL FROM should be `m.swipe.md`.

### Check inbound mail

Send from an unrelated external account to:

1. `ian@swipe.md`;
2. a new made-up address covered by the catch-all.

For each message confirm:

- Cloudflare Email Routing shows a successful event;
- Mailroom contains one inbound message;
- the raw MIME exists in R2;
- Gmail receives the forwarded copy;
- Gmail applies the `swipe.md` label;
- the original `@swipe.md` recipient is preserved.

Use a unique subject on every test.

### Check SES sending

Create a draft and send only to the test recipient:

```sh
vps ssh swipe -- docker compose \
  --env-file /opt/apps/swipe/.env.production \
  -f /opt/apps/swipe/apps/newsletter/docker-compose.prod.yml \
  exec -T app \
  node dist/index.js broadcast test \
  --yes \
  --draft-id <draft-id> \
  --to <test-recipient> \
  --json
```

Expected:

- the command returns `ok: true`;
- a provider message ID is returned;
- the message arrives in the test inbox;
- the visible From is `ian@swipe.md`;
- the reply target is `ian@swipe.md`;
- authentication results show DKIM and SPF alignment.

The test recipient must already exist as a contact. Test sends now use the same
tracked rendering and persistence path as broadcasts; the JSON result includes the
test message, broadcast, draft fingerprint, and emitted tracking links.

### Approve an issue for broadcast

Use the issue wrapper for real issues:

```sh
pnpm swipe issue check <slug>
pnpm swipe issue test <slug> --to <operator-address>
# Inspect the delivered message in the inbox.
pnpm swipe issue approve <slug> --yes
pnpm swipe issue send <slug>
# If the final checks pass, explicitly confirm the broadcast:
pnpm swipe issue send <slug> --yes
```

This sequence is fail-closed:

- `issue check` renders the real template and runs SpamAssassin in a local Docker container;
- the checker blocks clipped HTML, missing unsubscribe support, unresolved values,
  unsafe markup, insecure links, and a failing SpamAssassin score;
- the archive HTML and `.md` route are published and live before the test;
- the test uses click tracking and the normal message sender;
- browser-shaped HTTP requests must redirect to the stored destination;
- real Chromium must navigate every emitted tracking URL without a 4xx response;
- generated contents anchors and the `.md` link must use the canonical issue slug;
- approval is tied to a SHA-256 fingerprint of the immutable production draft;
- broadcast and canary creation reject issue drafts without a fresh matching receipt.

Changing the subject, preheader, body, slug, template, sender, or reply target after
approval invalidates the receipt and requires another test.

The first SpamAssassin run builds a small local image. It does not send email.
`issue send` reruns the same gate and, without `--yes`, stops after showing the
result. To include an existing Mail-Tester JSON result in the gate, use:

```sh
pnpm swipe issue check <slug> --mail-tester-report <report.json>
```

### Check the SNS subscription

Run in AWS CloudShell:

```sh
aws sns list-subscriptions-by-topic \
  --region us-east-1 \
  --topic-arn arn:aws:sns:us-east-1:<account-id>:swipe-ses-feedback \
  --query 'Subscriptions[].SubscriptionArn' \
  --output text
```

The current HTTPS endpoint should have a subscription ARN, not
`PendingConfirmation`.

Publish a harmless signed probe:

```sh
aws sns publish \
  --region us-east-1 \
  --topic-arn arn:aws:sns:us-east-1:<account-id>:swipe-ses-feedback \
  --message '{"probe":"swipe-webhook"}' \
  --query MessageId \
  --output text
```

Tail the Swipe Worker while publishing:

```sh
pnpm -C apps/site exec wrangler tail swipe --format pretty
```

Expected webhook response: `202`.

The probe is not an SES bounce or complaint, so it should not suppress a
contact.

## Rotate an SES access key

Do not overwrite and immediately delete the old key.

1. Create a new access key on the dedicated SES sender user.
2. Confirm the user policy includes `ses:SendEmail` and `ses:SendRawEmail`.
3. Back up the VPS environment to a specific temporary path.
4. Replace only `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY`.
5. Restart the API and sender containers.
6. Send a real test message.
7. Confirm it arrived.
8. Mark the old key inactive.
9. Send another real test message.
10. Confirm it arrived while the old key is inactive.
11. Delete the old key.
12. Delete the temporary VPS backup containing the old secret.
13. Remove the downloaded credential file or move it to Trash.

If the first test fails, restore the saved environment and restart the
containers before changing IAM again.

An error containing:

```text
not authorized to perform ses:SendEmail
```

means the credential can authenticate but its IAM policy lacks the SES API
action. SMTP-only policies often include only `ses:SendRawEmail`.

## Rotate the SNS webhook secret

The Worker and VPS values must change together.

1. Generate a new random value.
2. Update `AWS_SNS_WEBHOOK_SECRET` on the VPS.
3. Restart the newsletter API container.
4. Update the Swipe Worker secret:

   ```sh
   pnpm -C apps/site exec wrangler secret put NEWSLETTER_WEBHOOK_SECRET
   ```

5. Delete the old SNS subscription if it is confirmed.
6. Create a new HTTPS subscription with the new secret URL.
7. Confirm the subscription changes to an ARN.
8. Publish the signed SNS probe.
9. Confirm a `202` response.
10. Remove any temporary local secret file.

If an unconfirmed subscription was created with a wrong URL, SNS may not allow
it to be deleted because it has no confirmed ARN. It expires automatically.
Create the correct subscription and ignore the stale pending row until it
expires.

## Add another SES topic

Append the topic ARN to `AWS_SNS_ALLOWED_TOPICS` with a comma:

```text
AWS_SNS_ALLOWED_TOPICS=arn:aws:sns:us-east-1:<account-id>:first-topic,arn:aws:sns:us-east-1:<account-id>:second-topic
```

Restart the API. Publish one signed probe from the new topic before connecting
an SES identity.

## Add another inbound domain

1. Add the domain, inbox, exact routes, and optional catch-all to Mailroom.
2. Verify a dedicated Gmail plus destination in Cloudflare.
3. Add the domain to `MAILROOM_FORWARD_TO_BY_DOMAIN`.
4. Add a Gmail `deliveredto:` filter.
5. Back up the domain's current mail DNS.
6. Enable Cloudflare Email Routing.
7. Send an exact-address test.
8. Send a catch-all test.
9. Confirm D1, R2, Gmail, and the Mailroom CLI agree.

Do not duplicate the central Mailroom Worker. Use a small ingress Worker when
the domain belongs to another Cloudflare account.

## Troubleshooting

### SNS stays pending and Swipe returns 403

Check the incoming content type. SNS uses `text/plain` without an `Origin`
header. Keep this Astro setting:

```js
security: {
  checkOrigin: false,
},
```

If the request reaches the webhook route, the Worker logs show the upstream
error code on a non-success response.

### SNS stays pending and Swipe returns 404

`NEWSLETTER_WEBHOOK_SECRET` does not match the secret segment in the endpoint,
or the subscription still uses an older URL.

Rotate the secret and create a new subscription. Do not print the URL while
checking it.

### The newsletter API returns `unauthorized`

`AWS_SNS_WEBHOOK_SECRET` on the VPS does not match the Worker secret.

### The newsletter API returns `unauthorized_topic`

Add the exact SNS topic ARN to `AWS_SNS_ALLOWED_TOPICS` and restart the API.
Use a comma-separated value, not a JSON array.

### The newsletter API returns `invalid_signature`

Confirm the message came through SNS. A manual `curl` request is expected to
fail signature verification.

Check that the SNS signing certificate and subscription URL host allowlists
still include the correct AWS hostname suffix.

### The newsletter API returns `subscription_rejected`

Check the `SubscribeURL` hostname allowlist and outbound HTTPS access from the
API container.

### SES identity or DKIM stays pending

Check all three CNAME records with `dig`. Cloudflare must return the SES targets
exactly. Keep the records DNS-only and allow time for SES to poll them.

### Custom MAIL FROM stays pending

Check the MX and TXT records at `m.swipe.md`, not at the apex. Do not replace
the Cloudflare Email Routing MX records.

### SES returns an authorization error

Check which access key the running container received without printing its
secret. Confirm its IAM user has:

```text
ses:SendEmail
ses:SendRawEmail
```

Restart the API and sender containers after changing the key or policy.

### Catch-all mail exists in Mailroom but not Gmail

Check:

- the Gmail plus address is a verified Cloudflare destination;
- `MAILROOM_FORWARD_TO_BY_DOMAIN` contains the exact recipient domain;
- the JSON secret is one valid line;
- Cloudflare Email Routing delivered to the intended Worker;
- Mailroom forwarding logs show no destination error.

The stored R2 copy is the recovery source. Fix forwarding, then replay or
forward the preserved message.

### Gmail does not apply the label

Use:

```text
deliveredto:your-account+swipe@gmail.com
```

Do not filter on a wildcard `To` address.

### A test send works but the old key may still be in use

Deactivate the old key and send again. Only delete it after the second test
arrives.
