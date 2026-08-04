# Article incubation

Swipe readers are more likely to use a tool, repository, skill, or prompt than
a standalone article. Treat articles as sources. Turn one into an artifact
only when it contains a practical method worth repeating and no good public
artifact already exists.

## Choose the smallest useful form

- Use a **skill** for judgement, a guided sequence, or a reusable agent
  workflow.
- Use a **CLI** for a deterministic local transformation or check.
- Use a **prompt** when one prompt plus a worked example is genuinely enough.

Do not create a thin wrapper whose only purpose is making an article look like
a product. Search for an existing maintained implementation before building.

## Local incubation

Put the experiment under:

```text
radar/incubator/<YYYY-MM-DD>/<slug>/
```

Include:

- `README.md` with the useful result and how to try it;
- `ORIGIN.md` naming the author, source URL, and the parts adapted;
- the skill, prompt, or CLI itself;
- disposable test input and the resulting output or receipt;
- the exact test command;
- limitations and a clear `incubate`, `revise`, or `discard` decision.

If building a skill, use the repository's available `skill-creator` workflow.
Keep CLIs dependency-light, deterministic, local by default, and safe on
untrusted input.

The artifact must add practical value beyond the source: clear triggers,
steps, guardrails, an example, and a tested output. Paraphrase the method and
respect the source licence. Do not copy substantial prose or code without
permission.

## Publication boundary

An unattended Radar run stops at the local incubator. It must not create a
GitHub organisation or repository, push code, publish a package, or substitute
an unpublished local path for a public issue link.

The review report should propose a repository name, one-line description,
licence, attribution, and readiness status. Ian explicitly chooses the GitHub
identity and approves publication. Once public, the Swipe item should lead to
the usable artifact and credit the original article as its source.
