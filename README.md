<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="apps/site/public/logo-white.svg">
    <source media="(prefers-color-scheme: light)" srcset="apps/site/public/logo-black.svg">
    <img src="apps/site/public/logo-black.svg" alt="Swipe" width="96">
  </picture>
</p>

<h1 align="center">swipe.md</h1>

<p align="center">
  Swipe the best AI skills, prompts, tools, and workflows.
</p>

<p align="center">
  <a href="https://swipe.md">Website</a>
  ·
  <a href="docs/README.md">Docs</a>
  ·
  <a href="SECURITY.md">Security</a>
  ·
  <a href="LICENSE">License</a>
  ·
  <a href="AGENTS.md">Agent notes</a>
</p>

<p align="center">
  <img alt="Astro 7" src="https://img.shields.io/badge/Astro-7-ff5d01?style=flat-square">
  <img alt="Cloudflare Workers" src="https://img.shields.io/badge/Cloudflare-Workers-f38020?style=flat-square">
  <img alt="TypeScript ready" src="https://img.shields.io/badge/TypeScript-ready-3178c6?style=flat-square">
  <img alt="pnpm 11" src="https://img.shields.io/badge/pnpm-11-f69220?style=flat-square">
  <img alt="Security checks" src="https://img.shields.io/badge/security-gitleaks%20%2B%20audit-3fb950?style=flat-square">
  <img alt="License" src="https://img.shields.io/badge/license-MIT-lightgrey?style=flat-square">
</p>

## What this repo contains

This is a monorepo for the Swipe site, issue archive, newsletter system, and
local operator tools.

`apps/site` is the public `swipe.md` site. It is an Astro 7 app built for
Cloudflare Workers. Pages and shared components use Astro. Alpine handles the
signup form and homepage background cards.

`apps/newsletter` is the newsletter platform. It runs on a VPS with Node,
Postgres, Docker, Caddy, and Amazon SES. It includes the Hono API, operator CLI,
stdio MCP server, public unsubscribe pages, and React Email templates.

`packages/swipe` is the small local helper CLI. It wraps the site, newsletter,
and issue commands that are annoying to remember.

The repo is public because the publishing and agent workflows may be useful to
other people. It is still a personal setup, so expect sharp edges.

## How to run the site locally

Install dependencies first.

```sh
pnpm install
```

Run the Astro dev server.

```sh
pnpm dev
```

Run the Cloudflare Worker dev server when Worker runtime behavior matters.

```sh
pnpm dev:cf
```

Check and build the site.

```sh
pnpm swipe site check
pnpm build
```

## How to run the newsletter locally

Run the newsletter web app.

```sh
pnpm newsletter:web:dev
```

Open the React Email preview server.

```sh
pnpm newsletter:email:preview
```

Run the API, worker, or migrations through the helper.

```sh
pnpm swipe newsletter api --port 3000
pnpm swipe newsletter worker
pnpm swipe newsletter migrate
```

## The `pnpm swipe` helper

`pnpm swipe` wraps routine site and newsletter operations.

```sh
pnpm swipe help
```

Useful site commands:

```sh
pnpm swipe site dev
pnpm swipe site dev:cf
pnpm swipe site build
pnpm swipe site check
pnpm swipe site generate-types
```

Useful newsletter commands:

```sh
pnpm swipe newsletter doctor
pnpm swipe newsletter checklist
pnpm swipe newsletter migrate
pnpm swipe newsletter queue
pnpm swipe newsletter render --subject "Test" --body-file apps/newsletter/draft.md
pnpm swipe newsletter draft --subject "Test" --body-file apps/newsletter/draft.md
pnpm swipe newsletter test-send --draft-id draft_id --to you@example.com
pnpm swipe newsletter email-preview
pnpm swipe newsletter cli -- help
```

Issue commands use Markdown files under `apps/site/src/content/issues`.

```sh
pnpm swipe issue preview <slug>
pnpm swipe issue test <slug>
pnpm swipe issue approve <slug> --yes
pnpm swipe issue send <slug> --yes
```

`issue test` publishes the archive first and sends an exact, tracked production-path
test. After inspecting the received email, `issue approve` verifies every emitted
tracking URL with browser navigation headers and real Chromium, then stores a QA
receipt against the immutable production draft. `issue send` is blocked unless that
exact receipt is present, current, and still matches the issue content.

Check or build one app area:

```sh
pnpm swipe check site
pnpm swipe check newsletter
pnpm swipe check newsletter-web
pnpm swipe build site
pnpm swipe build newsletter
pnpm swipe build newsletter-web
```

