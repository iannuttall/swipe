Run $swipe-radar in ians-list-launch mode.

Research and draft the first canonical Swipe issue using overlooked AI skills,
prompts, workflows, tools, experiments, and business patterns. Use
gh-research, hn-get, Keep, direct primary sources, and available personal
research signals. Read the source and safely test the strongest candidates.
Do not select agent orchestrators, multi-agent harnesses, context shells,
generic coding-agent wrappers, or other products whose job is merely to run
agents. Find things people can actually do with AI.

Prefer usable tools, repositories, skills, prompts, and working examples over
standalone blog posts. Prefer free, open-source, locally runnable, or genuinely
useful free-tier candidates. Run the Keep queues tagged `swipe` and `ianslist`
before general Keep searches; treat untagged mobile shares and `pluck` saves as
ordinary leads rather than editorial endorsements.

If an article contains a reusable method with no good existing artifact,
follow `skills/swipe-radar/references/article-incubation.md` and build the
smallest useful local skill, prompt, or CLI. Do not create a remote repository,
publish a package, push it, or include the unpublished artifact in the public
issue. Leave it for Ian to review and approve.

Collect the last seven days of Hacker News through both Radar streams before
topic searches. Inspect a mix from `hackernews-popular.json` and
`hackernews-new.json`. Keep is one signal, not the main feed.

The seven-day feeds are the fresh pass, not the discovery boundary. Also run
the archive pass from the skill: GitHub skills across 730 days, three to five
five-year Hacker News problem searches, and three to five whole-library Keep
searches without `--since`. Deduplicate canonical URLs against previous Radar
candidate snapshots, the tool catalogue, and past issues before deep research.
An older item is eligible when Swipe has never inspected it. Vary historical
queries between runs so the same top results do not become a permanent feed.

Read the existing `/tools` catalogue. Every distinct, usable app, CLI,
repository, or agent skill that reaches source inspection must end this run as
a created or updated page, a documented duplicate of an existing canonical
page, or a rejection tied to an exact catalogue exclusion test. Catalogue
eligibility does not depend on making the launch issue.

Run `pnpm swipe radar catalog --json` before selecting tools.
For every new or updated tool page, follow
`skills/swipe-radar/references/tool-page-writing.md`. Read the live landing
page and relevant documentation for apps. For repositories, inspect the
README, agent files, user docs, release history, and relevant source before
writing.

Find five tools and five skills, loops, or workflows. At least three selected
tools should be genuinely new, early, or beta. Keep researching when the first
pass is short and never add filler. If a full source pass cannot support all
ten items, return `no_draft` and document the missing slots and rejected
finalists instead of marking a partial issue ready. Otherwise write one
`draft: true` canonical Swipe issue and render it for review.

Maintain `notes/radar/<YYYY-MM-DD>/candidates.md` as you research. Include
every named candidate that reaches source inspection, not only finalists. For
each one record its verdict, every exact source URL opened, what each source
supports, what was tested, the result, limitations, and the specific reason it
was selected or discarded. Follow
`skills/swipe-radar/references/candidate-ledger.md`. Do not replace discarded
names with a vague grouped summary.

Choose one lead item after the issue is settled. Use it to write a recognisable
`Swipe this:` email subject, a separate web title and description, a
complementary preheader, and a short useful slug.

Keep discovery positioning private. Do not call the public picks overlooked,
new, early, beta, up-and-coming, or things readers will not find elsewhere.
The description should be one simple line about the useful contents. Keep the
preheader between 50 and 90 characters, under 100, and put the useful words
first because some inboxes show only the first 35.

Before drafting, use $writing-tips and the local trained `blog` profile through
$ai-writer. Follow the Swipe copy standard in
`skills/swipe-radar/references/copy-standard.md`. Keep technical receipts in
the private report. The issue itself must use plain, direct language and show
what a reader can actually do with each pick.

Assume the reader has never used the product and does not know its specialist
vocabulary. Lead with the useful result. Replace jargon with ordinary words
unless the exact term is needed, then explain it immediately.

Write every selected item with one plain description sentence of 5 to 12 words
that stays on one standard email line, two or three short `<Why>` sentences,
and two or three short `<Try>` sentences that give the reader one specific
task or mini-workflow. Add a separate four-to-five-word `summary` for the
contents list. Do not write `<Like>` or
`<Dislike>` blocks and do not force a negative paragraph into the issue.
Research limitations privately and use them to reject weak candidates or add a
necessary safety instruction to the practical example.

Read the most recent approved Swipe issues before drafting and use Ian's final
edits as voice examples. Keep at least one memorable, source-backed specific in
every `<Why>`. Make every `<Try>` produce a visible output, comparison,
decision, or reveal. Do not flatten an interesting origin, mechanism, number,
or test result into a generic product summary.

Prioritize early or overlooked products and uses that other newsletters have
not already repeated. Every selected item needs one practical move a reader
can apply to their own work or business. A familiar brand or ordinary
developer tool does not qualify without a genuinely novel use.

Skills, loops, and workflows must be things a reader can do with an AI agent.
For every item, verify that the linked primary source explicitly supports the
exact move in the draft. A local test can verify a claim but cannot invent a
new lesson for an unrelated source. Use “we” only for actions the run actually
performed, and never present a synthetic fixture as a real product outcome.
Summarize the whole source before choosing the move. Do not turn one useful
sentence into the source's main argument.

Then prepare the Ian's List delivery artifact described by the skill: the same
issue Markdown plus a short first-person intro from Ian explaining the move to
Swipe and a recipient-specific Swipe double-opt-in CTA. The launch edition is
for Ian's List only. Do not create a Swipe broadcast.

This is an unattended preparation run. Record evidence, limitations, rejected
finalists, renderer compatibility, and invite-support blockers in the
gitignored Radar run directory. Do not commit, push, publish, test-send, create
a broadcast, or modify either production system.

Finish with the structured run result required by the supplied output schema.
Use a short Scheduler-friendly title and message. When a draft is ready,
`nextStep` should be the exact command Ian should run to preview it.
