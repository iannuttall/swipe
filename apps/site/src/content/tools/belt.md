---
name: "Belt"
seoTitle: "Belt CLI for reusable agent skills and tools"
headline: "Belt: Reuse skills and tools across coding agents"
tagline: "Carry useful agent setup from one task to the next."
description: "Belt is a CLI for installing reusable skills, connecting tools, and sharing agent setup across Claude Code, Codex, Cursor, and other runtimes."
url: "https://inference.sh/belt"
kind: "cli"
platforms: ["Claude Code", "Codex", "Cursor", "Terminal"]
category: "Agent tooling"
tags: ["agent skills", "MCP", "developer tools"]
status: "early"
firstSeen: 2026-08-04
lastChecked: 2026-08-04
reviewEveryDays: 60
featuredIssues: []
sponsoredIssues: ["agent-video-rough-cut"]
sources:
  - kind: "landing"
    label: "Belt product page"
    url: "https://inference.sh/belt"
    checkedAt: 2026-08-04
---

## What Belt does

Belt puts agent skills, command-line tools, MCP connectors, and deployable apps
behind one CLI. Its practical use is consistency: install the same skill for
Claude Code, Codex, or Cursor instead of rebuilding the workflow separately in
each runtime.

The product page documents commands for finding, installing, listing, changing,
and publishing skills. It can also expose connected services through MCP and
run Inference tools from the terminal.

## A useful first test

Install Belt using the command on its product page, then add one small skill
you already understand. Use the same task in two supported coding agents and
check whether both agents load the expected instructions.

That is a better first test than moving every workflow at once. Belt spans a
hosted registry, connectors, tools, and app deployment, so the amount of remote
access depends on which parts you enable. Review a skill before installing it,
pin important versions, and inspect the permissions of every connector.

This page records Belt as a paid placement in the linked Swipe issue. That is
kept separate from editorial issue appearances.
