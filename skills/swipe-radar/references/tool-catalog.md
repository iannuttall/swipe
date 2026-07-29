# Swipe tool catalogue

The public `/tools` directory keeps useful discoveries after the weekly Radar
run ends. It is a verified research library and a source of future issue
signals.

## Two thresholds

The issue threshold stays high. A tool needs a strong reason to appear this
week and one useful move worth teaching.

The catalogue threshold is wider. Publish a tool page when all of these are
true:

1. It helps someone complete a real job with AI.
2. Radar read a primary source and safely checked the central claim.
3. The page can give one concrete use and one honest limitation.
4. The tool is distinct from existing catalogue entries.
5. There is enough verified information for a useful page without padding.

Keep weak leads, generic wrappers, unsafe products, and unverified claims in
the private Radar report. Do not publish thin pages to make the directory look
larger.

## File contract

Each tool lives at:

```text
apps/site/src/content/tools/<stable-product-slug>.md
```

Use the schema in `apps/site/src/content.config.ts`. Keep:

- the product name and a short plain-English tagline;
- one unique meta description;
- a locally saved product favicon or app icon when one exists;
- the canonical product URL;
- whether it is a web, mobile, desktop, browser, or repository tool;
- the platforms it actually supports;
- its repository when one is central to the product;
- a useful category and a few real tags;
- `firstSeen`, `lastChecked`, and an honest review interval;
- `featuredIssues` as stable Swipe issue slugs;
- typed, dated primary sources;
- a useful article explaining the use, a concrete example, our verdict, and
  the limitation.

Keep slugs stable when names or positioning change. Deduplicate by product
website, repository, and actual job before creating a file.

Follow
[tool-page-writing.md](tool-page-writing.md) for the mandatory landing-page,
documentation, repository, fact-checking, search-intent, writing, and lint
passes. A landing-page summary is not a finished tool page.

## Weekly lifecycle

At the start of a run:

1. Read every existing tool record.
2. Run `pnpm swipe radar catalog --json`.
3. Note stale pages, previous issue appearances, and recent source changes.
4. Use search impressions, clicks, reader submissions, and future votes as
   discovery signals when available.
5. Recheck a known tool when a release, new use, or limitation gives us
   something materially different to say.

After research:

1. Update existing records with verified changes.
2. Create records for new tools that clear the catalogue threshold.
3. Add the new issue slug to `featuredIssues` for selected tools.
4. Leave rejected candidates and test receipts under `notes/radar/`.

Popularity, search traffic, and votes affect what Radar looks at next. They do
not replace editorial judgment or primary-source checks.

## Public copy

Write for someone deciding whether the tool is useful, not for a search
engine. Every page needs distinct, factual copy. Do not repeat a product's
marketing page, generate fake examples, or mention keyword and ranking intent
in public.
