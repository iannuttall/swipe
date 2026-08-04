---
name: "PilotCut"
seoTitle: "PilotCut AI video editor for agent-made rough cuts"
headline: "PilotCut: Let an AI agent make the first video cut"
tagline: "Give an agent a bounded edit, then review every timeline change."
description: "PilotCut is a Mac video editor that lets AI agents propose reversible cuts, captions, B-roll, and other timeline changes."
url: "https://www.pilotcut.com/"
kind: "desktop-app"
platforms: ["macOS"]
category: "Video"
tags: ["video editing", "AI agents", "rough cuts"]
status: "early"
firstSeen: 2026-08-04
lastChecked: 2026-08-04
reviewEveryDays: 30
featuredIssues: ["agent-video-rough-cut"]
sources:
  - kind: "landing"
    label: "PilotCut landing page"
    url: "https://www.pilotcut.com/"
    checkedAt: 2026-08-04
  - kind: "docs"
    label: "Editing videos with AI agents"
    url: "https://www.pilotcut.com/blog/edit-videos-with-ai-agents"
    checkedAt: 2026-08-04
  - kind: "release"
    label: "PilotCut changelog"
    url: "https://www.pilotcut.com/changelog"
    checkedAt: 2026-08-04
  - kind: "docs"
    label: "PilotCut privacy policy"
    url: "https://www.pilotcut.com/privacy"
    checkedAt: 2026-08-04
---

## Make the first cut without giving up the timeline

PilotCut is a native Mac video editor that an AI agent can operate through its
own editing tools. Claude Code, Codex, Gemini CLI, and other compatible agents
can inspect the project and propose named changes to the timeline.

Those changes are not hidden inside a chat. You see them as a plan and can
accept or reject each one. Applied changes stay undoable. You can also make
normal manual edits in the same timeline.

This makes PilotCut useful for the mechanical first pass on a talking-head
video, screen recording, podcast clip, or product demo. The agent can remove
filler words, tighten long pauses, add captions, place B-roll, and pull shorter
clips from a longer recording. You keep the final pacing and creative choices.

## Give it one bounded editing job

Start with a narrow request instead of asking the agent to finish the whole
video. A useful brief names the audience, target length, one editing goal, and
anything that must stay untouched.

For a five-minute product demo, try this:

> Make a first cut under four minutes. Remove false starts and pauses longer
> than two seconds. Keep every explanation of the pricing screen. Do not add
> music or change the opening title.

Review the proposed edits before you apply them. Then watch the full result
once without stopping. A technically valid cut can still remove a useful
breath, rush a joke, or weaken the transition between two ideas.

This workflow is different from a video generator. PilotCut edits footage that
you already recorded. It also differs from an automatic cleanup button because
you can discuss the plan with the agent and keep the changes you want.

## Setup, agents, and supported files

PilotCut is currently a macOS app. Install it, import your footage, and connect
the agent you already use. The app exposes more than 40 editing tools through
MCP, a standard way for an agent to call another app's functions.

The current site lists Claude Code, Codex, Gemini CLI, local models, and direct
OpenAI or Anthropic connections. Supported media follows the formats that
macOS can read. Recent releases added a caption editor, SRT and VTT subtitle
files, a stock library, and local speech transcription.

The app is currently free. The site does not yet publish the later paid price,
so treat the free access as temporary rather than part of a final pricing plan.

## What stays local and what can leave the Mac

Original footage, proxy files, project data, and exports stay on the Mac. The
agent sees only the project material that you choose to expose through its
tools.

That does not mean every AI step is offline. Prompts, transcript text, and
selected frames can go to the model provider you connect. A local model keeps
that part on your machine. A cloud model follows its own storage and privacy
terms.

PilotCut's public privacy policy was last updated before the current editing
product took shape and still describes some older screen-recording behaviour.
Use the current product documentation for the editing flow, and avoid private
footage until the provider boundary is clear enough for your work.

## When PilotCut fits

Choose PilotCut when you work on a Mac, already have footage, and want an agent
to handle repetitive timeline work without hiding the edits. It is especially
useful when a rough cut is easy to describe but tedious to make.

Choose a mature editor such as Final Cut Pro, DaVinci Resolve, or Premiere Pro
when you need a larger effects system, established team workflows, or broad
hardware support. PilotCut is moving quickly, so keep the original files and
test one real project before you depend on it for deadline work.
