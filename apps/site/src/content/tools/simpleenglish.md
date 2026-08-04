---
name: "SimpleEnglish"
seoTitle: "SimpleEnglish skill for clearer technical writing"
headline: "SimpleEnglish: Give agents stricter technical-writing rules"
tagline: "Rewrite technical instructions with controlled English rules."
description: "SimpleEnglish is an agent skill that adapts ASD-STE100 controlled-English rules for software documentation, runbooks, errors, and release notes."
url: "https://github.com/AminBlg/SimpleEnglish"
kind: "skill"
platforms: ["Claude Code", "Codex", "Cursor", "ChatGPT"]
repository: "https://github.com/AminBlg/SimpleEnglish"
category: "Writing"
tags: ["technical writing", "documentation", "ASD-STE100"]
status: "early"
firstSeen: 2026-08-04
lastChecked: 2026-08-04
reviewEveryDays: 90
featuredIssues: ["agent-video-rough-cut"]
sources:
  - kind: "repository"
    label: "SimpleEnglish repository and README"
    url: "https://github.com/AminBlg/SimpleEnglish"
    checkedAt: 2026-08-04
  - kind: "docs"
    label: "SimpleEnglish skill instructions"
    url: "https://github.com/AminBlg/SimpleEnglish/blob/main/skills/simple-english/SKILL.md"
    checkedAt: 2026-08-04
  - kind: "test"
    label: "Published SimpleEnglish evaluation results"
    url: "https://github.com/AminBlg/SimpleEnglish/blob/main/evals/results/RESULTS.md"
    checkedAt: 2026-08-04
  - kind: "docs"
    label: "Official ASD-STE100 history"
    url: "https://www.asd-ste100.org/about_STE.html"
    checkedAt: 2026-08-04
---

## Aircraft writing rules for software work

SimpleEnglish packages controlled-English rules inspired by ASD-STE100 as an
installable agent skill. The standard grew from aviation maintenance work,
where manufacturers needed technical instructions that readers could not
easily interpret in two different ways.

The skill applies that approach to software documentation. It limits sentence
length, uses one term for one meaning, puts conditions before commands, and
favours direct instructions. The repository includes versions for agents that
support `SKILL.md` plus a plain system prompt for other chat tools.

## Try it on one risky procedure

Install it with the documented Skills CLI command, or paste the supplied prompt
into your agent. Give it a deployment rollback, credential setup, or recovery
procedure and ask for a rewrite. Compare the result line by line with the
original: every prerequisite should appear before the action it controls, and
each instruction should contain one clear operation.

The repository publishes a 96-run author evaluation and before-and-after
examples. Treat those as project evidence, not an independent guarantee. The
skill also says its flat style is deliberately wrong for marketing and brand
writing, so use it where ambiguity matters more than voice.
