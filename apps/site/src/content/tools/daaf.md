---
name: "DAAF"
seoTitle: "DAAF framework for reproducible AI data analysis"
headline: "DAAF: Run auditable data analysis with an AI assistant"
tagline: "Keep research code, decisions, and outputs open to inspection."
description: "DAAF is an open-source Docker framework that gives Claude Code and compatible models a file-first, reviewable workflow for quantitative research."
url: "https://daaf.openaugments.org/"
kind: "repository"
platforms: ["Docker", "macOS", "Linux", "Windows"]
repository: "https://github.com/DAAF-Contribution-Community/daaf"
category: "Data analysis"
tags: ["research", "reproducibility", "Claude Code"]
status: "early"
firstSeen: 2026-08-04
lastChecked: 2026-08-04
reviewEveryDays: 90
featuredIssues: []
sources:
  - kind: "landing"
    label: "DAAF project site"
    url: "https://daaf.openaugments.org/"
    checkedAt: 2026-08-04
  - kind: "repository"
    label: "DAAF source, README, and documentation"
    url: "https://github.com/DAAF-Contribution-Community/daaf"
    checkedAt: 2026-08-04
  - kind: "release"
    label: "DAAF v3.0.1 release"
    url: "https://github.com/DAAF-Contribution-Community/daaf/releases/tag/v3.0.1"
    checkedAt: 2026-08-04
---

## A research workspace built around inspection

DAAF wraps an AI coding agent in a Docker-based quantitative research
environment. It keeps analysis in Python or R files, records decisions and
outputs, and supplies workflows for data profiling, planning, analysis, review,
reporting, and reproducibility checks.

The useful difference is not autonomous research. DAAF is designed for a
researcher who can choose the method, inspect the code, and challenge the
result. A practical first project is to load one documented public dataset and
ask for a profile, then compare every generated variable description with the
source documentation before doing any modelling.

## It is deliberately heavier than a single skill

Installation requires Docker plus access to a supported model provider. The
project warns that a full API-backed analysis can be expensive, and its own
documentation says expert review remains necessary because models can still
hallucinate or cut corners.

DAAF was too specialised and framework-heavy for this week's email, but those
are not catalogue rejection reasons. It has a concrete use, public source,
current release, and documented limitations, so it belongs here for readers
who do quantitative research.
