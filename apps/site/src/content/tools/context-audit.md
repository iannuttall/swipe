---
name: "context-audit"
seoTitle: "context-audit skill for cleaning agent instructions"
headline: "context-audit: Find stale and conflicting agent rules"
tagline: "Audit the instructions loaded into every agent task."
description: "context-audit is an agent skill that finds conflicts, duplication, obvious rules, and outdated constraints across AGENTS.md files, skills, hooks, and tool descriptions."
url: "https://github.com/Neeeophytee/finding-unknowns-skills/blob/main/skills/context-audit/SKILL.md"
kind: "skill"
platforms: ["Claude Code", "Codex", "Cursor", "Kimi Code CLI"]
repository: "https://github.com/Neeeophytee/finding-unknowns-skills"
category: "Agent context"
tags: ["AGENTS.md", "context engineering", "agent skills"]
status: "early"
firstSeen: 2026-08-04
lastChecked: 2026-08-04
reviewEveryDays: 90
featuredIssues: ["agent-video-rough-cut"]
sources:
  - kind: "docs"
    label: "context-audit skill instructions"
    url: "https://github.com/Neeeophytee/finding-unknowns-skills/blob/main/skills/context-audit/SKILL.md"
    checkedAt: 2026-08-04
  - kind: "repository"
    label: "Finding-Unknowns Skills repository and installation guide"
    url: "https://github.com/Neeeophytee/finding-unknowns-skills"
    checkedAt: 2026-08-04
---

## Audit all the instructions together

context-audit tells an agent to inventory the guidance it receives from
`AGENTS.md`, `CLAUDE.md`, skills, hooks, tool descriptions, and harness prompts.
It reads those layers together, then classifies rules as conflicts, duplicates,
obvious guidance, outdated blanket constraints, or project-specific gotchas.

Use it when an agent ignores rules or a project instruction file keeps growing.
The output is a proposed diff with before-and-after line counts, not an automatic
rewrite.

## Keep the human approval step

The skill explicitly says to propose deletions rather than apply them. That
matters because an awkward rule may be scar tissue from a real production
incident. Ask the agent to quote both sides of every conflict and flag the one
deletion it is least confident about, then approve or reject each change.

This is a community skill distilled from public context-engineering ideas, not
an official Anthropic tool. Installation behaviour also differs by agent; the
repository documents those differences.
