---
name: "Here.now"
seoTitle: "Here.now: Free instant web hosting for AI agents"
headline: "Here.now: Free instant web hosting for AI agents"
tagline: "Publish an agent-made page to a temporary URL with no setup."
description: "Here.now publishes a file or static site to a shareable URL for reports and prototypes, with anonymous 24-hour links and account-owned permanent sites."
icon: "/tools/icons/here-now.png"
url: "https://here.now/"
kind: "web-app"
platforms: ["Web"]
repository: "https://github.com/heredotnow/skill"
category: "Web hosting"
tags: ["static hosting", "prototypes", "agent skills"]
status: "early"
firstSeen: 2026-07-29
lastChecked: 2026-07-29
reviewEveryDays: 60
featuredIssues: ["sketch-an-app-with-ai"]
sources:
  - kind: "landing"
    label: "Here.now"
    url: "https://here.now/"
    checkedAt: 2026-07-29
  - kind: "docs"
    label: "Here.now documentation"
    url: "https://here.now/docs"
    checkedAt: 2026-07-29
  - kind: "repository"
    label: "Official Here.now agent skill"
    url: "https://github.com/heredotnow/skill"
    checkedAt: 2026-07-29
  - kind: "docs"
    label: "Here.now data processing agreement"
    url: "https://here.now/dpa"
    checkedAt: 2026-07-29
---

## What Here.now is good at

Here.now gives an AI agent a short path from a local file to a live URL. It can
publish an HTML prototype, report, chart, PDF, image, video, or folder of
static files.

The best use is a disposable review surface. Ask an agent to build a small
interactive report, publish only the finished directory, and send the link to
someone who should not need a local development setup.

An anonymous site needs no account and expires after 24 hours. This is useful
for a quick review, but it is not private. Anyone with the URL can open it.

## Install the agent skill

The official skill works with compatible coding agents:

```sh
npx skills add heredotnow/skill --skill here-now -g
```

It includes a `publish.sh` helper and instructions for the three-stage publish
API. The helper needs `curl`, `file`, and `jq`.

Put only public-ready output in a clean directory, then ask the agent to
publish that directory. For HTML, `index.html` should sit at its root. A
successful anonymous publish returns a site URL, a one-time claim URL, and an
expiry.

We used the anonymous API for a harmless static receipt with no credentials or
personal data. The page returned the expected content and a 24-hour expiry.
That checks the central upload and serve flow. We did not use a Swipe site,
production system, or private file.

## Inspect the directory before publishing

The bundled helper walks every file below the target directory. It does not
apply `.gitignore` rules and does not automatically exclude `.env`, source
maps, database files, or private notes.

Build or copy the finished files into a separate folder first:

```text
review-site/
  index.html
  styles.css
  assets/
```

List that folder and search it for credentials before publishing. Do not point
the helper at a repository root simply because the page lives there.

The helper writes anonymous claim details to `.herenow/state.json` in the
working directory. Keep that file out of source control. The claim URL is
shown only once and is effectively an ownership secret until the site is
claimed.

## Free and account-owned sites

Here.now documents four personal tiers: Anonymous, Free, Hobby, and Developer.
Anonymous publishing and the Free plan cost nothing. The Free account currently
includes permanent sites, 10 GB of shared storage, up to 500 sites, one custom
domain, and basic Site Data. The public documentation lists limits for paid
tiers but does not show their current prices, so check the dashboard before
choosing one.

A signed-in site can also use a password or a restricted email allowlist.
Workspace sites can default to members only. Set access before sharing anything
that is not meant for the open web.

Here.now is still static hosting. Site Data adds small validated collections
for forms, polls, and shared state, but it is not a general server runtime.
Use a normal application host when you need server-side rendering, long-running
jobs, private backend credentials, or a database with its own operational
requirements.

## What happens to uploaded data

Site files are stored in Cloudflare R2 and served through Cloudflare. Anonymous
sites are deleted after 24 hours. Account-owned sites remain until deleted.

The service records paths, sizes, hashes, request paths, referrers, coarse
geography, and privacy-preserving visitor signals. It says raw IP addresses are
not exposed to site owners and uploaded content is not used to train AI models.

There is one AI-specific detail worth knowing. When automatic site metadata is
enabled bounded excerpts from published files can be sent through OpenRouter
to a Google model to create display names and descriptions. Set that metadata
yourself when the page contains material you do not want sent for summarising.
Workspace administrators can disable automatic AI metadata.

## Updating and deleting

Claim an anonymous site before it expires if you need to keep it. Claimed and
account-owned sites can be updated by slug, given a custom expiry, protected,
or deleted.

The official helper is early software. An open issue currently reports that
republishing an unchanged site can fail on macOS and leave a pending version.
Keep the original output directory and check the returned site after every
update.

## Alternatives

Use a local development server when every reviewer is on your machine. Use
Cloudflare Pages, Netlify, Vercel, or GitHub Pages for a maintained site with a
normal deployment history. Other instant hosts can upload one HTML file, but
many lack an agent skill, claim flow, access controls, and account-owned
updates.

Here.now fits best between those options: faster than setting up a deployment,
more capable than sending a screenshot, and deliberately temporary when you
stay anonymous.
