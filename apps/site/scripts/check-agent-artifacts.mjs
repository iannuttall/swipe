import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const dist = resolve(import.meta.dirname, "../dist/client");
const manifestPath = resolve(dist, "agent-routes.json");
const headersPath = resolve(dist, "_headers");
const llmsPath = resolve(dist, "llms.txt");
const toolSearchPath = resolve(dist, "tools/index.json");

assert.ok(existsSync(manifestPath), "Missing agent-routes.json");
assert.ok(existsSync(headersPath), "Missing generated _headers");
assert.ok(existsSync(llmsPath), "Missing llms.txt");
assert.ok(existsSync(toolSearchPath), "Missing tools/index.json");

const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
assert.equal(manifest.version, 1);
assert.equal(manifest.site, "https://swipe.md");
assert.ok(manifest.pages.length > 0, "Agent route manifest has no pages");

const htmlPaths = manifest.pages.map((page) => page.htmlPath);
assert.deepEqual(htmlPaths, [...htmlPaths].sort());
assert.equal(new Set(htmlPaths).size, htmlPaths.length, "Duplicate agent routes");

for (const page of manifest.pages) {
  const markdownPath = resolve(dist, page.markdownFile);
  const htmlPath = resolve(dist, page.htmlFile);
  assert.ok(existsSync(markdownPath), `Missing ${page.markdownFile}`);
  assert.ok(existsSync(htmlPath), `Missing ${page.htmlFile}`);

  const markdown = readFileSync(markdownPath, "utf8");
  const html = readFileSync(htmlPath, "utf8");
  const markdownUrl = new URL(page.markdownPath, manifest.site).toString();

  assert.equal(Buffer.byteLength(markdown), page.bytes, page.markdownFile);
  assert.equal(Math.ceil(page.bytes / 4), page.tokens, page.markdownFile);
  assert.equal(
    createHash("sha256").update(markdown).digest("hex"),
    page.sha256,
    page.markdownFile,
  );
  assert.match(
    markdown,
    /^---\ntitle: .+\ndescription: .+\ncanonical: .+\nlanguage: .+\n---\n/u,
    page.markdownFile,
  );
  assert.equal(
    [...markdown.matchAll(/^#\s+.+$/gmu)].length,
    1,
    page.markdownFile,
  );
  assert.doesNotMatch(markdown, /<(?:script|style|svg|canvas)\b/iu);
  assert.match(
    html,
    new RegExp(
      `<link rel="alternate" type="text/markdown" href="${escapeRegExp(markdownUrl)}">`,
    ),
    page.htmlFile,
  );
}

const home = readFileSync(resolve(dist, "index.md"), "utf8");
assert.match(home, /^# Swipe$/mu);
assert.match(home, /^## What Swipe publishes$/mu);
assert.match(home, /Swipe issue archive/u);
assert.doesNotMatch(home, /background cards|while you slept|late invoice/iu);

const issuePage = manifest.pages.find(
  (page) => page.htmlPath === "/issues/the-only-seo-skill-your-agent-needs",
);
assert.ok(issuePage, "Published issue is missing from agent-routes.json");
assert.match(
  readFileSync(resolve(dist, issuePage.markdownFile), "utf8"),
  /The only SEO skill your agent needs/u,
);
assert.doesNotMatch(
  readFileSync(resolve(dist, issuePage.markdownFile), "utf8"),
  /Swipe the best AI skills|you're in - check your inbox/iu,
);

const toolPage = manifest.pages.find(
  (page) => page.htmlPath === "/tools/here-now",
);
assert.ok(toolPage, "Published tool is missing from agent-routes.json");
assert.match(
  readFileSync(resolve(dist, toolPage.markdownFile), "utf8"),
  /Here\.now: Free instant web hosting for AI agents/u,
);

const headers = readFileSync(headersPath, "utf8");
assert.match(headers, /^\/index\.md$/mu);
assert.match(
  headers,
  /^\/issues\/the-only-seo-skill-your-agent-needs\.md$/mu,
);
assert.match(headers, /^\s+Content-Type: text\/markdown; charset=utf-8$/mu);
assert.match(headers, /^\s+Vary: Accept$/mu);

const llms = readFileSync(llmsPath, "utf8");
assert.match(llms, /^# Swipe$/mu);
assert.match(llms, /https:\/\/swipe\.md\/index\.md/u);
assert.match(llms, /https:\/\/swipe\.md\/issues\.md/u);

const sitemap = readFileSync(resolve(dist, "sitemap.xml"), "utf8");
assert.doesNotMatch(sitemap, /\.md</u);
assert.match(sitemap, /https:\/\/swipe\.md\/tools\/here-now/u);

const toolSearch = JSON.parse(readFileSync(toolSearchPath, "utf8"));
assert.ok(Array.isArray(toolSearch), "Tool search index is not an array");
assert.ok(
  toolSearch.some(
    (tool) =>
      tool.slug === "here-now" &&
      tool.name === "Here.now" &&
      !("icon" in tool),
  ),
  "Here.now is missing from the tool search index",
);

console.log(`Verified ${manifest.pages.length} agent Markdown routes.`);

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
