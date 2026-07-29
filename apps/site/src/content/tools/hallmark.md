---
name: "Hallmark"
seoTitle: "Hallmark AI design skill for coding agents"
headline: "Hallmark: A design skill for coding agents"
tagline: "Give coding agents clearer rules for building and reviewing interfaces."
description: "Hallmark is an opinionated design skill for building, auditing, redesigning, and studying interface projects with Claude Code, Cursor, or Codex."
icon: "/tools/icons/hallmark.png"
url: "https://www.usehallmark.com/"
kind: "repository"
platforms: ["Claude Code", "Cursor", "Codex"]
repository: "https://github.com/Nutlope/hallmark"
category: "Design"
tags: ["AI design", "agent skill", "UI audit"]
status: "early"
firstSeen: 2026-07-29
lastChecked: 2026-07-29
reviewEveryDays: 60
featuredIssues: []
sources:
  - kind: "landing"
    label: "Hallmark examples"
    url: "https://www.usehallmark.com/"
    checkedAt: 2026-07-29
  - kind: "repository"
    label: "Hallmark source and README"
    url: "https://github.com/Nutlope/hallmark"
    checkedAt: 2026-07-29
  - kind: "docs"
    label: "Hallmark skill instructions"
    url: "https://github.com/Nutlope/hallmark/blob/main/skills/hallmark/SKILL.md"
    checkedAt: 2026-07-29
  - kind: "other"
    label: "Hallmark installation size issue"
    url: "https://github.com/Nutlope/hallmark/issues/50"
    checkedAt: 2026-07-29
---

## Hallmark is a design rulebook, not a website builder

Hallmark is a large set of instructions for coding agents that already know
how to edit a web project. It tries to stop those agents from falling back to
the same centred hero, three feature cards, purple gradient, and vague product
copy.

The skill covers four jobs:

- build a new interface from a brief
- audit an existing page without changing it
- redesign a page while preserving its content and project boundaries
- study a screenshot or URL and describe its structural design choices

Its distinctive idea is structural variety. Hallmark chooses from 21 page
macrostructures, a catalogue of visual themes, and smaller component patterns.
It also checks typography, colour, responsive behaviour, motion, copy, and
accessibility before returning work.

This is specific enough to be useful software-like tooling. It is not a generic
agent runner and it does not add another model or hosted design service.

## Start with a read-only audit

Install the skill with the Skills CLI:

```sh
npx skills add nutlope/hallmark
```

The repository also documents manual installation for Claude Code and Codex.
Cursor uses the body of the skill as a project rule rather than the same folder
layout.

The safest first use is:

```text
hallmark audit apps/site/src/pages/index.astro
```

The audit contract says to return a ranked punch list without editing files.
Use it on one page, then decide which findings fit the product and existing
design system.

For a redesign name the boundary yourself:

```text
hallmark redesign the pricing page.
Keep the route, copy, components, fonts, and brand colours.
Only change layout, spacing, and interaction styles.
List the files before editing.
```

Hallmark's own instructions tell the agent to scan the current font stack,
palette, spacing, framework, and `design.md` before proposing a direction. It
also requires explicit approval before deleting production files. Those
constraints are useful, but the host agent still has to follow them.

## What the study mode can and cannot do

`hallmark study` reads a screenshot or public URL and reports the page's
macrostructure, type roles, colour anchor, density, and interaction patterns.
It is meant to extract reusable design choices, not reproduce the source
pixel for pixel.

URL mode depends on the host agent's web fetch. It can inspect HTML and CSS but
cannot reliably judge visual rhythm from source alone. Screenshot mode can see
composition but should not guess an exact font from pixels. Hallmark tells the
agent to name font roles and propose alternatives instead.

The skill refuses paid template listings and asks for ownership or permission
before turning a source design into a portable `design.md`. That is a useful
boundary. It still relies on the model to identify a questionable source and
honour the refusal.

## Price, storage, and privacy

Hallmark is free and MIT licensed. It has no Hallmark account, telemetry, API
key, or subscription. You still pay for the coding agent and any model or
browser tools that agent uses.

The installed skill is text stored in your agent's skill or rule directory.
During use it can write `.hallmark/preflight.json` and `.hallmark/log.json`
inside a project to remember its scan and avoid repeating recent design
choices. Review those files before committing them.

Any code, screenshots, URLs, or prompts are handled by Claude Code, Cursor,
Codex, or another tool in the workflow. Hallmark itself does not send them
somewhere, but installing the skill does not make the host agent local or
private.

## Where the claims stop

Hallmark's demo gallery shows what its authors produced with the rulebook. It
is not an independent test and does not prove that a fresh agent will make a
better page for every brief.

The checks are instructions evaluated by the same kind of model that creates
the design. They are not deterministic lint rules. The repository currently
even has an open issue about whether the documented gate count is 57 or 58.
Always inspect the rendered result at phone and desktop widths, use automated
accessibility checks, and test real interactions.

The installed bundle is also large for an agent skill. An open issue reports a
roughly 1 MB install and asks for the audit, redesign, and study commands to be
split. Skill-aware agents may load references only when needed, but older rule
systems can consume more context.

Hallmark is strongly opinionated. A mature product with a tested design system
should use that system as the source of truth. Structural variety across
unrelated sites is valuable. Applying it to every page of one product can
weaken consistency.

## Alternatives

Anthropic publishes a frontend design skill with a similar goal. A small
project-specific `design.md` can be cheaper and more predictable when the
brand already has tokens, components, and interaction rules. A screenshot loop
with a designer or visual regression tests gives stronger evidence than
self-critique alone.

Choose Hallmark when you want a ready-made, multi-agent design vocabulary and
the audit, redesign, and study verbs are useful. Skip it when a concise
existing design system already answers the same questions.
