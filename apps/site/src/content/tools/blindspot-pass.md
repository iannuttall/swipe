---
name: "blindspot-pass"
seoTitle: "blindspot-pass skill for finding unknowns before work"
headline: "blindspot-pass: Improve a brief before implementation"
tagline: "Find the missing context that could change the work."
description: "blindspot-pass is an agent skill that researches landmines, hidden constraints, good examples, and expert questions before rewriting a project brief."
url: "https://github.com/Neeeophytee/finding-unknowns-skills/blob/main/skills/blindspot-pass/SKILL.md"
kind: "skill"
platforms: ["Claude Code", "Codex", "Cursor", "Kimi Code CLI"]
repository: "https://github.com/Neeeophytee/finding-unknowns-skills"
category: "Planning"
tags: ["briefs", "research", "agent skills"]
status: "early"
firstSeen: 2026-07-29
lastChecked: 2026-08-04
reviewEveryDays: 90
featuredIssues: ["sketch-an-app-with-ai"]
sources:
  - kind: "docs"
    label: "blindspot-pass skill instructions"
    url: "https://github.com/Neeeophytee/finding-unknowns-skills/blob/main/skills/blindspot-pass/SKILL.md"
    checkedAt: 2026-08-04
  - kind: "repository"
    label: "Finding-Unknowns Skills repository"
    url: "https://github.com/Neeeophytee/finding-unknowns-skills"
    checkedAt: 2026-08-04
---

## Research before committing to the brief

blindspot-pass makes an agent pause before implementation and inspect unfamiliar
territory. It reports likely landmines, hidden constraints, examples of good
work, and questions an expert would ask. It then rewrites the original request
with that context included.

Use it before a costly change in a part of the codebase or domain you do not
know well. Give it the intended result and your experience level, then check
that every addition to the rewritten brief has evidence behind it.

The skill deliberately stops before doing the task. That makes it unnecessary
overhead for small, familiar work, and its external research is only as good as
the sources the host agent can reach. The final brief still needs a human to
separate real constraints from generic caution.
