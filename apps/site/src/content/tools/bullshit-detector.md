---
name: "Bullshit Detector"
seoTitle: "Bullshit Detector agent skill for checking claims"
headline: "Bullshit Detector: Check every claim before you publish"
tagline: "Turn a draft or source into a claim-by-claim evidence report."
description: "Bullshit Detector is an installable agent skill that extracts claims, searches for independent evidence, and links each verdict to its sources."
url: "https://github.com/SerhiiKorniienko/bullshit-detector"
kind: "repository"
platforms: ["macOS", "Linux", "Windows"]
repository: "https://github.com/SerhiiKorniienko/bullshit-detector"
category: "Research"
tags: ["fact checking", "research", "agent skills"]
status: "early"
firstSeen: 2026-08-04
lastChecked: 2026-08-04
reviewEveryDays: 30
featuredIssues: ["agent-video-rough-cut"]
sources:
  - kind: "repository"
    label: "Bullshit Detector repository"
    url: "https://github.com/SerhiiKorniienko/bullshit-detector"
    checkedAt: 2026-08-04
  - kind: "readme"
    label: "Bullshit Detector README"
    url: "https://github.com/SerhiiKorniienko/bullshit-detector/blob/main/README.md"
    checkedAt: 2026-08-04
  - kind: "docs"
    label: "Agent setup guide"
    url: "https://github.com/SerhiiKorniienko/bullshit-detector/blob/main/SETUP.md"
    checkedAt: 2026-08-04
  - kind: "release"
    label: "Bullshit Detector releases"
    url: "https://github.com/SerhiiKorniienko/bullshit-detector/releases"
    checkedAt: 2026-08-04
  - kind: "other"
    label: "Open evaluation harness issue"
    url: "https://github.com/SerhiiKorniienko/bullshit-detector/issues/3"
    checkedAt: 2026-08-04
---

## Turn a confident source into separate claims

Bullshit Detector is a set of agent skills for checking a video, article,
tweet, PDF, or local draft. It extracts individual claims, searches for
independent evidence, and produces a linked verdict for each one.

This matters because an ordinary summary preserves the source's confidence. A
claim report separates facts that can be checked from opinions, missing
evidence, and conclusions that need human judgment.

The result includes confirmed, plausible, misleading, false, and unverifiable
labels, plus a score for the whole source. Each verdict must cite evidence
instead of relying on the model's memory. The repository also includes a
fetching skill that can turn supported articles, videos, social posts, and PDFs
into clean text before the check starts.

## Check your own launch draft first

The most practical use is not judging strangers on the internet. Run it against
a launch post, sales page, investor update, or README before you publish.

Install the skills with the public skills installer:

```sh
npx skills@latest add SerhiiKorniienko/bullshit-detector
```

The fetching script also needs `uv`. Then give your agent the draft and the
primary sources behind it:

> Check every factual claim in this launch post. Start with the claims a
> sceptical customer would challenge. Link the best source for each verdict,
> and leave private company figures as unverifiable unless I provide evidence.

Fix the claims that are too broad, stale, or weakly sourced. Follow every
important citation yourself before publishing. The report is a research pass,
not an approval stamp.

## What it can fetch

The ingestion skill supports ordinary web articles, YouTube transcripts,
TikTok captions, tweets, PDFs, and local files. It uses deterministic scripts
to fetch and clean the source, then leaves claim extraction and judgment to the
agent.

The repository treats fetched material as untrusted text. Its scripts fence
the source and neutralise text that tries to close that boundary. This is an
important protection when an agent reads arbitrary pages, but it does not make
every downloaded file or linked source safe.

The full setup works in Claude Code, Codex, OpenCode, Cursor, Gemini CLI, and
other tools that support portable agent skills and web search. Chat interfaces
with restricted web or command access need a paste-driven workflow and cannot
use every fetcher.

## Do not treat the score as a measurement

The project documents several important limits. It checks premises, not the
logic that connects them. A source can contain individually true facts and
still reach a bad conclusion.

It can cite only pages that its search and fetch tools can reach. Blocked
publishers, copied articles, and search-ranked marketing pages can distort the
evidence set. Web results also change, so two runs can reach different
verdicts.

The repository does not yet have an evaluation harness that measures how often
its verdicts are right. Its published examples are useful demonstrations, but
the author selected them and the same system produced the reports. An open
issue tracks the missing evaluation work.

These limits do not remove the value of the workflow. They change how you use
it. Read the cited source, look for an original document, and keep
"unverifiable" when the evidence is not public.

## Current pace and alternatives

Bullshit Detector is MIT licensed and has been releasing changes quickly. The
recent releases added report consistency checks and moved more bookkeeping
from the model into deterministic scripts. Pin a release when a report must be
repeatable, because the rubric is still changing.

Use it when a source contains many checkable claims and a manual first pass
would take too long. Use a professional fact-checker, subject expert, or legal
review when an error could harm someone or create a regulatory risk. The skill
can show where to look. A person still owns the decision to publish.
