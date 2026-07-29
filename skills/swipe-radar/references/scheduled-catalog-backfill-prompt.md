Run $swipe-radar in catalog-backfill mode.

This run improves the public `/tools` catalogue. It must not create or edit a
newsletter issue.

Start with the latest gitignored Radar candidate ledger, especially candidates
rejected from the issue shortlist. Re-evaluate each tool against the wider
catalogue threshold. An item can be too familiar, too narrow for this week's
issue, or displaced by a stronger pick and still deserve a useful tool page.
The normal kill list still applies. Do not publish generic agent runners,
orchestrators, weak wrappers, unsafe products, articles, or ordinary business
stories as tools.

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
6. Save the product's own favicon or app icon locally when one exists.
7. Write a complete, direct article that helps a reader decide whether and how
   to use the tool. Do not pad a word count, but do not stop at a short product
   summary.

Inspect all credible candidates, but create or materially rewrite no more than
eight pages in one run. Fewer is fine. Keep weak candidates and factual
uncertainties in the private report.

Update stable tool files, sources, `lastChecked`, review intervals, icons, and
issue history without changing established slugs. Preserve unrelated work.

This is an unattended local run. Do not commit, push, publish, deploy, send
email, or touch production services. Finish with the structured catalogue
result required by the supplied output schema.
