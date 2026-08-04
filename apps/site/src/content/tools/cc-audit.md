---
name: "cc-audit"
seoTitle: "cc-audit: Claude Code token usage and cost analysis"
headline: "cc-audit: Find where Claude Code spends tokens"
tagline: "Find the sessions and instructions using the most tokens."
description: "cc-audit reads Claude Code history, estimates API-equivalent spend, and points to expensive sessions, repeated context, and always-loaded instructions."
url: "https://github.com/pa-arth/cc-audit"
kind: "repository"
platforms: ["Node.js", "macOS", "Linux"]
repository: "https://github.com/pa-arth/cc-audit"
category: "AI cost tracking"
tags: ["Claude Code", "token usage", "context"]
status: "early"
firstSeen: 2026-07-29
lastChecked: 2026-07-29
reviewEveryDays: 60
featuredIssues: ["agent-video-rough-cut"]
sources:
  - kind: "repository"
    label: "cc-audit source code and README"
    url: "https://github.com/pa-arth/cc-audit"
    checkedAt: 2026-07-29
  - kind: "release"
    label: "cc-audit v0.7.0"
    url: "https://github.com/pa-arth/cc-audit/releases/tag/v0.7.0"
    checkedAt: 2026-07-29
  - kind: "docs"
    label: "Claude Code cost documentation"
    url: "https://code.claude.com/docs/en/costs"
    checkedAt: 2026-07-29
---

## What cc-audit is for

cc-audit turns Claude Code's local session history into a usage review. It
shows estimated spend by model, the most expensive sessions, repeated commands,
context carried past useful boundaries, and instructions that load into every
conversation.

That makes it more useful for reducing waste than a simple daily cost graph.
For example it can show that a long debugging thread kept unrelated work in
context, or that a large `CLAUDE.md`, several skills, and unused MCP servers
consume tokens before the task begins.

Use it when Claude Code limits feel unpredictable or when you want to compare
working habits across a few weeks. It only understands Claude Code history, so
it is not the right dashboard for a team using several coding agents.

## Start with a controlled audit

The normal entry point is:

```sh
npx @promptster/cc-audit
```

The package requires Node 18 or newer. The project also publishes prebuilt
binaries for macOS and Linux. No cc-audit account or API key is needed for the
deterministic local report.

Before reading your real history make a small fixture and point the tool at
that directory:

```sh
npx @promptster/cc-audit --root ./test-history --json
```

`--root` is important here. Source inspection confirms that an alternate root
is kept out of cc-audit's sharing path. The JSON output is also easier to
inspect and save than the interactive report.

We checked version 0.7.0 against a synthetic Claude Code transcript. It
returned the expected total of $0.076 and separated command spend from normal
work. That verifies the basic parser and calculation against made-up data. It
does not prove that every future Claude Code log format or model price will be
handled correctly.

## Cost figures are estimates

cc-audit applies a pricing table to the token counts stored in Claude Code
logs. Treat the result as API-equivalent spend, not an invoice.

This matters for Claude Pro and Max subscribers. Their usage is included in a
subscription, and Anthropic says the dollar figure shown for a session is not
relevant to subscription billing. API users should still use the Claude
Console as the authoritative bill. A local tool can also fall behind when
model prices or private log formats change.

The valuable part is usually the relative picture: which sessions cost most,
which model handled them, and what avoidable context was present.

## Read the privacy prompts carefully

The local parser is not the whole product. A normal interactive run can end
with two prompts that default to yes.

The first can ask your own Claude Code or Codex installation to judge a compact
summary and write coaching plans. That uses the model account you already have.
The second can create a public report and enable ongoing capture for future
runs.

Ongoing capture can send aggregate spend, model and tool counts, and task gists
made from the first part of your prompts. Public reports can also contain
agent-written plans that name commands, skills, or subagents. Do not accept
those prompts on sensitive work without reviewing the exact payload and
purpose.

Check the current setting before a real audit:

```sh
npx @promptster/cc-audit capture --status
npx @promptster/cc-audit capture --off
```

Turning capture off stops future sends. Treat the public-link step as a
publication decision, not a harmless preview. Even a local-only run writes
history and advice under `~/.cc-audit/`, and the tool checks for updates over
the network.

## What to change after the report

Start with changes you can verify:

- clear the conversation when the job changes
- remove always-loaded instructions that do not affect most tasks
- disable MCP servers and plugins that are not used
- use a cheaper model for routine work when quality holds
- split a sprawling task into smaller sessions with explicit outputs

Run the same date range again after changing one habit. The comparison is more
useful than chasing a perfect score from one report.

## Alternatives

Claude Code's `/usage` view is the simplest option for the current session.
Tools such as ccusage and Claude Code usage monitors are better when you mainly
want charts, daily totals, or multi-agent coverage.

Choose cc-audit when the question is why a Claude Code workflow costs what it
does and which context habits may be responsible. Skip its optional sharing
features unless the public output is genuinely useful and safe to expose.
