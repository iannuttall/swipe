#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  renameSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { cancel, isCancel, select } from "@clack/prompts";

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, "../../..");
const newsletterDir = resolve(root, "apps/newsletter");
const newsletterEnv = resolve(newsletterDir, ".env.local");
const newsletterCli = resolve(newsletterDir, "packages/cli/dist/index.js");

function help() {
  return `swipe

Usage:
  pnpm swipe <command>
  pnpm swipe check [target]
  pnpm swipe build [target]

Newsletter:
  pnpm swipe newsletter doctor
  pnpm swipe newsletter signups [--days 7] [--limit N]
  pnpm swipe newsletter unsubscribe EMAIL [--broadcast-id ID] [--source SOURCE]
  pnpm swipe newsletter checklist
  pnpm swipe newsletter migrate
  pnpm swipe newsletter seed-aliases --email you@gmail.com [--count 20]
  pnpm swipe newsletter seed-intelligence --email you@gmail.com [--count 20]
  pnpm swipe newsletter render --subject "Subject" --body-file apps/newsletter/draft.md
  pnpm swipe newsletter draft --subject "Subject" --body-file apps/newsletter/draft.md
  pnpm swipe newsletter test-send --draft-id ID --to you@example.com
  pnpm swipe newsletter api [--port 3000]
  pnpm swipe newsletter web
  pnpm swipe newsletter worker
  pnpm swipe newsletter email-preview
  pnpm swipe newsletter cli -- <raw email cli args>

Issues (apps/site/src/content/issues -> Swipe newsletter):
  pnpm swipe issue preview [slug] [--status cold]  render the email HTML locally
  pnpm swipe issue check [slug] [--mail-tester-report PATH]
                                               run the local deliverability gate
  pnpm swipe issue test [slug] [--to email] [--status cold]
                                               publish + tracked test send to you only
  pnpm swipe issue approve [slug] --yes      browser-QA the exact tracked test
  pnpm swipe issue send [slug] --yes         broadcast the approved immutable draft
  (omit the slug to pick from a list)

Radar (agent research helpers):
  pnpm swipe radar run [weekly|ians-list-launch|catalog-backfill]
  pnpm swipe radar github [--days 120] [--limit 60] [--json] [--output PATH]
  pnpm swipe radar hackernews [--days 7] [--limit 100] [--output-dir PATH]
  pnpm swipe radar catalog [--json] [--stale-days 180] [--as-of YYYY-MM-DD]

Site:
  pnpm swipe site dev
  pnpm swipe site build
  pnpm swipe site check

Targets:
  site
  newsletter
  newsletter-api
  newsletter-cli
  newsletter-core
  newsletter-mcp
  newsletter-web

Notes:
  Newsletter commands load apps/newsletter/.env.local when it exists.
  Issue test sends require --to or SWIPE_TEST_EMAIL in root .env.local.
  The wrapper builds @email/cli automatically if dist/index.js is missing.
`;
}

function localEnv(name) {
  if (process.env[name]) return process.env[name];
  const envPath = resolve(root, ".env.local");
  if (!existsSync(envPath)) return undefined;
  const match = readFileSync(envPath, "utf8").match(
    new RegExp(`^${name}=(.*)$`, "m"),
  );
  return match?.[1]?.trim();
}

function run(command, commandArgs, options = {}) {
  const result = spawnSync(command, commandArgs, {
    cwd: options.cwd ?? root,
    env: { ...process.env, ...(options.env ?? {}) },
    stdio: "inherit",
  });

  if (result.error) {
    console.error(result.error.message);
    process.exit(1);
  }

  process.exit(result.status ?? 0);
}

function pnpm(commandArgs, options = {}) {
  run("pnpm", commandArgs, options);
}

function buildNewsletterCliIfMissing() {
  if (existsSync(newsletterCli)) return;

  const result = spawnSync("pnpm", ["--filter", "@email/cli", "build"], {
    cwd: root,
    stdio: "inherit",
  });

  if (result.error) {
    console.error(result.error.message);
    process.exit(1);
  }
  if (result.status !== 0) process.exit(result.status ?? 1);
}

function newsletterNodeArgs() {
  return existsSync(newsletterEnv) ? [`--env-file=${newsletterEnv}`] : [];
}

function emailCli(cliArgs, options = {}) {
  buildNewsletterCliIfMissing();
  run("node", [...newsletterNodeArgs(), newsletterCli, ...cliArgs], options);
}

function getOption(argv, name, fallback) {
  const index = argv.indexOf(name);
  if (index === -1) return fallback;
  return argv[index + 1] ?? fallback;
}

function withDefaultOption(argv, name, value) {
  return argv.includes(name) ? argv : [name, value, ...argv];
}

function appendJson(argv) {
  return argv.includes("--json") ? argv : [...argv, "--json"];
}

