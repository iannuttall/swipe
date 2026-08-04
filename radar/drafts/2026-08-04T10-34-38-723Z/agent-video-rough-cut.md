---
subject: "Swipe this: Let an agent make the first video cut"
preheader: "Compare local models, check launch claims, and write clearer agent briefs."
title: "Let an AI agent make your first video cut"
description: "Edit videos, draft emails, compare local models, check claims, and give agents better instructions."
pubDate: 2026-08-04
draft: true
---
<Header name="This week's Swipe" />

This week starts with a video editor that lets your agent do the tedious first cut while you keep control of the timeline.

There are also quick ways to draft an email from rough notes, choose a local model, check a launch claim, and give agents clearer instructions.

<Item id="pilotcut" title="PilotCut" url="https://www.pilotcut.com/" new="true" summary="Agent-made video rough cuts">
Let an agent make your first video cut.

<Why>
PilotCut gives common AI agents more than 40 editing tools inside a native Mac app. Each proposed timeline change is named, reversible, and yours to accept or reject.
</Why>

<Try>
Import one talking-head video and ask the agent to remove false starts and pauses longer than two seconds. Tell it the target length and what must stay untouched. Watch the full cut before exporting because good pacing still needs your judgment.
</Try>
</Item>

<Item id="rawreply" title="RawReply" url="https://rawreply.com/" new="true" summary="Emails from rough notes">
Turn rough notes into a direct email draft.

<Why>
RawReply turns rough facts into a useful message without needing a polished prompt. Its signed-in version can remember editable facts about how you write for later drafts.
</Why>

<Try>
Paste five bullets from a client update into the public demo. Include the exact date and number, then state what you need from the reader. Check those details before sending, but keep confidential thread history out of the prompt.
</Try>
</Item>

<Item id="homebench" title="Homebench" url="https://github.com/david-g-3654/homebench" new="true" summary="Test local models yourself">
Pick a local model using your own tasks.

<Why>
Homebench compares local models on speed, first response time, memory, and task quality. You can replace its small built-in test with a JSON file containing work you actually do.
</Why>

<Try>
Start with five tasks from a repeated job, including one exact format and one case where the model must ask a question. The same pack can then run against three models on your machine. Choose the fastest acceptable model only after you read its failures.
</Try>
</Item>

<Item id="bullshit-detector" title="Bullshit Detector" url="https://github.com/SerhiiKorniienko/bullshit-detector" new="true" summary="Check claims before publishing">
Check every claim before publishing your next draft.

<Why>
This agent skill splits a draft, article, video, or PDF into individual claims and searches for evidence. Its report links every verdict so you can inspect the source instead of trusting the score.
</Why>

<Try>
Give it one launch post and the primary documents behind your strongest claims. Ask which statements a sceptical customer would challenge first. Follow every important link yourself and leave private figures unverified unless you can supply evidence.
</Try>
</Item>

<Item id="simple-english" title="Write instructions in Simple English" url="https://github.com/AminBlg/SimpleEnglish/blob/main/skills/simple-english/SKILL.md" kind="workflow" summary="Clearer technical instructions first">
Make technical instructions clear on the first read.

<Why>
SimpleEnglish gives an agent firm rules for short technical writing. It keeps one instruction in each sentence and puts conditions before commands. It is made for runbooks and documentation rather than marketing copy.
</Why>

<Try>
Give the skill one troubleshooting section that support customers regularly misread. Ask for sentences under 20 words without letting it change commands or quoted errors. Then have a teammate follow the new steps once without extra help.
</Try>
</Item>

<Item id="version-the-brief" title="Version the build brief" url="https://martinfowler.com/articles/structured-prompt-driven/" kind="workflow" summary="Keep briefs beside code">
Keep the brief beside the code.

<Why>
Structured Prompt-Driven Development treats the agent brief as a maintained project file. The brief holds business rules and tests. It also records the hard limits that future changes must preserve.
</Why>

<Try>
Before your next feature, ask the agent to write a one-page build brief and stop. Review its assumptions and forbidden changes before code starts. Keep later requirement changes in that brief so the next code diff has the same source of truth.
</Try>
</Item>

<Item id="expert-steering" title="Steer with your expertise" url="https://www.seangoedecke.com/llms-reward-expertise/" kind="workflow" summary="Put expertise in loop">
Make your expertise part of the agent loop.

<Why>
Experienced users get more from the same model because they notice odd output, challenge easy answers, and suggest better routes. The useful input is the judgment you earned before opening the chat.
</Why>

<Try>
Use an agent on one task you know well and interrupt it at every weak assumption. Explain the existing practice and offer one better route. Ask what evidence would change its plan, then save the best corrections for the next run.
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
