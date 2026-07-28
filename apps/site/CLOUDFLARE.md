# Cloudflare zone configuration

The site is a mostly prerendered Astro build deployed as a Cloudflare Worker
with static assets. Agent Markdown is self-managed. The `agentMarkdown()`
integration from `@iannuttall/seo-graph-astro` emits a static `.md` twin for
every indexable page, plus `agent-routes.json` and `llms.txt`.

The homepage uses a separate agent content template. Its Markdown explains
Swipe without including the visual page's decorative background cards.

## Keep Cloudflare's converter off

Cloudflare Markdown for Agents must stay off for this zone.

- The native converter is unavailable on the free plan.
- It converts final HTML, so Swipe cannot control the exact agent document.
- Swipe already creates deterministic Markdown during the site build.

The zone rules below only rewrite requests to static files. They do not run a
converter and do not add Worker CPU to agent traffic.

## Route Markdown requests at the edge

Prefer managing these rules through the local Workers CLI so the configuration
is repeatable. The same two rules may be added through the Cloudflare dashboard
when an authenticated browser session is the intended operator workflow.

```sh
workers rules rewrites list swipe
workers rules rewrites put-markdown swipe --dry-run
workers rules rewrites put-markdown swipe
```

`put-markdown` merges the two named rules into the existing rewrite ruleset.
It preserves unrelated rules and keeps the existing rule IDs where possible.

### Home page rewrite

The rule matches `https://swipe.md/` when the first accepted response type is
Markdown and rewrites the path to `/index.md`.

```txt
(http.host eq "swipe.md" and http.request.uri.path eq "/" and (lower(http.request.headers["accept"][0]) eq "text/markdown" or starts_with(lower(http.request.headers["accept"][0]), "text/markdown,")))
```

### Content page rewrite

The content rule appends `.md` to extensionless paths. It excludes API and
well-known routes.

```txt
(http.host eq "swipe.md" and http.request.uri.path ne "/" and not ends_with(http.request.uri.path, "/") and not (http.request.uri.path contains ".") and not starts_with(http.request.uri.path, "/api/") and not starts_with(http.request.uri.path, "/.well-known/") and (lower(http.request.headers["accept"][0]) eq "text/markdown" or starts_with(lower(http.request.headers["accept"][0]), "text/markdown,")))
```

The rewritten path is:

```txt
concat(http.request.uri.path, ".md")
```

The strict `Accept` check leaves `text/markdown;q=0` on HTML. File-extension
requests are excluded so `/about.md` does not become `/about.md.md`.

## Build output and headers

The build writes:

- one `.md` file for every public HTML page
- `agent-routes.json` with canonical paths, hashes, byte counts, and token
  estimates
- `llms.txt` as the short agent-facing site map
- alternate Markdown links in each HTML page
- `_headers` rules for Markdown content types, canonical links, token counts,
  and `Vary: Accept`

`public/_headers` owns the shared content policy and discovery headers.

## Check production

Run these after deploying the matching site build and applying the rules:

```sh
curl -sS -D - https://swipe.md/ -H 'Accept: text/markdown' -o /tmp/swipe-home.md
curl -sS -D - https://swipe.md/issues/the-only-seo-skill-your-agent-needs -H 'Accept: text/markdown' -o /tmp/swipe-issue.md
curl -sS https://swipe.md/index.md
curl -sS https://swipe.md/issues/the-only-seo-skill-your-agent-needs.md
curl -sS -D - https://swipe.md/ -H 'Accept: text/markdown;q=0' -o /dev/null
```

Negotiated and explicit Markdown must return the same bytes with
`Content-Type: text/markdown`. The `q=0` request must return HTML.
