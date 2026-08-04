# Swipe Radar scheduling

Swipe Radar is an agent workflow invoked through the local `swipe` command.
The menu bar scheduler only needs a command and the Swipe repository as its
working directory.

## Weekly task

Command:

```sh
pnpm swipe radar run
```

Working directory:

```text
/Users/iannuttall/dev/sites/swipe
```

`weekly` is the default mode. The longer equivalent is:

```sh
pnpm swipe radar run weekly
```

## One-off Ian's List launch task

```sh
pnpm swipe radar run ians-list-launch
```

To revisit rejected tools and deepen the public catalogue without drafting an
issue:

```sh
pnpm swipe radar run catalog-backfill
```

## What the command does

`swipe radar run`:

- selects the mode-specific prompt from the repo-owned `$swipe-radar` skill;
- invokes `codex exec` from the Swipe repository;
- uses the workspace-write sandbox with network access;
- sets approval policy to `never`, so an unattended run fails instead of
  waiting for a prompt;
- keeps the full Codex event stream under `notes/radar/logs/`, which is
  gitignored;
- validates the final agent response against a small JSON schema;
- saves the untouched draft under `radar/drafts/<run timestamp>/` before Ian
  edits the copy in the Astro issue collection;
- archives the full source-and-test report under `radar/reports/` and every
  considered candidate under `radar/candidates/`;
- creates an editable `radar/feedback/` note that future runs read before
  selecting and writing;
- requires five tools and five practical workflows before marking a draft
  ready, while returning `no_draft` rather than padding a weak issue;
- collects separate seven-day Hacker News streams for new and popular stories;
- treats those seven-day feeds as a fresh pass, then searches five years of
  Hacker News, two years of GitHub skills, and the full Keep library for useful
  candidates Swipe has never inspected;
- deduplicates by canonical source, repository, tool page, and previous issue
  instead of treating publication date as the novelty test;
- treats Keep as one source rather than the default feed;
- searches the `swipe` and `ianslist` Keep tags first as Ian's explicit
  editorial shortlist, while treating untagged mobile shares as ordinary
  leads;
- prefers free or meaningfully usable tools, repositories, skills, prompts,
  and working examples over standalone articles;
- may turn a strong article method into a tested local artifact under
  `radar/incubator/`, but cannot create or publish a remote repository without
  explicit approval;
- creates a verified `/tools` page for every viable app, CLI, repository, and
  agent skill it source-inspects, including finds that miss the weekly issue;
- records an exact exclusion reason for duplicates, unsafe, unusable, dead,
  seriously criticised, or unverifiable artefacts instead of silently dropping
  them;
- deeply reads landing pages and documentation for apps, and README, agent
  files, docs, releases, and relevant source for repositories;
- keeps public tool copy as prerendered Markdown while D1 is reserved for
  changing review, issue-history, search, vote, and submission signals;
- uses earlier issue appearances, product updates, search demand, and reader
  interest as future Radar signals;
- gives the email subject, preheader, web title, description, and slug separate
  jobs;
- requires every workflow to be something a reader can do with an AI agent;
- rejects a workflow when its linked source does not explicitly support the
  exact move in the draft;
- checks that the move reflects the source's main argument rather than one
  isolated line;
- replaces specialist product language with ordinary words unless the reader
  needs the exact term;
- writes each pick as what it is, two or three sentences on why it matters,
  and two or three sentences giving the reader something specific to try;
- keeps limitations in the private research unless a safety instruction is
  needed in the practical example;
- uses the Swipe writing standard, `writing-tips`, and the local trained `blog`
  profile before declaring copy ready for review;
- writes a Scheduler attention event containing a short title, message, and
  exact next step, matching the old Ian AMA task;
- never bypasses the sandbox.

The scheduled agent writes its research, demos, receipts, and review report
under `notes/radar/<YYYY-MM-DD>/`. A successful run stops with a local
`draft: true` issue. The editable issue lives in
`apps/site/src/content/issues/`; its immutable Radar version lives in the
tracked `radar/drafts/` archive. The report and candidate snapshots are also
tracked and immutable. Add corrections to the matching file under
`radar/feedback/`; do not edit the evidence snapshot. Publishing and sending
remain separate human actions.
