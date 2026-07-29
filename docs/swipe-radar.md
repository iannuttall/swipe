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
- limits the preferred issue shape to four tools and four practical workflows;
- collects separate seven-day Hacker News streams for new and popular stories;
- treats Keep as one source rather than the default feed;
- maintains verified tool pages under `/tools`, including useful finds that
  miss the weekly issue;
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
- uses the Swipe writing standard, `writing-tips`, and the local trained `blog`
  profile before declaring copy ready for review;
- writes a Scheduler attention event containing a short title, message, and
  exact next step, matching the old Ian AMA task;
- never bypasses the sandbox.

The scheduled agent writes its research, demos, receipts, and review report
under `notes/radar/<YYYY-MM-DD>/`. A successful run stops with a local
`draft: true` issue. Publishing and sending remain separate human actions.
