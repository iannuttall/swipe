---
subject: "Swipe this: Let an agent make the first video cut"
preheader: "Find wasted tokens, compare local models, and catch what your agent missed."
title: "Let an AI agent make your first video cut"
description: "Edit video, reclaim disk space, test agent skills, audit context, and check claims before publishing."
pubDate: 2026-08-05
draft: false
---
<Header name="This week's Swipe" />

This week starts with a video editor that lets your agent do the tedious first cut while you keep control of the timeline.

There are also quick ways to draft an email from rough notes, reclaim Mac disk space, test whether a skill helps, and clean up the instructions every session inherits.

<Item id="belt" title="Belt" url="https://inference.sh/belt?utm_source=swipe-md" sponsor="true" summary="Continuity layer for AI agents.">
Give every coding agent the same reusable context.

<Why>
Agents often start each session without the useful context from earlier work. Belt surfaces relevant skills and knowledge as you work, so a good workflow can carry into the next task instead of disappearing with the chat.
</Why>

<Try>
Install Belt in the coding agent you already use. Add one recurring workflow as a skill, then see whether Belt suggests it when a matching task appears in a later session.
</Try>
</Item>

<Item id="pilotcut" title="PilotCut" url="https://www.pilotcut.com/" new="true" summary="Agent-made video rough cuts">
Let an agent rough-cut footage on your Mac.

<Why>
PilotCut is a native Mac editor that lets an agent work on the timeline you already own. It has more than 40 operations, and every proposed cut is named, reversible, and yours to accept or reject.
</Why>

<Try>
Drop in a 20-minute interview and ask for a seven-minute cut that keeps every answer about pricing. Then request a 60-second launch version and compare the proposed edits before accepting either one. The agent does the knife work, but you decide what story survives.
</Try>
</Item>

<Item id="rawreply" title="RawReply" url="https://rawreply.com/" new="true" summary="Emails from rough notes">
Turn rough notes into a direct email draft.

<Why>
RawReply starts with the part that usually stalls an email, a pile of facts and no first sentence. Its public demo turns that mess into a short draft. Signed-in users get separate memory for writing style and editable facts such as roles, projects, decisions, and preferences.
</Why>

<Try>
Paste the messiest notes from a delayed client update, including what changed, one exact number, the decision you need, and the deadline. Ask for calm and firm versions, then steal the stronger opening and rewrite the rest in your own voice. Keep confidential thread history out of it.
</Try>
</Item>

<Item id="homebench" title="Homebench" url="https://github.com/david-g-3654/homebench" new="true" summary="Test local models yourself">
Pick a local model using your own tasks.

<Why>
Public leaderboards cannot tell you which model runs well on your Mac or survives your exact work. Homebench runs the same custom tasks against local models and puts their speed, memory, and failures side by side. You get your own answer instead of somebody else's score.
</Why>

<Try>
Make a five-task “can this replace the expensive model?” pack from work you repeat. Include one exact format and one request where the model should ask for missing information. Run it against three local models, then keep the smallest one whose failures you can live with.
</Try>
</Item>

<Item id="bullshit-detector" title="Bullshit Detector" url="https://github.com/SerhiiKorniienko/bullshit-detector" new="true" summary="Check claims before publishing">
Find the claim a sceptical customer will challenge.

<Why>
Bullshit Detector does not stop at one score for a whole launch post. It breaks the copy into individual claims, searches for evidence, and links every verdict. That helps you find the one sentence a sceptical customer will screenshot.
</Why>

<Try>
Give it your next launch post with the product docs, pricing page, and changelog behind it. Ask it to red-team the three claims most likely to be challenged, then mark each one cite, soften, or delete. Open the evidence yourself before you publish.
</Try>
</Item>

<Item id="cc-audit" title="cc-audit" url="https://github.com/pa-arth/cc-audit" summary="Find wasted Claude Code tokens">
Find what is wasting Claude Code tokens.

<Why>
cc-audit reads local Claude Code history and shows which sessions, models, and always-loaded instructions used the most tokens. It also spots old context carried long after a task changed. The dollar figures are estimates, but the waste pattern is the useful bit.
</Why>

<Try>
Start with its local-only report and check that optional capture is off before using real history. Pick the costliest session and one instruction file it says loads everywhere. Change one habit for a week, then compare the same report again.
</Try>
</Item>

