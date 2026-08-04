# Tool catalogue

Swipe keeps public tool articles and changing reader signals separate.

## Public pages are static

Every public article lives at:

```text
apps/site/src/content/tools/<stable-product-slug>.md
```

Astro validates the frontmatter and prerenders `/tools` plus every
`/tools/<slug>` route. A production request does not need D1 to render the
article. The Markdown file remains the source of truth for the product name,
description, article copy, sources, review date, and issue history.

Catalogue cards are text-only. Radar does not download product favicons or
generate placeholder initials.

The directory shows 12 tools per prerendered page. Every build also regenerates
`/tools/index.json`, which powers the client-side search without making content
pages depend on JavaScript or a database.

Radar must follow:

```text
skills/swipe-radar/references/tool-page-writing.md
```

before creating or updating a page.

The catalogue is default-in for usable apps, CLIs, public repositories, and
agent skills. Missing the newsletter is not a reason to omit a page. Radar
rejects only duplicates, unusable or unverifiable artefacts, unsafe or
deceptive products, dead releases with no remaining use, and candidates with
serious negative evidence. New entries may begin as concise verified listings;
featured, stale, or attention-earning pages receive deeper research later.

## D1 stores changing signals

The first schema is:

```text
apps/site/migrations/0001_catalog_signals.sql
```

It stores:

- stable entity keys for tools, skills, and workflows;
- source-review history and the next review date;
- issue appearances and when an item last featured;
- Hacker News, GitHub, search, vote, submission, and manual signals;
- reader votes using a one-way identifier;
- reader submissions before Radar accepts them.

D1 does not store article copy. A failed database read must never stop a static
tool page loading.

Signals decide what Radar should inspect next. They do not decide what gets
published or featured. Radar still has to read primary sources, safely test the
central claim, and apply the catalogue or issue threshold.

## Review cycle

Run:

```sh
pnpm swipe radar catalog --json
```

The command reads the static frontmatter and reports:

- the last source check;
- each page's configured review interval;
- the next review date;
- whether review is due;
- previous issue appearances;
- the most recent issue appearance.

The default review interval is 180 days. Fast-moving or fragile tools can set a
shorter interval in their frontmatter.

A due date starts a source review. It does not guarantee an article update or
newsletter slot. Radar records `keep`, `update`, `retire`, or `reject` after
checking the current product.

## Binding the database

The migration is deliberately kept in source before a production database is
attached. Creating and binding the Cloudflare database is an infrastructure
step, not part of an unattended Radar run.

When the database is created, add a `CATALOG_DB` entry to
`apps/site/wrangler.jsonc` and point its `migrations_dir` at `migrations`.
Apply migrations locally first, then remotely as an explicit production
operation.

The public vote and submission routes should use prepared statements, validate
and normalize input, rate-limit writes, and never store raw IP or email
addresses for vote deduplication.

## Future sync boundary

A deterministic sync command should eventually:

1. read the validated Markdown tool collection;
2. upsert stable identity and review dates into `catalog_entities`;
3. derive issue appearances from the canonical issue collection;
4. preserve independently collected signals and check history;
5. print a dry-run diff before a remote write.

The reverse path is narrower. Radar may read D1 signals into its private
research report, but it must never replace Markdown copy with database content
or publish from a score alone.
