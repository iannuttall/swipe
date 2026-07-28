#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import {
  existsSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
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
  pnpm swipe issue test [slug] [--to email] [--status cold]
                                               prod draft + test send to you only
  pnpm swipe issue send [slug] --yes         publish archive page, then broadcast
  (omit the slug to pick from a list)

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
  console.log(`Created prod draft ${draftId}.`);
  return draftId;
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

  if (command === "test") {
    const ssh = sshEnv();
    const to = getOption(rest, "--to") ?? localEnv("SWIPE_TEST_EMAIL");
    if (!to) fail("issue test needs --to or SWIPE_TEST_EMAIL in root .env.local.");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) fail("issue test needs a valid email address.");
    const status = getOption(rest, "--status", "cold");
    const draftId = remoteDraftCreate(ssh, parsed, slug);
    const output = sshCapture(
      ssh.target,
      `${ssh.ops} broadcast test --yes --draft-id ${shellQuote(draftId)} --to ${shellQuote(to)} --status ${shellQuote(status)} --json`,
    );
    console.log(output.trim());
    console.log(`Test sent to ${to}.`);
    return;
  }

  if (command === "send") {
    if (!rest.includes("--yes")) {
      fail("issue send creates a real broadcast to the list. Re-run with --yes.");
    }
    if (parsed.frontmatter.broadcastId) {
      fail(`${slug} already has broadcastId ${parsed.frontmatter.broadcastId}; refusing to double-send.`);
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

    const branch = stepCapture("git", ["rev-parse", "--abbrev-ref", "HEAD"]).trim();
    if (branch !== "main") fail(`issue send publishes from main; you are on ${branch}.`);

    const otherChanges = stepCapture("git", ["status", "--porcelain"])
      .split("\n")
      .filter((line) => line.trim() && !line.includes(`src/content/issues/${slug}.md`));
    if (otherChanges.length > 0) {
      console.log("Note: other uncommitted changes exist; only the issue file will be committed:");
      for (const line of otherChanges) console.log(`  ${line}`);
    }

    // Publish the archive page first so the email can never link to a 404.
    if (parsed.frontmatter.draft === "true") {
      writeIssueFrontmatter(path, parsed, { draft: "false" });
    }
    const dirty = stepCapture("git", ["status", "--porcelain", "--", path]).trim();
    if (dirty) {
      stepRun("git", ["add", path]);
      stepRun("git", ["commit", "-m", `content(issues): publish ${slug}`]);
    }
    stepRun("git", ["push", "origin", "main"]);
    const sha = stepCapture("git", ["rev-parse", "HEAD"]).trim();
    await waitForDeploy(sha);

    const published = parseIssueFile(path);
    const draftId = remoteDraftCreate(ssh, published, slug);
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
} else if (area === "site") {
  site(rest);
} else {
  console.error(`Unknown command: ${area}\n`);
  console.error(help());
  process.exit(2);
}
