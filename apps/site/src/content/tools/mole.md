---
name: "Mole"
seoTitle: "Mole CLI for finding and cleaning Mac disk clutter"
headline: "Mole: Inspect Mac disk clutter from the terminal"
tagline: "Find large files and leftovers before choosing what to remove."
description: "Mole is a free Mac CLI for analysing disk use, finding application leftovers, and previewing cleanup commands before they remove files."
url: "https://github.com/tw93/Mole"
kind: "cli"
platforms: ["macOS", "Terminal"]
repository: "https://github.com/tw93/Mole"
category: "System utilities"
tags: ["macOS", "disk cleanup", "CLI"]
status: "established"
firstSeen: 2026-08-04
lastChecked: 2026-08-04
reviewEveryDays: 90
featuredIssues: ["agent-video-rough-cut"]
sources:
  - kind: "repository"
    label: "Mole source, README, and safety notes"
    url: "https://github.com/tw93/Mole"
    checkedAt: 2026-08-04
  - kind: "release"
    label: "Mole V1.49.2 release"
    url: "https://github.com/tw93/Mole/releases/tag/V1.49.2"
    checkedAt: 2026-08-04
---

## Use the report before the cleaner

Mole can analyse disk use, remove application leftovers, clear caches, inspect
developer artefacts, and report Mac health from the terminal. Its `analyze` and
`status` commands support JSON, which makes the output useful to scripts and AI
agents as well as people.

A sensible first run is `mo analyze --json`. Give the report to an agent and
ask it to group the largest entries by likely purpose, but make the deletion
decision yourself.

## Destructive commands need a preview

Mole documents `clean`, `purge`, `uninstall`, `installer`, and `remove` as
destructive operations. Run their `--dry-run` form first, inspect each path,
and approve changes one at a time. Operation history is available through
`mo history`, but a log is not a backup.

The supported Homebrew route targets macOS 14 or later. An experimental Windows
branch exists, but the normal tool is built for a Mac.
