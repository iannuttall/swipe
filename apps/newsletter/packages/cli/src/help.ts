export function usage(appName = 'email', version = '0.1.0'): string {
  return `${appName} ${version}

Commands:
  Setup:
  email doctor [--json]
  email ops checklist [--json]
  email ops queue [--stale-after-ms N] [--since ISO] [--json]
  email ops recover-stuck --yes [--stale-after-ms N] [--limit N] [--json]
  email db migrate [--dir PATH] [--json]

  Contacts:
  email subscribe <email> [--name NAME] [--source SOURCE] [--json]
  email contact unsubscribe EMAIL_OR_ID [--broadcast-id ID] [--source SOURCE] [--json]
  email contact recent [--days N] [--limit N] [--json]
      Newest signups first; default window is the last 7 days.
  email contact analytics EMAIL_OR_ID [--limit N] [--json]
  email contact export [--out PATH] [--limit N] [--json]
  email contact import --file PATH [--json]
  email contact seed-aliases --email EMAIL [--count N] [--prefix TEXT] [--json]
  email contact seed-intelligence --email EMAIL [--count N] [--prefix TEXT] [--json]
  email contact tag EMAIL_OR_ID --tag TAG [--name NAME] [--source SOURCE] [--json]
  email contact untag EMAIL_OR_ID --tag TAG [--json]
  email contact tags EMAIL_OR_ID [--json]
  email contact external-id EMAIL_OR_ID --provider PROVIDER --external-id ID [--label LABEL] [--json]
  email contact value EMAIL_OR_ID [--json]
  email contact links EMAIL_OR_ID [--limit N] [--json]
  email contact topics EMAIL_OR_ID [--limit N] [--json]

  Purchases and audiences:
  email purchase record (--email EMAIL | --contact-id ID) --product-key KEY --amount-cents N --currency USD [--provider PROVIDER] [--external-id ID] [--idempotency-key KEY] [--json]
  email audience preview [--audience-file PATH] [--contact-tag TAG] [--topic TOPIC] [--purchased-product KEY] [--min-ltv-cents N] [--currency USD] [--json]

  Templates:
  email template list [--json]
  email template render --subject SUBJECT (--body TEXT | --body-file PATH) [--template default] [--preview TEXT] [--status new|warm|cold] [--out-dir PATH] [--json]

  Drafts and broadcasts:
  email draft create --subject SUBJECT (--body TEXT | --body-file PATH) [--template NAME] [--preview TEXT] [--metadata-file PATH] [--json]
  email broadcast preview-plan [--audience-file PATH] [--delivery-file PATH] [--sample-limit N] [--json]
  email broadcast create --draft-id ID [--scheduled-at ISO] [--audience-file PATH] [--delivery-file PATH] [--json]
  email canary create --draft-id ID [--steps 50,500,2000,all] [--scheduled-at ISO] [--audience-file PATH] [--delivery-file PATH] [--json]
  email canary promote ID [--step-index N] [--scheduled-at ISO] [--json]
  email canary get ID [--json]
  email broadcast list [--limit N] [--json]
  email broadcast get ID [--json]
  email broadcast stats ID [--json]
  email broadcast links ID [--json]
  email broadcast events ID [--limit N] [--json]
  email broadcast pause ID [--json]
  email broadcast resume ID [--json]
  email broadcast cancel ID [--json]
  email broadcast test --yes --draft-id ID --to EMAIL [--status new|warm|cold] [--json]

  Analytics:
  email analytics links [--broadcast-id ID] [--topic TOPIC] [--tag TAG] [--sponsor NAME] [--limit N] [--json]
      Detailed per-message/per-recipient link rollups.
  email analytics link-summary [--broadcast-id ID] [--topic TOPIC] [--tag TAG] [--sponsor NAME] [--limit N] [--json]
      Aggregate link performance by URL/topic/tag/sponsor. Prefer this for advertiser or campaign reports.
  email analytics rebuild-rollups --yes [--json]

  Sending and recovery:
  email provider ses-simulator --yes --draft-id ID --type success|bounce|complaint|ooto|suppression [--json]
  email message retry-failed --yes [--broadcast-id ID] [--limit N] [--json]
  email send due --yes [--now ISO] [--limit N] [--json]
  email worker send --yes [--once] [--batch-size N] [--interval-ms N]

  Interfaces:
  email api serve [--port N]
  email mcp serve

Notes:
  Use --json for agent/script callers.
  Commands that send or mutate queues require explicit --yes or confirmation flags.
  Default broadcast cadence is 1,000 messages/hour with warm-first ordering.
  Provider sends are throttled by EMAIL_SEND_RATE_PER_SECOND; batch size only controls queue claims.
`
}
