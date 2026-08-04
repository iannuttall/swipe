# Swipe tool catalogue

The public `/tools` directory keeps useful discoveries after the weekly Radar
run ends. It is a verified research library and a source of future issue
signals.

## Two thresholds

The issue threshold stays high. A tool needs a strong reason to appear this
week and one useful move worth teaching.

The catalogue is default-in. Every distinct app, CLI, public repository, or
agent skill that reaches source inspection should receive a page when a reader
can actually use it. It does not need to be one of the week's best picks,
popular, new, or broadly useful.

Do not publish it only when one of these exclusion tests applies:

1. It duplicates an existing product or canonical page.
2. It has no concrete usable job or accessible artefact.
3. It is unsafe, malicious, deceptive, or asks readers to use reckless defaults.
4. It is dead or unusable and has no still-useful release.
5. Credible evidence shows serious recurring failures or overwhelmingly
   negative user experience.
6. Radar cannot verify even the identity, central use, and one limitation from
   a primary source or safe check.

Poor documentation, a narrow audience, low stars, an old release, or missing
this week's issue are not rejection reasons by themselves. Record the evidence
for every rejection in the candidate ledger.

## File contract

Each tool lives at:

```text
apps/site/src/content/tools/<stable-product-slug>.md
```

Use the schema in `apps/site/src/content.config.ts`. Keep:

- the product name and a short plain-English tagline;
- one unique meta description;
- the canonical product URL;
- whether it is a web, mobile, desktop, browser, CLI, repository, or skill;
- the platforms it actually supports;
- its repository when one is central to the product;
- a useful category and a few real tags;
- `firstSeen`, `lastChecked`, and an honest review interval;
- `featuredIssues` as stable Swipe issue slugs for editorial appearances;
- `sponsoredIssues` separately for paid placements, which never imply an
  editorial endorsement;
- typed, dated primary sources;
- enough original copy to explain the use, a concrete example, and a real
  limitation.

Keep slugs stable when names or positioning change. Deduplicate by product
website, repository, and actual job before creating a file.

Follow [tool-page-writing.md](tool-page-writing.md) for the verified listing
pass. Featured tools, stale pages, and pages earning reader or search interest
get the deeper research and enrichment pass.

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
2. Create records for every new viable artefact; otherwise record the exact
   exclusion test it failed.
3. Add the new issue slug to `featuredIssues` for selected tools.
4. Leave rejected candidates and test receipts under `notes/radar/`.

Popularity, search traffic, and votes affect what Radar looks at next. They do
not replace editorial judgment or primary-source checks.

## Public copy

Write for someone deciding whether the tool is useful, not for a search
engine. Every page needs distinct, factual copy. Do not repeat a product's
marketing page, generate fake examples, or mention keyword and ranking intent
in public.

The public directory is text-only. Do not download, invent, or add product
icons or generated initials to catalogue cards.
