# Agent notes

This repository owns `swipe.md`: the public site, issue archive, newsletter
platform, and local operator tooling for Swipe.

`CLAUDE.md` files should be symlinks to matching `AGENTS.md` files. Do not keep
parallel copies.

## Repo map

- `apps/site`: Astro + Cloudflare Worker site for `swipe.md`.
- `apps/newsletter`: Node/Postgres newsletter platform deployed to the VPS.
- `apps/newsletter/packages/core`: newsletter domain logic.
- `apps/newsletter/packages/api`: Hono API.
- `apps/newsletter/packages/cli`: operator CLI.
- `apps/newsletter/packages/mcp`: stdio MCP server.
- `apps/newsletter/packages/web`: unsubscribe and other public service pages.
- `packages/swipe`: the local `swipe` command for site, issue, and newsletter operations.
- `docs`: operator setup, testing, rotation, and troubleshooting guides.
- `skills`: project-specific agent workflows when they become stable enough to keep.

## Ownership

Swipe owns newsletter issue content, canonical issue URLs, subscriber
operations, and newsletter branding. `ian.is` may drive signups and contribute
content, but it is a separate personal site.

Public issues live at `/issues/<slug>` on `swipe.md`. Keep slugs stable. Existing
`ian.is/issues/<slug>` URLs should permanently redirect to the matching Swipe
URL after the new site is deployed.

## Commands

```sh
pnpm install
pnpm dev
pnpm build
pnpm check
pnpm swipe help
pnpm swipe check site
pnpm swipe check newsletter
pnpm swipe issue preview <slug>
pnpm swipe issue test <slug>
pnpm swipe issue send <slug> --yes
pnpm newsletter:test
pnpm newsletter:lint
pnpm newsletter:typecheck
```

Use `pnpm`, not npm.

## Deployment boundaries

- The site deploys independently from `apps/site` to Cloudflare Workers.
- The newsletter platform deploys independently from `apps/newsletter` to the VPS.
- Do not deploy, change DNS, attach domains, or send a real broadcast unless the
  user explicitly asks.
- Moving code does not require moving the existing Postgres database or SES
  configuration at the same time.
- The existing `ian.is` install sends the final Ian's List transition email.
  The message uses Swipe confirmation links, but the familiar Ian's List
  sender remains in place for that announcement.
- The newsletter production workflow still targets the existing service domain
  during migration. Change its public hostname only as a deliberate DNS and
  email-deliverability cutover.
- Automatic newsletter deploys require the GitHub repository variable
  `NEWSLETTER_DEPLOY_ENABLED=true`. Keep it false during the initial repo
  handoff. A trusted manual workflow dispatch remains an explicit deploy.
- The workflow syncs only the root workspace files needed for the build plus
  `apps/newsletter/**` to `/opt/apps/email`.
- Normal deploys start `postgres`, `app`, and `web`. The sender `worker` stays
  behind the explicit `sender` profile.

## Public API and SES webhooks

- Public newsletter APIs belong on `swipe.md`. Do not create a public
  `list.swipe.md` surface.
- `apps/site/src/pages/api/subscribe.ts` proxies signups to the newsletter VPS.
- `apps/site/src/pages/confirm/[token].astro` runs the managed Turnstile check.
- `apps/site/src/pages/api/confirm.ts` validates Turnstile before calling the
  protected newsletter confirmation API.
- `apps/site/src/pages/api/webhooks/[secret]/ses.ts` proxies the public SES SNS
  endpoint to the VPS.
- The public webhook shape is `/api/webhooks/<secret>/ses`.
- `NEWSLETTER_WEBHOOK_SECRET` on the site Worker must equal
  `AWS_SNS_WEBHOOK_SECRET` on the VPS.
- The newsletter API still verifies the allowed SNS topic ARN and AWS SNS
  signature. Do not weaken those checks because Cloudflare accepted the request.
- Never print the complete webhook URL. Redact the secret segment in logs,
  screenshots, docs, issues, and command output.
- `NEWSLETTER_API_URL` may continue pointing at `https://list.ian.is` as the
  private origin during migration.
- Keep `docs/email-setup.md`, `docs/email-operations.md`, and
  `docs/subscriber-confirmation.md` current when email or confirmation behavior
  changes.

## Runtime

- The site is Astro 7 on the Cloudflare adapter.
- Static content routes should prerender. API routes and request-time behavior
  stay SSR.
- Pages and components use Astro. Alpine owns small client interactions such as
  the signup form and homepage background cards.
- The newsletter is Node 24 with Postgres, Hono, React Email, Docker, Caddy,
  Amazon SES, and an explicit sender worker.
- `nodejs_compat` is required in `apps/site/wrangler.jsonc`.

## Content and UI

- Keep the homepage visually intact unless a redesign is explicitly requested.
- New pages use the reusable Astro layout and components under
  `apps/site/src/components`.
- Issues are authored in `apps/site/src/content/issues`.
- General Markdown/MDX pages live in `apps/site/src/content/pages`.
- Keep common SEO metadata, navigation, and footer behavior in the root layout.
- Follow `~/blueprints/workers/references/content-rules.md` for public copy.
- Follow `~/blueprints/workers/references/design-rules.md` for public UI.
- Prefer Astro components for page structure and content. Keep client-side
  JavaScript inside small Alpine modules.
- Reuse page headers, framed surfaces, prose styles, signup, and code treatment
  instead of recreating them per page.

## Issue flow

- The filename under `apps/site/src/content/issues` is the canonical issue
  slug. Do not use an issue number as the URL.
- Draft with `draft: true`.
- Run `pnpm swipe issue preview <slug>` for the local email render and web URL.
- Run `pnpm swipe issue test <slug>` only when the production test recipient
  and sender are intentional.
- `pnpm swipe issue send <slug> --yes` publishes the archive before creating a
  broadcast. Keep `broadcastId` as the double-send guard.
- The issue parser has one canonical newsletter copy and one verbatim site
  copy. The site build parity check must stay green.

## Safety

- Preserve unrelated user changes.
- Never commit `.env`, `.dev.vars`, credentials, database dumps, rendered email
  output, `.astro`, `.wrangler`, `dist`, or `node_modules`.
- Issue send commands publish and send real email. They require explicit
  confirmation and must retain the existing double-send guard.
- Opening a subscriber confirmation URL must never mutate consent. The site
  must validate Turnstile server-side before posting the signed token to the
  protected newsletter API.
- Migration cleanup must remain a dry run unless `--yes` is present. It may
  only target one exact expired batch.
- Run `pnpm security:check`, `pnpm swipe site check`, and
  `pnpm swipe check newsletter` before publishing sensitive changes.
- Public pull requests must not receive production secrets.

## Commit style

Use conventional commits with a scope:

```sh
feat(site): add issue archive
fix(newsletter): verify SNS topic
ci(deploy): gate VPS handoff
docs(repo): explain local commands
```
