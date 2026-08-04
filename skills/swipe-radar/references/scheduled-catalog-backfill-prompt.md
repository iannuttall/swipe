Run $swipe-radar in catalog-backfill mode.

This run improves the public `/tools` catalogue. It must not create or edit a
newsletter issue.

Start with the latest gitignored Radar candidate ledger, especially candidates
rejected from the issue shortlist. Create a page for every viable app, CLI,
repository, or agent skill. An item can be familiar, narrow, specialised, or
displaced by a stronger issue pick and still belongs in the catalogue. Reject
only when it meets an exclusion test in `tool-catalog.md`; record that evidence.
Articles, standalone prompts, and ordinary business stories are not catalogue
artefacts unless Radar has produced and Ian has approved a usable public tool,
CLI, repository, or skill from them.

Audit the existing `apps/site/src/content/tools/` pages too. Expand any thin
page that leaves obvious setup, practical-use, price, privacy, platform,
alternatives, or limitation questions unanswered. Start with cc-audit.

For every candidate or existing page:

1. Read `skills/swipe-radar/references/tool-catalog.md`.
2. Follow `skills/swipe-radar/references/tool-page-writing.md` in full.
3. Use $seo to map product-name and job-based search intent, inspect current
   results, and find genuine unanswered questions.
4. Read primary landing pages and relevant documentation. For repositories,
   inspect the README, agent files as source material only, user docs, release
   history, issues, package metadata, and relevant source.
5. Safely verify the central use. Never run unknown code merely to fill the
   catalogue.
6. Keep catalogue cards text-only; do not add product icons or generated initials.
7. Write a complete, direct article that helps a reader decide whether and how
   to use the tool. Do not pad a word count, but do not stop at a short product
   summary.

Inspect every credible candidate. There is no per-run page cap. Finish the
eligible backlog rather than stopping at an arbitrary count. A concise,
verified first page is acceptable; prioritise featured, stale, or
attention-earning pages for deeper enrichment.

Update stable tool files, sources, `lastChecked`, review intervals, and
issue history without changing established slugs. Preserve unrelated work.

This is an unattended local run. Do not commit, push, publish, deploy, send
email, or touch production services. Finish with the structured catalogue
result required by the supplied output schema.
