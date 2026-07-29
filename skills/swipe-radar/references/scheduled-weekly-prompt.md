Run $swipe-radar in weekly mode.

Research overlooked AI skills, prompts, workflows, tools, experiments, and
business patterns that give founders, marketers, operators, product people, or
developers a concrete move worth swiping.

Use gh-research, hn-get, Keep, direct primary sources, and available personal
research signals. Read the source and safely test the strongest candidates.
Do not select agent orchestrators, multi-agent harnesses, context shells,
generic coding-agent wrappers, or other products whose job is merely to run
agents. Find things people can actually do with AI.

Collect the last seven days of Hacker News through both Radar streams before
topic searches. Inspect a mix from `hackernews-popular.json` and
`hackernews-new.json`. Keep is one signal, not the main feed.

Read the existing `/tools` catalogue. Update or create pages for every
verified useful tool that clears the catalogue threshold, even when it does
not make this week's issue. Use previous issue appearances, meaningful product
updates, search demand, and reader interest as signals for what to recheck.

Run `pnpm swipe radar catalog --json` before selecting tools.
For every new or updated tool page, follow
`skills/swipe-radar/references/tool-page-writing.md`. Read the live landing
page and relevant documentation for apps. For repositories, inspect the
README, agent files, user docs, release history, and relevant source before
writing. A short landing-page summary does not clear the catalogue threshold.

Aim for up to four tools and up to four skills, loops, or workflows. At least
three selected tools should be genuinely new, early, or beta. Never add filler
to reach either limit. Write one `draft: true` canonical Swipe issue, render it
for review, and record the evidence, limitations, and rejected finalists in
the gitignored Radar run directory.

Choose one lead item after the issue is settled. Use it to write a recognisable
`Swipe this:` email subject, a separate web title and description, a
complementary preheader, and a short useful slug.

Keep discovery positioning private. Do not call the public picks overlooked,
new, early, beta, up-and-coming, or things readers will not find elsewhere.
The description should be one simple line about the useful contents. Keep the
preheader between 50 and 90 characters, under 100, and put the most useful
words first because some inboxes show only the first 35.

Before drafting, use $writing-tips and the local trained `blog` profile through
$ai-writer. Follow the Swipe copy standard in
`skills/swipe-radar/references/copy-standard.md`. Keep technical receipts in
the private report. The issue itself must use plain, direct language and show
what a reader can actually do with each pick.

Assume the reader has never used the product and does not know its specialist
vocabulary. Lead with the useful result. Replace jargon with ordinary words
unless the exact term is needed, then explain it immediately.

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

This is an unattended run. Make reasonable editorial decisions and finish with
a review-ready draft and report. Do not commit, push, publish, test-send, create
a broadcast, or modify either production system.

Finish with the structured run result required by the supplied output schema.
Use a short Scheduler-friendly title and message. When a draft is ready,
`nextStep` should be the exact `pnpm swipe issue preview <slug>` command.
