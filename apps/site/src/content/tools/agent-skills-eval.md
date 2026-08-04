---
name: "agent-skills-eval"
seoTitle: "agent-skills-eval: Test whether an agent skill helps"
headline: "agent-skills-eval: Compare a skill against no skill"
tagline: "Run the same cases with and without an agent skill."
description: "agent-skills-eval runs identical prompts with and without a SKILL.md, grades both outputs, and creates a side-by-side HTML report."
url: "https://github.com/darkrishabh/agent-skills-eval"
kind: "cli"
platforms: ["Node.js", "Terminal", "OpenAI-compatible APIs"]
repository: "https://github.com/darkrishabh/agent-skills-eval"
category: "Agent testing"
tags: ["agent skills", "evaluation", "testing"]
status: "early"
firstSeen: 2026-08-04
lastChecked: 2026-08-04
reviewEveryDays: 60
featuredIssues: ["agent-video-rough-cut"]
sources:
  - kind: "repository"
    label: "agent-skills-eval source and README"
    url: "https://github.com/darkrishabh/agent-skills-eval"
    checkedAt: 2026-08-04
  - kind: "docs"
    label: "agent-skills-eval documentation"
    url: "https://darkrishabh.github.io/agent-skills-eval/"
    checkedAt: 2026-08-04
  - kind: "test"
    label: "Local CLI help check recorded by Swipe Radar"
    url: "https://github.com/darkrishabh/agent-skills-eval#quickstart"
    checkedAt: 2026-08-04
---

## Check whether the instructions changed the result

agent-skills-eval runs each evaluation twice: once with the skill loaded and
once without it. A judge model grades both outputs against the same assertions,
then the CLI writes JSON artefacts and a static side-by-side HTML report.

Point it at a small skill with two or three cases before attempting a large
suite. Write assertions for behaviour you can recognise, run with `--baseline`,
and inspect the failures rather than relying only on the rolled-up score. Swipe
Radar verified that the published CLI exposes the documented baseline, target,
judge, strict-validation, workspace, and report options.

## A comparison is evidence, not ground truth

The target and judge both consume model calls, so a real run has a cost. A
model judge can also prefer style or wording that does not reflect actual task
success. Use deterministic assertions for file shape, tool calls, and exact
requirements where possible, then review a sample of the model-graded cases
yourself.
