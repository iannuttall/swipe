---
name: "marka.md"
seoTitle: "marka.md: Local Markdown editor for AI context"
headline: "marka.md: A local Markdown editor for AI context"
tagline: "Bundle selected Markdown notes for any AI tool."
description: "marka.md is a local desktop editor that turns selected Markdown files into one readable context bundle with relative paths before you paste it into an AI tool."
icon: "/tools/icons/marka-md.png"
url: "https://markamd.vercel.app/"
kind: "desktop-app"
platforms: ["macOS", "Windows", "Linux"]
repository: "https://github.com/mattenarle10/markamd"
category: "Writing and notes"
tags: ["Markdown", "local-first", "AI context"]
status: "early"
firstSeen: 2026-07-29
lastChecked: 2026-07-29
reviewEveryDays: 60
featuredIssues: ["sketch-an-app-with-ai"]
sources:
  - kind: "landing"
    label: "marka.md website"
    url: "https://markamd.vercel.app/"
    checkedAt: 2026-07-29
  - kind: "repository"
    label: "marka.md source code and README"
    url: "https://github.com/mattenarle10/markamd"
    checkedAt: 2026-07-29
  - kind: "release"
    label: "marka.md v1.7.1"
    url: "https://github.com/mattenarle10/markamd/releases/tag/v1.7.1"
    checkedAt: 2026-07-29
  - kind: "docs"
    label: "marka.md privacy notice"
    url: "https://markamd.vercel.app/privacy"
    checkedAt: 2026-07-29
---

## What marka.md does

marka.md is a desktop Markdown editor built around one handoff: choose a few
local notes, combine them into plain text, inspect the result, and paste it
into the AI tool you already use.

It does not include an AI model, chat window, or cloud knowledge base. Your
notes stay as ordinary `.md` files. The editor adds tabs, live preview, search,
favourites, CSV and media previews, Mermaid diagrams, PDF export, and a context
tray.

The context tray is the reason to choose it over a basic text editor. You can
stage the brief, research notes, and constraints for one job without handing an
agent the rest of your notes folder.

## Build a small context bundle

Open a folder with `Cmd+Shift+O` on macOS or `Ctrl+Shift+O` on Windows and
Linux. In the sidebar, stage only the files needed for the current task.

The tray shows the number of files and an estimated token count. Choose
**copy context bundle** from the command palette when the selection is ready.
The copied text starts with `# context bundle`, followed by file markers in a
simple format:

```md
<!-- file: research/customer-notes.md -->

...

<!-- file: brief.md -->

...
```

Relative path comments preserve useful structure without inventing a custom
archive format. You can paste the bundle into Claude, ChatGPT, Gemini, a local
model, or any agent that accepts text.

We inspected the bundling source and its tests. Selected files are read in
order, trimmed, labelled with relative paths, and joined as plain text. The app
does not execute those Markdown files during the handoff.

## Install it

marka.md is free, open source, and MIT licensed. There is no paid tier or
account.

On macOS install the notarised build with Homebrew:

```sh
brew install --cask mattenarle10/tap/marka-md
```

The releases also provide separate Apple silicon and Intel disk images.
Windows 10 and newer gets an x64 installer. That installer is currently
unsigned, so Windows SmartScreen may show a warning. Linux x86_64 builds are
available as AppImage, Debian, and RPM packages.

Version 1.7.1 added quick previews for images, PDFs, media, text, code, and
office documents. It also improved large-folder watching and added app-wide
zoom. Releases have been frequent, so check the changelog if a platform problem
appears after an update.

## Privacy boundaries

The desktop app has no account, telemetry, or cloud sync. Markdown files stay
on disk until you save them, and a context bundle reaches the clipboard only
when you choose to copy it. The project website uses cookieless Vercel Speed
Insights, but that is separate from the desktop app.

Two features still make network requests. The signed updater checks for new
releases, and PlantUML previews use `plantuml.com`. PlantUML rendering is
explicit rather than automatic, but choosing it sends the encoded diagram to
that service. Mermaid previews render locally.

The bundle itself is only as private as the selection. marka.md does not scan
for API keys, passwords, customer data, or hidden instructions. Read the copied
text before pasting it into a model.

## Why the token count is only a guide

marka.md estimates one token for every four characters. That is useful for
spotting a bundle that is obviously too large, but it is not a tokenizer for a
specific model.

Different models split text differently. Code, tables, non-English text, and
long file paths can make the estimate less accurate. Use the receiving model's
own counter when a hard context limit matters.

The current context handoff also has one format and one destination: plain text
on the clipboard. There is no direct send button, per-model budget, automatic
retrieval, or XML preset yet.

## When it fits

marka.md works well for people who already keep project knowledge in Markdown
and want a visible selection step before involving AI. It is also a capable
small editor when no AI handoff is needed.

Use Obsidian or Zettlr when backlinks, plugins, citations, and a large knowledge
base matter more. Use Typora, iA Writer, or a code editor when the main job is
writing one document. Use a retrieval system when thousands of notes need
search and ranking rather than manual selection.

Choose marka.md when a few source files should become one transparent,
reviewable prompt.