Available targets are `site`, `newsletter`, `newsletter-api`,
`newsletter-cli`, `newsletter-core`, `newsletter-mcp`, and `newsletter-web`.

## All root commands

| Command | What it does |
| --- | --- |
| `pnpm dev` | Starts the Astro site dev server. |
| `pnpm dev:cf` | Starts the site in Wrangler dev. |
| `pnpm build` | Builds the site and regenerates the sitemap. |
| `pnpm check` | Checks the Astro site. |
| `pnpm preview` | Runs Astro preview for the built site. |
| `pnpm generate-types` | Generates Cloudflare Worker types. |
| `pnpm build:sitemap` | Regenerates the sitemap XML file. |
| `pnpm site:deploy` | Builds and deploys the site Worker. Only run it when you mean to deploy. |
| `pnpm site:deploy:dry-run` | Builds and validates a Worker upload without deploying. |
| `pnpm swipe` | Runs the local helper CLI. |
| `pnpm security:audit` | Runs `pnpm audit`. |
| `pnpm security:secrets` | Runs a full-history `gitleaks` scan. |
| `pnpm security:check` | Runs the audit and secret scan together. |
| `pnpm newsletter:build` | Builds all newsletter packages. |
| `pnpm newsletter:email:preview` | Starts the React Email preview tool. |
| `pnpm newsletter:lint` | Runs newsletter file-length, Biome, and package checks. |
| `pnpm newsletter:test` | Runs newsletter tests. |
| `pnpm newsletter:typecheck` | Runs newsletter type checks. |
| `pnpm newsletter:web:dev` | Starts the newsletter web app. |

## Environment files and secrets

Real secrets never belong in git.

Use ignored local files for development:

```txt
.env
.env.*
.dev.vars
.dev.vars.*
```

The site uses these Cloudflare Worker secrets:

- `NEWSLETTER_API_TOKEN` authorizes signup requests to the newsletter service.
- `NEWSLETTER_WEBHOOK_SECRET` rejects invalid SES webhook paths at the edge.
- `TURNSTILE_SITE_KEY` renders the subscriber confirmation check.
- `TURNSTILE_SECRET_KEY` validates the check before a subscription changes.

`NEWSLETTER_API_URL` is an optional Worker variable for the private newsletter
origin. It currently defaults to `https://list.ian.is` during migration.

The complete Cloudflare Email Routing, Mailroom, Gmail, SES, IAM, SNS, DNS, and
webhook setup is in [the email runbook](docs/email-setup.md). Use
[the operations guide](docs/email-operations.md) for tests and credential
rotation.

## How deploys are split

The site and newsletter deploy independently.

The site deploys to Cloudflare Workers from `apps/site`.
The homepage and content pages are prerendered. The Worker runs only API,
tracking, and unsubscribe routes that need request-time behavior.

The newsletter deploys to the existing VPS service from `apps/newsletter`.
The GitHub Action is path-filtered so site-only changes do not deploy it.
Automatic VPS deploys remain gated by the `NEWSLETTER_DEPLOY_ENABLED`
repository variable during the handoff. A trusted manual dispatch can still run
the workflow.

The public newsletter API belongs on `swipe.md`. Signup and SES webhook routes
are same-origin Worker routes that proxy to the VPS service. There is no public
`list.swipe.md` product surface.

## Ian's List transition

The final Ian's List email uses a per-contact Swipe confirmation link. Existing
active contacts remain active during the response window. After the deadline,
an operator reviews a dry run and explicitly unsubscribes non-confirmers in the
exact migration batch.

See [the subscriber confirmation guide](docs/subscriber-confirmation.md) for
the setup and commands.

## Security checks

Run these before pushing sensitive changes:

```sh
pnpm security:check
pnpm swipe site check
pnpm swipe check newsletter
```

See `SECURITY.md` for the reporting policy and public repo rules.

## Repo map

```txt
apps/
  site/                    Astro + Cloudflare Worker site
  newsletter/              Newsletter platform for the VPS
    packages/api/          Hono API
    packages/cli/          Operator CLI
    packages/core/         Newsletter domain logic
    packages/mcp/          stdio MCP server
    packages/web/          Astro unsubscribe/preferences pages
packages/
  swipe/                   Small local helper CLI
docs/                      Setup and operations runbooks
```

## Agent notes

Agents should read `AGENTS.md` first. App and package folders have smaller
`AGENTS.md` files for local rules. Every `CLAUDE.md` is a symlink to the
matching file so Claude and Codex share one source of truth.

## License

MIT.