<Item id="simple-english" title="Write like an aircraft manual" url="https://github.com/AminBlg/SimpleEnglish/blob/main/skills/simple-english/SKILL.md" kind="workflow" summary="Aircraft rules for clearer docs">
Give software instructions the aircraft-manual treatment.

<Why>
[ASD-STE100](https://www.asd-ste100.org/STE_faq.html) grew out of aircraft maintenance manuals, where Boeing, Douglas, Lockheed, and European manufacturers all wrote English differently. Its controlled vocabulary gives approved words one meaning so technicians are less likely to guess. SimpleEnglish packages those aviation rules as an agent skill for software docs.
</Why>

<Try>
Feed it a deployment rollback guide and ask it to apply ASD-STE100 without touching commands or error messages. Give the original to one teammate and the rewrite to another. See which one gets a test service back online with fewer questions.
</Try>
</Item>

<Item id="mole-disk-audit" title="Let an agent find Mac clutter" url="https://github.com/tw93/Mole" kind="workflow" summary="Find Mac clutter safely">
Review Mac clutter before deleting anything.

<Why>
Mole is a free, open-source Mac CLI that can inspect disk use, caches, old installers, and forgotten build artifacts. Its analysis and status commands return JSON, which gives an agent something concrete to sort and explain. Destructive commands have dry runs, protected paths, confirmations, and an operation history.
</Why>

<Try>
Install Mole, run `mo analyze --json`, and give the result to your agent. Ask for the five largest safe-looking cleanup targets, why each may exist, and the command that would preview it. Run every destructive command with `--dry-run` yourself and approve deletions one by one.
</Try>
</Item>

<Item id="agent-skills-eval" title="Test whether a skill helps" url="https://github.com/darkrishabh/agent-skills-eval" kind="workflow" summary="Test skills against baseline">
Compare a skill against the same agent without it.

<Why>
It is easy to write a SKILL.md and assume the agent improved. agent-skills-eval runs the same prompts with and without the skill, grades both against the same assertions, and produces a side-by-side HTML report. It works with OpenAI-compatible APIs, including local model servers.
</Why>

<Try>
Take the skill you rely on most and write three cases where the model usually gets something wrong. Run each case with `--baseline`, using the same target and judge models. Keep the skill only if it beats the unassisted model on specific assertions, not because its answer sounds nicer.
</Try>
</Item>

<Item id="context-audit" title="Cut stale agent instructions" url="https://github.com/Neeeophytee/finding-unknowns-skills/blob/main/skills/context-audit/SKILL.md" kind="workflow" summary="Cut instructions that add noise">
Find the rules your agent no longer needs.

<Why>
[Anthropic removed more than 80%](https://claude.com/blog/the-new-rules-of-context-engineering-for-claude-5-generation-models) of Claude Code's system prompt for newer models with no measurable loss on coding evaluations. context-audit applies that idea to your AGENTS.md, skills, hooks, and tool descriptions. It finds conflicts, duplicates, obvious rules, and the real gotchas worth keeping.
</Why>

<Try>
Point it at one repo and ask for a proposal without letting it edit anything. Keep every real gotcha, move task-specific instructions into skills, and delete one obvious duplicate. Compare the before and after line counts, then watch whether the next three sessions behave any worse.
</Try>
</Item>

<Item id="closing-questions" title="Ask the closing questions" url="https://www.reddit.com/r/ClaudeAI/comments/1vbkq6o" kind="workflow" summary="Make agents expose their doubts">
Make the agent review its own blind spots.

<Why>
A saved Reddit habit uses two questions to drag unspoken assumptions into view. Ask what the agent is least confident about, then ask for the biggest thing you have not thought to ask. We tried it on this issue and it caught a muddled RawReply claim plus PilotCut's missing Mac limitation.
</Why>

<Try>
Ask both questions before you accept the work, while the full session is still in context. Turn every concrete answer into something you can verify from a source, test, or diff. Ignore the vague self-critique. The useful output is a final review checklist.
</Try>
</Item>

<ReachOut>
- Found a tool we should see? [Send it over.](mailto:ian@swipe.md?subject=Tool%20for%20Swipe)
- Launching something? [Sponsor an issue.](mailto:ian@swipe.md?subject=Sponsor%20Swipe)
- Built something useful with AI? [Tell us about it.](mailto:ian@swipe.md?subject=Built%20with%20AI)
</ReachOut>

<Disclosure>
**Disclosure:** Our picks are editorially independent. Each one has to give you something useful to swipe. Sponsors are labelled and never reviewed for pay.
</Disclosure>