function newsletter(argv) {
  const [command, ...rest] = argv;

  if (!command || command === "help") {
    console.log(help());
    return;
  }

  if (command === "cli") {
    emailCli(rest[0] === "--" ? rest.slice(1) : rest);
    return;
  }

  if (command === "email-preview") {
    pnpm(["newsletter:email:preview"]);
    return;
  }

  if (command === "web") {
    pnpm(["--filter", "@email/web", "dev"], {
      env: {
        EMAIL_API_INTERNAL_URL: process.env.EMAIL_API_INTERNAL_URL ?? "http://127.0.0.1:3000",
      },
    });
    return;
  }

  if (command === "api") {
    emailCli(["api", "serve", ...rest]);
    return;
  }

  if (command === "worker") {
    emailCli(["worker", "send", "--yes", "--batch-size", "100", "--interval-ms", "10000", ...rest]);
    return;
  }

  const templateArgs = withDefaultOption(rest, "--template", getOption(rest, "--template", "default"));
  const renderArgs = withDefaultOption(templateArgs, "--out-dir", getOption(rest, "--out-dir", "apps/newsletter/rendered"));

  if (command === "signups") {
    const days = getOption(rest, "--days", "7");
    const limit = getOption(rest, "--limit", "50");
    if (!/^\d{1,3}$/.test(days) || !/^\d{1,5}$/.test(limit)) {
      console.error("signups: --days and --limit must be plain numbers");
      process.exit(2);
    }
    const sshTarget = localEnv("SWIPE_NEWSLETTER_SSH");
    const opsPrefix = localEnv("SWIPE_NEWSLETTER_OPS");
    if (!sshTarget || !opsPrefix) {
      console.error(
        "signups needs SWIPE_NEWSLETTER_SSH and SWIPE_NEWSLETTER_OPS (shell env or root .env.local).",
      );
      process.exit(1);
    }
    run("ssh", [
      "-o",
      "RemoteCommand=none",
      "-o",
      "RequestTTY=no",
      sshTarget,
      `${opsPrefix} contact recent --days ${days} --limit ${limit}`,
    ]);
    return;
  }

  if (command === "unsubscribe") {
    const email = rest[0];
    const broadcastId = getOption(rest, "--broadcast-id");
    const source = getOption(rest, "--source", "manual");
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      console.error("unsubscribe needs a valid email address");
      process.exit(2);
    }
    if (broadcastId && !/^[0-9a-f-]{36}$/i.test(broadcastId)) {
      console.error("unsubscribe: --broadcast-id must be a UUID");
      process.exit(2);
    }
    if (!/^[a-z0-9._-]+$/i.test(source)) {
      console.error("unsubscribe: --source contains invalid characters");
      process.exit(2);
    }
    const sshTarget = localEnv("SWIPE_NEWSLETTER_SSH");
    const opsPrefix = localEnv("SWIPE_NEWSLETTER_OPS");
    if (!sshTarget || !opsPrefix) {
      console.error(
        "unsubscribe needs SWIPE_NEWSLETTER_SSH and SWIPE_NEWSLETTER_OPS (shell env or root .env.local).",
      );
      process.exit(1);
    }
    const cliArgs = [
      "contact",
      "unsubscribe",
      email,
      "--source",
      source,
      ...(broadcastId ? ["--broadcast-id", broadcastId] : []),
      "--json",
    ];
    run("ssh", [
      "-o",
      "RemoteCommand=none",
      "-o",
      "RequestTTY=no",
      sshTarget,
      `${opsPrefix} ${cliArgs.map(shellQuote).join(" ")}`,
    ]);
    return;
  }

  const aliases = {
    doctor: ["doctor"],
    checklist: ["ops", "checklist"],
    migrate: ["db", "migrate"],
    queue: ["ops", "queue", ...rest],
    "seed-aliases": ["contact", "seed-aliases", ...rest],
    "seed-intelligence": ["contact", "seed-intelligence", ...rest],
    render: ["template", "render", ...renderArgs],
    draft: ["draft", "create", ...templateArgs],
    "test-send": ["broadcast", "test", "--yes", ...rest],
  };

  if (aliases[command]) {
    emailCli(appendJson(aliases[command]));
    return;
  }

  console.error(`Unknown newsletter command: ${command}\n`);
  console.error(help());
  process.exit(2);
}

// ---------- issues: the Astro collection is the source of sent emails ----------

const issuesDir = resolve(root, "apps/site/src/content/issues");
const deployStatusUrl = "https://swipe.md/.well-known/deploy.json";
const issueQaDir = resolve(root, ".swipe/issue-qa");

function fail(message) {
  console.error(message);
  process.exit(1);
}

// Like run(), but returns instead of exiting so flows can take multiple steps.
function stepRun(command, commandArgs, options = {}) {
  const result = spawnSync(command, commandArgs, {
    cwd: options.cwd ?? root,
    env: { ...process.env, ...(options.env ?? {}) },
    stdio: "inherit",
  });
  if (result.error) fail(result.error.message);
  if (result.status !== 0) fail(`${command} ${commandArgs.join(" ")} failed.`);
}

function stepCapture(command, commandArgs, options = {}) {
  const result = spawnSync(command, commandArgs, {
    cwd: options.cwd ?? root,
    env: { ...process.env, ...(options.env ?? {}) },
    encoding: "utf8",
    stdio: ["ignore", "pipe", "inherit"],
  });
  if (result.error) fail(result.error.message);
  if (result.status !== 0) fail(`${command} ${commandArgs.join(" ")} failed.`);
  return result.stdout ?? "";
}

function issuePath(slug) {
  const path = resolve(issuesDir, `${slug}.md`);
  if (!existsSync(path)) fail(`No issue at apps/site/src/content/issues/${slug}.md`);
  return path;
}

async function pickIssueSlug() {
  const entries = readdirSync(issuesDir)
    .filter((file) => file.endsWith(".md"))
    .map((file) => {
      const slug = file.replace(/\.md$/, "");
      const parsed = parseIssueFile(resolve(issuesDir, file));
      const status = parsed.frontmatter.broadcastId
        ? "sent"
        : parsed.frontmatter.draft === "true"
          ? "draft"
          : "ready";
      return { slug, subject: parsed.frontmatter.subject ?? slug, status, pubDate: parsed.frontmatter.pubDate ?? "" };
    })
    .sort((a, b) => b.pubDate.localeCompare(a.pubDate));

  if (entries.length === 0) fail("No issues in apps/site/src/content/issues.");
  if (entries.length === 1) return entries[0].slug;

  const choice = await select({
    message: "Which issue?",
    options: entries.map((entry) => ({
      value: entry.slug,
      label: entry.subject,
      hint: `${entry.slug} · ${entry.status}`,
    })),
  });
  if (isCancel(choice)) {
    cancel("Cancelled.");
    process.exit(0);
  }
  return choice;
}

