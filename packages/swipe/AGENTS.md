# Agent Notes

This package is the local helper CLI for the monorepo.

Use it to hide long app paths and env-file boilerplate behind short commands.
It should stay tiny: route commands to existing app CLIs instead of duplicating
business logic.

## Rules

- Keep newsletter behavior in `apps/newsletter/packages/cli` and `@email/core`.
- This wrapper may add aliases, defaults, and local path convenience only.
- Prefer commands that are safe for humans and agents to remember.
- Commands that send email or mutate queues must still require the underlying
  newsletter CLI confirmation flags.
