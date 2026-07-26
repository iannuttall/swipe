# Security

## Reporting a vulnerability

Do not open a public issue for a suspected vulnerability.

Use GitHub's private vulnerability reporting flow:

```txt
https://github.com/iannuttall/swipe/security/advisories/new
```

Please include:

- The affected app, package, route, or command.
- Clear reproduction steps.
- The practical impact.
- Any logs, screenshots, or request examples that help verify the problem.

## Secret handling

- Production secrets must never be committed.
- Local development secrets belong in ignored `.env*` and `.dev.vars*` files.
- Checked-in example files may contain only empty or placeholder values.
- Production secrets belong in GitHub Actions, Cloudflare Worker secrets, the
  VPS `.env.production`, or another managed secret store.
- The SES webhook secret appears in the URL path. Never print the complete
  webhook URL in logs, screenshots, issues, or test output.

## Local checks

Run these before pushing sensitive changes:

```sh
pnpm security:check
pnpm swipe site check
pnpm swipe check newsletter
```

`pnpm security:check` runs `pnpm audit` and the local `gitleaks` helper.