function parseIssueFile(path) {
  const source = readFileSync(path, "utf8");
  const match = source.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!match) fail(`${path} has no frontmatter block.`);
  const frontmatter = {};
  for (const line of match[1].split(/\r?\n/)) {
    const kv = line.match(/^([A-Za-z][\w-]*):\s*(.*)$/);
    if (kv) frontmatter[kv[1]] = kv[2].replace(/^["']|["']$/g, "").trim();
  }
  return { source, rawFrontmatter: match[1], frontmatter, body: match[2] };
}

function writeIssueFrontmatter(path, issue, updates) {
  let raw = issue.rawFrontmatter;
  for (const [key, value] of Object.entries(updates)) {
    const line = `${key}: ${value}`;
    if (new RegExp(`^${key}:`, "m").test(raw)) {
      raw = raw.replace(new RegExp(`^${key}:.*$`, "m"), line);
    } else {
      raw = `${raw}\n${line}`;
    }
  }
  writeFileSync(path, `---\n${raw}\n---\n${issue.body}`);
}

function shellQuote(value) {
  return `'${value.replace(/'/g, `'\\''`)}'`;
}

function issueFingerprint(issue, slug) {
  return createHash("sha256")
    .update(JSON.stringify({
      name: slug,
      subject: issue.frontmatter.subject,
      preview: issue.frontmatter.preheader ?? null,
      bodyMarkdown: issue.body.trim(),
      template: "default",
      fromEmail: null,
      fromName: null,
      replyTo: null,
    }))
    .digest("hex");
}

function issueQaPath(slug) {
  return resolve(issueQaDir, `${slug}.json`);
}

function saveIssueQaState(slug, state) {
  mkdirSync(issueQaDir, { recursive: true });
  writeFileSync(issueQaPath(slug), `${JSON.stringify(state, null, 2)}\n`, { mode: 0o600 });
}

function loadIssueQaState(slug) {
  const statePath = issueQaPath(slug);
  if (!existsSync(statePath)) fail(`No tracked test exists for ${slug}. Run pnpm swipe issue test ${slug} first.`);
  return JSON.parse(readFileSync(statePath, "utf8"));
}

function assertTrackingRoutingConfigured() {
  const config = readFileSync(resolve(root, "apps/site/wrangler.jsonc"), "utf8");
  for (const route of ["/t/click/*", "/t/open/*", "/unsubscribe/*", "/api/*"]) {
    if (!config.includes(`"${route}"`)) fail(`Cloudflare Worker-first routing is missing ${route}.`);
  }
  if (/"run_worker_first"\s*:\s*true/.test(config)) {
    fail("Cloudflare routing must stay selective; run_worker_first=true is forbidden.");
  }
}

function sshEnv() {
  const target = localEnv("SWIPE_NEWSLETTER_SSH");
  const ops = localEnv("SWIPE_NEWSLETTER_OPS");
  if (!target || !ops) {
    fail("issue commands need SWIPE_NEWSLETTER_SSH and SWIPE_NEWSLETTER_OPS (shell env or root .env.local).");
  }
  return { target, ops };
}

function sshCapture(target, remoteCommand) {
  return stepCapture("ssh", [
    "-o",
    "RemoteCommand=none",
    "-o",
    "RequestTTY=no",
    target,
    remoteCommand,
  ]);
}

function parseJsonOutput(output, label) {
  const trimmed = output.trim();
  let parsed;
  try {
    parsed = JSON.parse(trimmed);
  } catch {
    for (const line of trimmed.split("\n")) {
      const candidate = line.trim();
      if (!candidate.startsWith("{")) continue;
      try {
        parsed = JSON.parse(candidate);
        break;
      } catch {
        // keep scanning
      }
    }
  }
  if (parsed === undefined) fail(`Could not parse JSON from ${label} output:\n${output}`);
  if (parsed.ok === false) fail(`${label} failed: ${parsed.error ?? JSON.stringify(parsed)}`);
  return parsed;
}

function remoteDraftCreate(ssh, issue, slug) {
  const args = [
    "draft create",
    `--subject ${shellQuote(issue.frontmatter.subject)}`,
    `--name ${shellQuote(slug)}`,
    `--issue-slug ${shellQuote(slug)}`,
    issue.frontmatter.preheader ? `--preview ${shellQuote(issue.frontmatter.preheader)}` : "",
    `--body ${shellQuote(issue.body.trim())}`,
    "--json",
  ]
    .filter(Boolean)
    .join(" ");
  const output = sshCapture(ssh.target, `${ssh.ops} ${args}`);
  const parsed = parseJsonOutput(output, "draft create");
  const draftId = parsed.id ?? parsed.draft?.id ?? parsed.data?.id;
  if (!draftId) fail(`draft create returned no id:\n${output}`);
  const fingerprint = parsed.fingerprint ?? parsed.draft?.fingerprint ?? parsed.data?.fingerprint;
  if (!fingerprint) fail(`draft create returned no fingerprint:\n${output}`);
  console.log(`Created immutable prod draft ${draftId}.`);
  return { draftId, fingerprint };
}

async function waitForDeploy(sha, timeoutMs = 10 * 60 * 1000) {
  const startedAt = Date.now();
  process.stdout.write(`Waiting for ${sha.slice(0, 8)} at ${deployStatusUrl} `);
  while (Date.now() - startedAt < timeoutMs) {
    try {
      const response = await fetch(deployStatusUrl, { cache: "no-store" });
      if (response.ok) {
        const marker = await response.json();
        if (marker.gitSha === sha || marker.deployId === sha) {
          console.log("\nSite deploy is live.");
          return;
        }
      }
    } catch {
      // transient network noise; keep polling
    }
    process.stdout.write(".");
    await new Promise((resolveSleep) => setTimeout(resolveSleep, 15000));
  }
  fail(`\nTimed out waiting for ${sha} to go live. Check the Cloudflare build, then re-run; the broadcast has NOT been created.`);
}

function assertMainBranch() {
  const branch = stepCapture("git", ["rev-parse", "--abbrev-ref", "HEAD"]).trim();
  if (branch !== "main") fail(`Issue publishing runs from main; you are on ${branch}.`);
}

async function publishIssueArchive(path, parsed, slug) {
  assertMainBranch();
  if (parsed.frontmatter.draft === "true") {
    writeIssueFrontmatter(path, parsed, { draft: "false" });
  }
  const published = parseIssueFile(path);
  const dirty = stepCapture("git", ["status", "--porcelain", "--", path]).trim();
  if (dirty) {
    stepRun("git", ["add", path]);
    stepRun("git", ["commit", "-m", `content(issues): publish ${slug}`]);
  }
  stepRun("git", ["push", "origin", "main"]);
  const sha = stepCapture("git", ["rev-parse", "HEAD"]).trim();
  await waitForDeploy(sha);
  return published;
}

const browserNavigationHeaders = {
  Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  "Sec-Fetch-Dest": "document",
  "Sec-Fetch-Mode": "navigate",
  "Sec-Fetch-Site": "none",
  "Upgrade-Insecure-Requests": "1",
  "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/150 Safari/537.36",
};

async function requireOk(url, label) {
  const response = await fetch(url, {
    cache: "no-store",
    redirect: "follow",
    headers: browserNavigationHeaders,
  });
  if (!response.ok) fail(`${label} failed with HTTP ${response.status}: ${url}`);
}

async function checkTrackingRedirect(link) {
  const response = await fetch(link.trackingUrl, {
    cache: "no-store",
    redirect: "manual",
    headers: browserNavigationHeaders,
  });
  if (![301, 302, 303, 307, 308].includes(response.status)) {
    fail(`Tracked browser request returned HTTP ${response.status}, not a redirect: ${link.trackingUrl}`);
  }
  const location = response.headers.get("location");
  if (!location || new URL(location, link.trackingUrl).href !== new URL(link.originalUrl).href) {
    fail(`Tracked link expected ${link.originalUrl}, got ${location ?? "no Location header"}.`);
  }
}

function agentBrowserJson(args, label) {
  const output = stepCapture("agent-browser", ["--json", ...args]);
  let parsed;
  try {
    parsed = JSON.parse(output);
  } catch {
    fail(`${label} returned invalid JSON:\n${output}`);
  }
  if (!parsed.success || parsed.error) fail(`${label} failed: ${parsed.error ?? output}`);
  return parsed.data;
}

async function runIssueBrowserQa(slug, state) {
  if (!Array.isArray(state.trackingLinks) || state.trackingLinks.length === 0) {
    fail("Tracked test returned no click-tracking links; QA cannot pass.");
  }
  const canonicalUrl = `https://swipe.md/issues/${encodeURIComponent(slug)}`;
  await requireOk(canonicalUrl, "Issue archive");
  await requireOk(`${canonicalUrl}.md`, "Issue Markdown");
  for (const link of state.trackingLinks) await checkTrackingRedirect(link);

  const session = `swipe-issue-qa-${slug.replace(/[^a-z0-9-]/gi, "-")}-${process.pid}`;
  try {
    for (const [index, link] of state.trackingLinks.entries()) {
      const data = agentBrowserJson(
        ["--session", session, "open", link.trackingUrl],
        `Browser link ${index + 1}`,
      );
      const finalUrl = data.url;
      if (!finalUrl || finalUrl.includes("/t/click/") || finalUrl.startsWith("chrome-error://")) {
        fail(`Browser did not reach a real destination for tracked link ${index + 1}: ${finalUrl ?? "no URL"}`);
      }
      const network = agentBrowserJson(
        ["--session", session, "network", "requests"],
        `Browser network check ${index + 1}`,
      );
      const documents = (network.requests ?? []).filter((request) => request.resourceType === "Document");
      const failedDocument = documents.find((request) => request.status >= 400);
      if (failedDocument) fail(`Browser received HTTP ${failedDocument.status} for ${failedDocument.url}`);
      process.stdout.write(`  browser ${index + 1}/${state.trackingLinks.length}\r`);
    }
  } finally {
    spawnSync("agent-browser", ["--session", session, "close"], { cwd: root, stdio: "ignore" });
  }
  console.log(`  browser ${state.trackingLinks.length}/${state.trackingLinks.length} passed`);
  return { checkedAt: new Date().toISOString(), checkedLinks: state.trackingLinks.length };
}

function runIssuePreflight(issue, slug, argv) {
  const status = getOption(argv, "--status", "cold");
  if (!["new", "warm", "cold"].includes(status)) {
    fail("issue check --status must be new, warm, or cold.");
  }
  const dir = mkdtempSync(join(tmpdir(), "swipe-preflight-"));
  const bodyFile = join(dir, `${slug}.md`);
  writeFileSync(bodyFile, issue.body);
  buildNewsletterCliIfMissing();
  const mailTesterReport = getOption(argv, "--mail-tester-report");
  const spamAssassinCommand =
    getOption(argv, "--spamassassin-command") ??
    resolve(newsletterDir, "scripts/run-spamassassin.sh");
  const localFromEmail = localEnv("EMAIL_FROM_EMAIL");
  const localFromName = localEnv("EMAIL_FROM_NAME");
  const senderArgs = localFromEmail
    ? [
        "--from-email",
        localFromEmail,
        ...(localFromName ? ["--from-name", localFromName] : []),
      ]
    : existsSync(newsletterEnv)
      ? []
      : ["--from-email", "ian@swipe.md", "--from-name", "Ian at Swipe"];
  const commandArgs = [
    ...newsletterNodeArgs(),
    newsletterCli,
    "template",
    "preflight",
    "--subject",
    issue.frontmatter.subject,
    ...(issue.frontmatter.preheader
      ? ["--preview", issue.frontmatter.preheader]
      : []),
    "--name",
    slug,
    "--body-file",
    bodyFile,
    "--status",
    status,
    "--base-url",
    "https://swipe.md",
    ...senderArgs,
    "--spamassassin-command",
    spamAssassinCommand,
    ...(mailTesterReport
      ? ["--mail-tester-report", resolve(root, mailTesterReport)]
      : []),
    "--json",
  ];
  const result = spawnSync("node", commandArgs, {
    cwd: root,
    env: {
      ...process.env,
      SWIPE_EMAIL_ASSET_BASE_URL: "https://swipe.md",
    },
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
  if (result.error) fail(`Pre-send checker could not start: ${result.error.message}`);
  const output = result.stdout ?? "";
  if (result.status !== 0) {
    let error;
    try {
      error = JSON.parse(output).error;
    } catch {
      error = undefined;
    }
    fail(`Pre-send checker could not run: ${error ?? result.stderr?.trim() ?? "unknown error"}`);
  }
  const parsed = parseJsonOutput(output, "issue pre-send check");
  const report = parsed.data ?? parsed;
  if (!report.counts || !Array.isArray(report.checks)) {
    fail(`Pre-send checker returned an invalid report:\n${output}`);
  }

  const spam = report.spamAssassin
    ? ` · SpamAssassin ${report.spamAssassin.score.toFixed(1)}/${report.spamAssassin.requiredScore.toFixed(1)}`
    : "";
  console.log(
    `Pre-send: ${report.ready ? "PASS" : "FAIL"} · ${report.counts.pass} passed · ${report.counts.warn} warnings · ${report.counts.fail} failed${spam}`,
  );
  for (const check of report.checks.filter((item) => item.status !== "pass")) {
    console.log(`  ${check.status.toUpperCase()}: ${check.title} — ${check.detail}`);
  }
  if (!report.ready) fail("Pre-send checks failed. Nothing was sent.");
  return report;
}

async function issue(argv) {
  const [command, ...restArgs] = argv;

  if (!command || command === "help") {
    console.log(help());
    return;
  }

  // Slug is optional: `swipe issue test` opens a picker over the collection.
  const slugArg = restArgs[0] && !restArgs[0].startsWith("-") ? restArgs[0] : undefined;
  const rest = slugArg ? restArgs.slice(1) : restArgs;
  const slug = slugArg ?? (await pickIssueSlug());

  const path = issuePath(slug);
  const parsed = parseIssueFile(path);
  if (!parsed.frontmatter.subject) fail(`${slug} has no subject in frontmatter.`);

  if (command === "preview") {
    const status = getOption(rest, "--status", "cold");
    const dir = mkdtempSync(join(tmpdir(), "swipe-issue-"));
    const bodyFile = join(dir, `${slug}.md`);
    writeFileSync(bodyFile, parsed.body);
    // Mirrors issueReadingMinutes in apps/site/src/lib/issues.ts (220 wpm,
    // issue component and legacy fence lines excluded).
    const words = parsed.body
      .split(/\r?\n/)
      .filter((line) => !/^(:::|<\/?[A-Z][A-Za-z0-9]*\b)/.test(line.trim()))
      .join(" ")
      .split(/\s+/)
      .filter(Boolean).length;
    console.log(`~${Math.max(1, Math.ceil(words / 220))} min read (${words} words)`);
    console.log(`Web preview: pnpm swipe site dev -> http://localhost:4321/issues/${slug}`);
    emailCli(
      [
        "template",
        "render",
        "--subject",
        parsed.frontmatter.subject,
        ...(parsed.frontmatter.preheader
          ? ["--preview", parsed.frontmatter.preheader]
          : []),
        "--name",
        slug,
        "--body-file",
        bodyFile,
        "--status",
        status,
        "--out-dir",
        "apps/newsletter/rendered",
        "--json",
      ],
      {
        env: {
          SWIPE_EMAIL_ASSET_BASE_URL: "http://localhost:4321",
        },
      },
    );
    return;
  }

  if (command === "check") {
    runIssuePreflight(parsed, slug, rest);
    console.log("Nothing was sent.");
    return;
  }

  if (command === "test") {
    assertTrackingRoutingConfigured();
    if (parsed.frontmatter.broadcastId) {
      fail(`${slug} already has broadcastId ${parsed.frontmatter.broadcastId}; refusing to create a new issue test.`);
    }
    const ssh = sshEnv();
    const to = getOption(rest, "--to") ?? localEnv("SWIPE_TEST_EMAIL");
    if (!to) fail("issue test needs --to or SWIPE_TEST_EMAIL in root .env.local.");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) fail("issue test needs a valid email address.");
    const status = getOption(rest, "--status", "cold");
    const published = await publishIssueArchive(path, parsed, slug);
    const localFingerprint = issueFingerprint(published, slug);
    const { draftId, fingerprint } = remoteDraftCreate(ssh, published, slug);
    if (fingerprint !== localFingerprint) fail("Local issue and production draft fingerprints differ; test blocked.");
    const output = sshCapture(
      ssh.target,
      `${ssh.ops} broadcast test --yes --draft-id ${shellQuote(draftId)} --to ${shellQuote(to)} --status ${shellQuote(status)} --json`,
    );
    const test = parseJsonOutput(output, "broadcast test");
    if (test.draftFingerprint !== fingerprint) fail("Tracked test used a different draft fingerprint.");
    if (!test.messageId || !Array.isArray(test.trackingLinks) || test.trackingLinks.length === 0) {
      fail(`Tracked test returned incomplete QA evidence:\n${output}`);
    }
    const canonicalUrl = `https://swipe.md/issues/${encodeURIComponent(slug)}`;
    await requireOk(canonicalUrl, "Issue archive");
    await requireOk(`${canonicalUrl}.md`, "Issue Markdown");
    for (const link of test.trackingLinks) await checkTrackingRedirect(link);
    saveIssueQaState(slug, {
      slug,
      draftId,
      fingerprint,
      messageId: test.messageId,
      broadcastId: test.broadcastId,
      providerMessageId: test.providerMessageId,
      testedTo: to,
      testedAt: new Date().toISOString(),
      trackingLinks: test.trackingLinks,
    });
    console.log(`Tracked test sent to ${to}; ${test.trackingLinks.length} browser-shaped redirects passed.`);
    console.log(`Inspect the email, then approve it with: pnpm swipe issue approve ${slug} --yes`);
    return;
  }

  if (command === "approve") {
    assertTrackingRoutingConfigured();
    if (!rest.includes("--yes")) fail("Inspect the received test, then re-run issue approve with --yes.");
    if (parsed.frontmatter.broadcastId) fail(`${slug} has already been sent.`);
    const state = loadIssueQaState(slug);
    const localFingerprint = issueFingerprint(parsed, slug);
    if (state.fingerprint !== localFingerprint) {
      fail(`${slug} changed after the tracked test. Run pnpm swipe issue test ${slug} again.`);
    }
    console.log(`Running real-browser QA for ${state.trackingLinks.length} tracked links...`);
    const browserQa = await runIssueBrowserQa(slug, state);
    const ssh = sshEnv();
    const output = sshCapture(
      ssh.target,
      `${ssh.ops} draft qa-approve --yes --draft-id ${shellQuote(state.draftId)} --test-message-id ${shellQuote(state.messageId)} --checked-at ${shellQuote(browserQa.checkedAt)} --browser-checked-links ${browserQa.checkedLinks} --archive-html-ok --archive-markdown-ok --json`,
    );
    const receipt = parseJsonOutput(output, "draft qa-approve");
    if (receipt.fingerprint !== localFingerprint) fail("Production QA receipt fingerprint mismatch.");
    writeIssueFrontmatter(path, parsed, {
      qaDraftId: `"${state.draftId}"`,
      qaFingerprint: `"${receipt.fingerprint}"`,
      qaApprovedAt: receipt.checkedAt,
    });
    stepRun("git", ["add", path]);
    stepRun("git", ["commit", "-m", `content(issues): approve ${slug} for send`]);
    stepRun("git", ["push", "origin", "main"]);
    console.log(`${slug} is approved. The send command is now unlocked for this exact draft.`);
    return;
  }

  if (command === "send") {
    assertTrackingRoutingConfigured();
    if (parsed.frontmatter.broadcastId) {
      fail(`${slug} already has broadcastId ${parsed.frontmatter.broadcastId}; refusing to double-send.`);
    }
    if (!parsed.frontmatter.qaDraftId || !parsed.frontmatter.qaFingerprint || !parsed.frontmatter.qaApprovedAt) {
      fail(`${slug} has no approved tracked-test receipt. Run issue test, inspect it, then issue approve.`);
    }
    if (issueFingerprint(parsed, slug) !== parsed.frontmatter.qaFingerprint) {
      fail(`${slug} changed after approval. Run a new tracked test and browser QA.`);
    }
    runIssuePreflight(parsed, slug, rest);
    if (!rest.includes("--yes")) {
      console.log(`Nothing was sent. Re-run pnpm swipe issue send ${slug} --yes to broadcast.`);
      return;
    }
    const ssh = sshEnv();
    const composeSuffix = " run --rm -T ops node dist/index.js";
    const composeBase =
      localEnv("SWIPE_NEWSLETTER_COMPOSE") ??
      (ssh.ops.endsWith(composeSuffix)
        ? ssh.ops.slice(0, -composeSuffix.length)
        : undefined);
    if (!composeBase) {
      fail("Cannot derive the compose command for the sender worker; set SWIPE_NEWSLETTER_COMPOSE.");
    }

    assertMainBranch();

    const otherChanges = stepCapture("git", ["status", "--porcelain"])
      .split("\n")
      .filter((line) => line.trim() && !line.includes(`src/content/issues/${slug}.md`));
    if (otherChanges.length > 0) {
      console.log("Note: other uncommitted changes exist; only the issue file will be committed:");
      for (const line of otherChanges) console.log(`  ${line}`);
    }

    const published = await publishIssueArchive(path, parsed, slug);
    const qaOutput = sshCapture(
      ssh.target,
      `${ssh.ops} draft qa-status --draft-id ${shellQuote(published.frontmatter.qaDraftId)} --json`,
    );
    const qa = parseJsonOutput(qaOutput, "draft qa-status");
    if (qa.status !== "ready" || qa.fingerprint !== published.frontmatter.qaFingerprint || !qa.receipt) {
      fail("Production draft QA receipt is missing, stale, or does not match this issue.");
    }
    await requireOk(qa.receipt.canonicalUrl, "Issue archive");
    await requireOk(`${qa.receipt.canonicalUrl}.md`, "Issue Markdown");
    const draftId = published.frontmatter.qaDraftId;
    const output = sshCapture(
      ssh.target,
      `${ssh.ops} broadcast create --draft-id ${shellQuote(draftId)} --name ${shellQuote(slug)} --json`,
    );
    const broadcast = parseJsonOutput(output, "broadcast create");
    const broadcastId = broadcast.id ?? broadcast.broadcast?.id ?? broadcast.data?.id;
    if (!broadcastId) fail(`broadcast create returned no id:\n${output}`);
    console.log(`Created broadcast ${broadcastId}.`);

    console.log("Starting the sender worker...");
    sshCapture(ssh.target, `${composeBase} --profile sender up -d worker`);

    writeIssueFrontmatter(path, published, {
      sentAt: new Date().toISOString(),
      broadcastId: `"${broadcastId}"`,
    });
    stepRun("git", ["add", path]);
    stepRun("git", ["commit", "-m", `content(issues): mark ${slug} sent`]);
    stepRun("git", ["push", "origin", "main"]);

    console.log(`\nSent. Archive: https://swipe.md/issues/${slug}`);
    console.log(`Monitor: pnpm swipe newsletter cli -- broadcast stats ${broadcastId} --json (or via ssh ops).`);
    return;
  }

  console.error(`Unknown issue command: ${command}\n`);
  console.error(help());
  process.exit(2);
}

function site(argv) {
  const [command] = argv;
  const aliases = {
    dev: ["dev"],
    "dev:cf": ["dev:cf"],
    build: ["build"],
    check: ["-C", "apps/site", "check"],
    "generate-types": ["generate-types"],
  };

  if (!command || command === "help") {
    console.log(help());
    return;
  }

  if (!aliases[command]) {
    console.error(`Unknown site command: ${command}\n`);
    console.error(help());
    process.exit(2);
  }

  pnpm(aliases[command]);
}

function radar(argv) {
  const [command, ...rest] = argv;

  if (!command || command === "help") {
    console.log(help());
    return;
  }

  if (command === "github") {
    const localCli = resolve(root, "../../cli/gh-research/dist/cli.js");
    if (existsSync(localCli)) {
      run("node", [localCli, "skills", ...rest]);
      return;
    }
    run("pnpm", ["dlx", "gh-research", "skills", ...rest]);
    return;
  }

  if (command === "hackernews") {
    const days = getOption(rest, "--days", "7");
    const limit = getOption(rest, "--limit", "100");
    if (!/^\d{1,2}$/.test(days) || Number(days) < 1 || Number(days) > 30) {
      fail("radar hackernews: --days must be between 1 and 30.");
    }
    if (!/^\d{1,3}$/.test(limit) || Number(limit) < 1 || Number(limit) > 100) {
      fail("radar hackernews: --limit must be between 1 and 100.");
    }

    const localDate = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Europe/London",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date());
    const outputDir = resolve(
      root,
      getOption(rest, "--output-dir", `notes/radar/${localDate}`),
    );
    mkdirSync(outputDir, { recursive: true });

    const collect = (stream, sort, extra = []) => {
      const output = stepCapture("pnpm", [
        "dlx",
        "hn-get",
        "search",
        "--since",
        `${days}d`,
        "--sort",
        sort,
        "--type",
        "story",
        "--limit",
        limit,
        ...extra,
      ]);
      const parsed = parseJsonOutput(output, `hn-get ${stream}`);
      const path = resolve(outputDir, `hackernews-${stream}.json`);
      writeFileSync(
        path,
        `${JSON.stringify(
          {
            stream,
            collectedAt: new Date().toISOString(),
            windowDays: Number(days),
            ...parsed,
          },
          null,
          2,
        )}\n`,
      );
      return path;
    };

    const popularPath = collect("popular", "points");
    const newPath = collect("new", "date", ["--points", "2"]);
    console.log(`Popular: ${popularPath}`);
    console.log(`New: ${newPath}`);
    return;
  }

  if (command === "catalog") {
    const toolsDir = resolve(root, "apps/site/src/content/tools");
    const staleDaysOption = getOption(rest, "--stale-days");
    const asOfOption = getOption(rest, "--as-of");
    if (
      staleDaysOption !== undefined &&
      (!/^\d{2,3}$/.test(staleDaysOption) ||
        Number(staleDaysOption) < 30 ||
        Number(staleDaysOption) > 365)
    ) {
      fail("radar catalog: --stale-days must be between 30 and 365.");
    }
    if (
      asOfOption !== undefined &&
      !/^\d{4}-\d{2}-\d{2}$/.test(asOfOption)
    ) {
      fail("radar catalog: --as-of must be YYYY-MM-DD.");
    }

    const localDate = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Europe/London",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date());
    const asOfDate = asOfOption ?? localDate;
    const asOf = new Date(`${asOfDate}T00:00:00.000Z`);
    if (
      Number.isNaN(asOf.valueOf()) ||
      asOf.toISOString().slice(0, 10) !== asOfDate
    ) {
      fail("radar catalog: --as-of is not a real date.");
    }

    const issueDates = new Map(
      readdirSync(issuesDir)
        .filter((file) => file.endsWith(".md"))
        .map((file) => {
          const parsed = parseIssueFile(resolve(issuesDir, file));
          return [
            file.replace(/\.md$/, ""),
            parsed.frontmatter.pubDate ?? null,
          ];
        }),
    );

    const tools = readdirSync(toolsDir)
      .filter((file) => file.endsWith(".md") || file.endsWith(".mdx"))
      .map((file) => {
        const path = resolve(toolsDir, file);
        const source = readFileSync(path, "utf8");
        const match = source.match(
          /^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/,
        );
        if (!match) fail(`${path} has no frontmatter block.`);

        const frontmatter = {};
        for (const line of match[1].split(/\r?\n/)) {
          const kv = line.match(/^([A-Za-z][\w-]*):\s*(.*)$/);
          if (kv) {
            frontmatter[kv[1]] = kv[2]
              .replace(/^["']|["']$/g, "")
              .trim();
          }
        }

        const lastChecked = frontmatter.lastChecked;
        if (!/^\d{4}-\d{2}-\d{2}$/.test(lastChecked ?? "")) {
          fail(`${path} needs lastChecked in YYYY-MM-DD form.`);
        }
        const checkedAt = new Date(`${lastChecked}T00:00:00.000Z`);
        const fileReviewDays = Number(frontmatter.reviewEveryDays ?? "180");
        const reviewEveryDays =
          staleDaysOption === undefined
            ? fileReviewDays
            : Number(staleDaysOption);
        if (
          !Number.isInteger(reviewEveryDays) ||
          reviewEveryDays < 30 ||
          reviewEveryDays > 365
        ) {
          fail(`${path} has an invalid reviewEveryDays value.`);
        }
        const nextReviewAt = new Date(
          checkedAt.valueOf() + reviewEveryDays * 86_400_000,
        );

        let featuredIssues = [];
        try {
          featuredIssues = JSON.parse(frontmatter.featuredIssues ?? "[]");
        } catch {
          fail(`${path} needs featuredIssues as an inline JSON-style array.`);
        }
        if (!Array.isArray(featuredIssues)) {
          fail(`${path} has invalid featuredIssues.`);
        }
        const datedFeatures = featuredIssues
          .map((slug) => ({ slug, date: issueDates.get(slug) ?? null }))
          .sort((a, b) => (b.date ?? "").localeCompare(a.date ?? ""));

        return {
          slug: file.replace(/\.mdx?$/, ""),
          name: frontmatter.name ?? file,
          status: frontmatter.status ?? "early",
          lastChecked,
          reviewEveryDays,
          nextReviewAt: nextReviewAt.toISOString().slice(0, 10),
          due: nextReviewAt <= asOf,
          featuredIssues,
          lastFeaturedIssue: datedFeatures[0]?.slug ?? null,
          lastFeaturedAt: datedFeatures[0]?.date ?? null,
        };
      })
      .sort((a, b) => {
        if (a.due !== b.due) return a.due ? -1 : 1;
        return a.nextReviewAt.localeCompare(b.nextReviewAt);
      });

    const report = {
      asOf: asOf.toISOString().slice(0, 10),
      staleDaysOverride:
        staleDaysOption === undefined ? null : Number(staleDaysOption),
      total: tools.length,
      due: tools.filter((tool) => tool.due).length,
      neverFeatured: tools.filter(
        (tool) => tool.featuredIssues.length === 0,
      ).length,
      tools,
    };

    if (rest.includes("--json")) {
      console.log(JSON.stringify(report, null, 2));
      return;
    }

    console.log(
      `${report.total} tools · ${report.due} due for review · ${report.neverFeatured} never featured`,
    );
    for (const tool of tools) {
      console.log(
        `${tool.due ? "DUE " : "     "}${tool.slug} · checked ${tool.lastChecked} · next ${tool.nextReviewAt} · last issue ${tool.lastFeaturedIssue ?? "never"}`,
      );
    }
    return;
  }

  if (command === "run") {
    const mode = rest[0] ?? "weekly";
    if (!["weekly", "ians-list-launch", "launch", "catalog-backfill"].includes(mode)) {
      fail("radar run mode must be weekly, ians-list-launch, or catalog-backfill.");
    }
    const launchMode = mode === "launch" ? "ians-list-launch" : mode;
    const promptName =
      launchMode === "ians-list-launch"
        ? "scheduled-ians-list-launch-prompt.md"
        : launchMode === "catalog-backfill"
          ? "scheduled-catalog-backfill-prompt.md"
          : "scheduled-weekly-prompt.md";
    const promptPath = resolve(
      root,
      "skills/swipe-radar/references",
      promptName,
    );
    const logDir = resolve(root, "notes/radar/logs");
    mkdirSync(logDir, { recursive: true });
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const eventLog = resolve(logDir, `${timestamp}-${launchMode}.jsonl`);
    const errorLog = resolve(logDir, `${timestamp}-${launchMode}.stderr.log`);
    const lastMessage = resolve(
      logDir,
      `${timestamp}-${launchMode}.json`,
    );
    const outputSchema = resolve(
      root,
      "skills/swipe-radar/references",
      launchMode === "catalog-backfill"
        ? "catalog-run-output.schema.json"
        : "run-output.schema.json",
    );
    const codex = process.env.CODEX_BIN ?? "codex";

    const result = spawnSync(
      codex,
      [
        "exec",
        "--ephemeral",
        "--color",
        "never",
        "--json",
        "--output-schema",
        outputSchema,
        "--output-last-message",
        lastMessage,
        "--cd",
        root,
        "--sandbox",
        "workspace-write",
        "--config",
        'approval_policy="never"',
        "--config",
        "sandbox_workspace_write.network_access=true",
        readFileSync(promptPath, "utf8"),
      ],
      {
        cwd: root,
        env: process.env,
        encoding: "utf8",
        maxBuffer: 50 * 1024 * 1024,
        stdio: ["ignore", "pipe", "pipe"],
      },
    );

    writeFileSync(eventLog, result.stdout ?? "");
    if (result.stderr) writeFileSync(errorLog, result.stderr);
    if (result.error) fail(result.error.message);
    if (result.status !== 0) {
      if (result.stderr) process.stderr.write(result.stderr);
      fail(`Swipe Radar failed. Codex events: ${eventLog}`);
    }

    let summary;
    try {
      summary = JSON.parse(readFileSync(lastMessage, "utf8"));
    } catch {
      fail(`Swipe Radar returned an invalid summary. See ${lastMessage}`);
    }
    if (
      !summary ||
      typeof summary.title !== "string" ||
      typeof summary.message !== "string" ||
      typeof summary.nextStep !== "string"
    ) {
      fail(`Swipe Radar returned an incomplete summary. See ${lastMessage}`);
    }
    if (
      summary.status === "draft_ready" &&
      (!summary.counts ||
        summary.counts.tools !== 5 ||
        summary.counts.workflows !== 5 ||
        summary.counts.newTools > summary.counts.tools ||
        summary.counts.newTools < 3)
    ) {
      fail(
        `Swipe Radar marked a draft ready outside the five tools, five workflows, three new tools contract. See ${lastMessage}`,
      );
    }

    let draftSnapshot;
    let reportSnapshot;
    let candidateSnapshot;
    let feedbackPath;
    if (summary.status === "draft_ready" && summary.issuePath) {
      const sourcePath = resolve(root, summary.issuePath);
      if (
        !sourcePath.startsWith(`${issuesDir}/`) ||
        !existsSync(sourcePath)
      ) {
        fail(`Swipe Radar returned an invalid issue path: ${summary.issuePath}`);
      }

      const snapshotDir = resolve(root, "radar/drafts", timestamp);
      const snapshotPath = resolve(
        snapshotDir,
        sourcePath.slice(sourcePath.lastIndexOf("/") + 1),
      );
      mkdirSync(snapshotDir, { recursive: true });
      writeFileSync(snapshotPath, readFileSync(sourcePath), { flag: "wx" });
      draftSnapshot = snapshotPath.slice(root.length + 1);
    }

    if (launchMode !== "catalog-backfill") {
      const reportSource = resolve(root, summary.reportPath);
      const radarNotesDir = resolve(root, "notes/radar");
      if (
        !reportSource.startsWith(`${radarNotesDir}/`) ||
        !existsSync(reportSource)
      ) {
        fail(`Swipe Radar returned an invalid report path: ${summary.reportPath}`);
      }

      const candidateSource = resolve(dirname(reportSource), "candidates.md");
      if (!existsSync(candidateSource)) {
        fail(`Swipe Radar did not write the required candidate ledger: ${candidateSource}`);
      }

      const reportPath = resolve(root, "radar/reports", `${timestamp}.md`);
      const candidatesPath = resolve(root, "radar/candidates", `${timestamp}.md`);
      const reviewPath = resolve(root, "radar/feedback", `${timestamp}.md`);
      mkdirSync(dirname(reportPath), { recursive: true });
      mkdirSync(dirname(candidatesPath), { recursive: true });
      mkdirSync(dirname(reviewPath), { recursive: true });
      writeFileSync(reportPath, readFileSync(reportSource), { flag: "wx" });
      writeFileSync(candidatesPath, readFileSync(candidateSource), { flag: "wx" });
      writeFileSync(
        reviewPath,
        `# Radar feedback, ${timestamp}\n\n` +
          `Original draft: \`${draftSnapshot ?? "No draft produced"}\`\n` +
          `Candidate ledger: \`${candidatesPath.slice(root.length + 1)}\`\n\n` +
          `## Picks we should have included\n\n-\n\n` +
          `## Picks we should have rejected\n\n-\n\n` +
          `## Source or testing problems\n\n-\n\n` +
          `## Copy changes to learn from\n\n-\n`,
        { flag: "wx" },
      );
      reportSnapshot = reportPath.slice(root.length + 1);
      candidateSnapshot = candidatesPath.slice(root.length + 1);
      feedbackPath = reviewPath.slice(root.length + 1);
    }

    console.log(summary.title);
    console.log(summary.message);
    if (summary.issuePath) console.log(`Issue: ${summary.issuePath}`);
    if (draftSnapshot) console.log(`Original draft: ${draftSnapshot}`);
    if (summary.reportPath) console.log(`Report: ${summary.reportPath}`);
    if (reportSnapshot) console.log(`Report snapshot: ${reportSnapshot}`);
    if (candidateSnapshot) console.log(`Candidates: ${candidateSnapshot}`);
    if (feedbackPath) console.log(`Feedback: ${feedbackPath}`);
    console.log(`Next: ${summary.nextStep}`);
    reportSchedulerAttention(
      summary.title,
      summary.message,
      summary.nextStep,
    );
    return;
  }

  console.error(`Unknown radar command: ${command}\n`);
  console.error(help());
  process.exit(2);
}

function reportSchedulerAttention(title, message, nextStep) {
  const path = process.env.SCHEDULER_EVENT_FILE;
  if (!path) return;

  const temporaryPath = `${path}.${process.pid}.tmp`;
  writeFileSync(
    temporaryPath,
    `${JSON.stringify(
      { kind: "attention", title, message, nextStep },
      null,
      2,
    )}\n`,
  );
  renameSync(temporaryPath, path);
}

function targetCommand(action, target) {
  const commands = {
    check: {
      site: ["-C", "apps/site", "check"],
      newsletter: ["newsletter:typecheck"],
      "newsletter-api": ["--filter", "@email/api", "typecheck"],
      "newsletter-cli": ["--filter", "@email/cli", "typecheck"],
      "newsletter-core": ["--filter", "@email/core", "typecheck"],
      "newsletter-mcp": ["--filter", "@email/mcp", "typecheck"],
      "newsletter-web": ["--filter", "@email/web", "typecheck"],
    },
    build: {
      site: ["build"],
      newsletter: ["newsletter:build"],
      "newsletter-api": ["--filter", "@email/api", "build"],
      "newsletter-cli": ["--filter", "@email/cli", "build"],
      "newsletter-core": ["--filter", "@email/core", "build"],
      "newsletter-mcp": ["--filter", "@email/mcp", "build"],
      "newsletter-web": ["--filter", "@email/web", "build"],
    },
  };

  const normalizedTarget = target ?? "site";
  const command = commands[action]?.[normalizedTarget];

  if (!command) {
    console.error(`Unknown ${action} target: ${normalizedTarget}\n`);
    console.error(help());
    process.exit(2);
  }

  pnpm(command);
}

const [area, ...rest] = process.argv.slice(2);

if (!area || area === "help" || area === "--help" || area === "-h") {
  console.log(help());
} else if (area === "check" || area === "build") {
  targetCommand(area, rest[0]);
} else if (area === "newsletter" || area === "email") {
  newsletter(rest);
} else if (area === "issue" || area === "issues") {
  await issue(rest);
} else if (area === "radar") {
  radar(rest);
} else if (area === "site") {
  site(rest);
} else {
  console.error(`Unknown command: ${area}\n`);
  console.error(help());
  process.exit(2);
}
