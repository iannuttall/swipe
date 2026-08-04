# Manual fill review, 2026-08-04

This supplements the immutable candidate snapshot from the 2026-08-04 Radar
run. It records the manual research used to bring the editable draft to five
tools and five workflows after Ian's review.

## Editorial corrections

- Keep saves tagged `swipe` or `ianslist` are Ian's explicit shortlist and
  outrank untagged saves.
- An untagged mobile share is only a discovery lead. Its Keep note may show
  that Ian saved it for another product he is building.
- Prefer free, open-source, locally runnable, or meaningfully usable free-tier
  products.
- Prefer tools, repositories, skills, prompts, and working examples over
  standalone articles.
- A useful article method may be incubated locally as a tested artifact, but
  Radar cannot publish it or create a remote repository without approval.

## RawReply reconsideration

- **Type:** tool
- **Verdict:** selected, but not because it was in Keep
- **Manual signal:** untagged mobile save; Ian's note says he is building a
  related CLI
- **Sources checked:** [landing page](https://rawreply.com/) and its public FAQ,
  checked 2026-08-04
- **Test:** the original run used the anonymous demo with a synthetic checkout
  update; the live page still states that a short conversation works without
  signing in
- **Decision:** retained because the no-sign-in demo gives readers a practical
  free try. The save itself is not treated as an endorsement.

## cc-audit

- **Type:** tool
- **Verdict:** selected as the fifth tool
- **Manual signal:** none
- **Sources checked:** [repository](https://github.com/pa-arth/cc-audit), README,
  release history, and CLI source, checked 2026-08-04
- **Test:** previously installed and tested locally; current v0.7.0 source was
  rechecked. It reads local Claude Code history and can report sessions,
  models, instruction files, old context, and estimated cost.
- **Limitations:** cost is estimated. Bare runs may ask whether to enable
  optional capture or sharing, so the issue tells readers to check that it is
  off before using real history.
- **Decision:** selected because it produces a concrete local report and a
  repeatable before-and-after check.

## Mole disk audit

- **Type:** tool-backed workflow
- **Verdict:** selected
- **Manual signal:** `swipe`; Ian's note explicitly called the free Mac cleanup
  workflow newsletter material
- **Sources checked:** [repository](https://github.com/tw93/Mole), README,
  security notes, and command examples, checked 2026-08-04
- **Test:** source commands and machine-readable output were inspected. The
  workflow uses `mo analyze --json` and requires `--dry-run` plus one-by-one
  approval before destructive commands.
- **Limitations:** Mac only. `clean`, `purge`, `uninstall`, `installer`, and
  `remove` can delete local data.
- **Decision:** selected because the CLI is free, the JSON gives an agent a
  concrete artifact to review, and the workflow has explicit safety gates.

## agent-skills-eval

- **Type:** tool-backed workflow
- **Verdict:** selected
- **Manual signal:** none; found in the expanded GitHub archive pass
- **Sources checked:** [repository](https://github.com/darkrishabh/agent-skills-eval),
  README, package help, and agentskills.io layout documentation, checked
  2026-08-04
- **Test:** `pnpm dlx agent-skills-eval --help` installed and exposed baseline,
  target, judge, strict validation, workspace, and report options as documented.
- **Limitations:** a real comparison consumes target and judge model calls.
  Model-based judging is evidence, not ground truth.
- **Decision:** selected because comparing the same cases with and without a
  skill is more useful than assuming a SKILL.md helps.

## context-audit

- **Type:** agent skill
- **Verdict:** selected
- **Manual signal:** whole-library Keep and repository research
- **Sources checked:** [skill](https://github.com/Neeeophytee/finding-unknowns-skills/blob/main/skills/context-audit/SKILL.md)
  and [Anthropic's context engineering article](https://claude.com/blog/the-new-rules-of-context-engineering-for-claude-5-generation-models),
  checked 2026-08-04
- **Test:** the skill was cloned and inspected. It inventories agent guidance,
  classifies conflicts and duplication, proposes a diff, and requires human
  approval before deletion.
- **Decision:** selected because it packages the article's context-reduction
  lesson as a usable public skill.

## Closing questions

- **Type:** two-question prompt workflow
- **Verdict:** selected
- **Manual signal:** saved Reddit item in Keep
- **Sources checked:** [source post](https://www.reddit.com/r/ClaudeAI/comments/1vbkq6o),
  checked 2026-08-04
- **Test:** asked both questions after reviewing the draft. They exposed a
  muddled RawReply memory claim and PilotCut's missing Mac limitation; both
  were corrected.
- **Decision:** retained because the prompt itself is the usable artifact and
  it produced a concrete review checklist on this issue.

## Rejected or removed

- **Structured Prompt-Driven Development:** removed from the issue. The source
  is an article and no public reusable artifact was tested.
- **LLMs reward expertise:** removed from the issue. Useful argument, but the
  article did not provide a stronger usable artifact than the repo-backed
  alternatives.
- **AI Design Skills:** reconsidered because it was tagged `swipe`. Its planning
  half produced a useful outline from a four-line test brief, but the full skill
  mandates canned visual patterns and tells agents to invent less-rounded fake
  numbers. It remains rejected. A clean planning-only skill could be incubated
  later with attribution.
- **CWC:** source inspected after a historical Keep search. The history scanner
  is interesting, but the product expands into another agent workflow runner
  and remains outside Swipe's current coverage boundary.

## Final editable draft shape

Tools: PilotCut, RawReply, Homebench, Bullshit Detector, and cc-audit.

Workflows: SimpleEnglish, Mole disk audit, agent-skills-eval, context-audit,
and the closing questions.
