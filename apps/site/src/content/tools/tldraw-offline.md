---
name: "tldraw offline"
seoTitle: "tldraw offline: Local AI canvas for coding agents"
headline: "tldraw offline: A local canvas coding agents can edit"
tagline: "Sketch a diagram, then let an agent add data and interactions."
description: "tldraw offline saves whiteboards as local files and lets trusted coding agents add shapes, data, and reusable interactive scripts on macOS, Windows, and Linux."
url: "https://offline.tldraw.com/"
kind: "desktop-app"
platforms: ["macOS", "Windows", "Linux"]
repository: "https://github.com/tldraw/tldraw-offline"
category: "Visual building"
tags: ["whiteboard", "AI canvas", "prototyping"]
status: "early"
firstSeen: 2026-07-29
lastChecked: 2026-07-29
reviewEveryDays: 30
featuredIssues: ["sketch-an-app-with-ai"]
sources:
  - kind: "landing"
    label: "tldraw offline"
    url: "https://offline.tldraw.com/"
    checkedAt: 2026-07-29
  - kind: "repository"
    label: "tldraw offline repository and user guide"
    url: "https://github.com/tldraw/tldraw-offline"
    checkedAt: 2026-07-29
  - kind: "docs"
    label: "tldraw offline user manual"
    url: "https://tldraw.notion.site/User-manual-tldraw-offline-39a3e4c324c080e7b2eacc5afd078e85"
    checkedAt: 2026-07-29
  - kind: "release"
    label: "tldraw offline v1.12.0"
    url: "https://github.com/tldraw/tldraw-offline/releases/tag/v1.12.0"
    checkedAt: 2026-07-29
  - kind: "other"
    label: "Introducing tldraw offline"
    url: "https://tldraw.dev/blog/tldraw-offline"
    checkedAt: 2026-07-29
---

## A whiteboard with a file boundary

tldraw offline is the familiar tldraw canvas packaged as a desktop app. It has
no account or cloud collaboration service. Each document is saved as a local
`.tldraw` file containing the canvas, pages, stored images and video, and any
document script.

That file boundary makes the app useful with local coding agents. Codex,
Claude Code, Pi, or OpenCode can inspect an open canvas, create shapes, import
assets, and add behaviour. You keep editing the same result with normal
drawing tools.

The useful job is not asking an agent to draw a generic flowchart. Sketch the
rough interface or diagram yourself, then ask the agent to make one part
interactive. A product sketch can gain working tabs. A system diagram can read
data and change colour. A presentation can add buttons that move between
states.

## Start with a copy

Download the free app for macOS, Windows, or Linux. macOS ships as a universal
DMG for Apple silicon and Intel. Windows has x64 and Arm64 installers. Linux
has x64 and Arm64 AppImages plus a Debian x64 package.

Create a file, draw the important objects, and save it before giving an agent
access. Work on a duplicate until the agent workflow is familiar.

A focused request is easier to review:

```text
Read the open canvas. Keep every existing shape.
Add a button labelled Show costs.
Clicking it should reveal the three cost notes already on the right.
Do not add network requests or change other pages.
```

Check the canvas by hand and reopen the file before relying on it. The app
keeps recovery copies for crashes, but recovery is not a replacement for a
saved original and a normal backup.

## Agent access reaches the whole open document

The desktop app exposes an authenticated local control API for coding agents.
An authorised agent can read and edit the open document and execute code
against the live tldraw editor.

This is broader than editing a JSON file. Grant access only to an agent you
trust, keep its local token out of logs and repositories, and scope the task to
the document in front of you.

We inspected an official example as an archive without opening it in the app.
It contained a SQLite canvas, metadata, bundled assets, and two JavaScript
files. The metadata identified the main script as agent-authored. This
confirmed the portable file structure without executing the embedded code.

## A shared `.tldraw` file can be a program

Document scripts can listen for events, change shapes, fetch data, and run
again when the file opens. The app asks for consent when it encounters an
unfamiliar script. A script whose digest has already been trusted can run
without another prompt.

Treat a shared `.tldraw` file like a small application:

- get it from someone you trust
- inspect the bundled `script/` files before approving them
- reject unexpected network calls or access to local data
- open it in a disposable account or machine when the source is uncertain
- never pre-trust a script digest just to remove the warning

A normal drawing with no script is much lower risk. The risk arrives when the
file carries code or when an agent is allowed to execute code through the
local API.

## Local does not mean open source

tldraw offline is free and works without an internet connection after
installation. Files remain on your computer unless you move or share them.
The app checks for updates at startup, so it is not entirely silent on the
network when connectivity is available.

The desktop application is not open source. Its public repository contains the
manual, branding, release downloads, and issue tracker rather than the
application source. The underlying tldraw SDK is source available under its
own licence, not MIT.

There is also no built-in multiplayer sync. A `.tldraw` file does not merge
changes made while it is open by another program, sync client, Git operation,
or second computer. Close the document before replacing it externally, then
reopen it.

## Current rough edges

The app is releasing quickly. Open issues currently cover platform-specific
menus, macOS launch failures, window-manager conflicts, and a Windows
screenshot problem in the agent API. Version 1.12.0 is the current release, so
check the issue tracker when installation or agent setup differs from the
manual.

The AI integration also depends on your separate coding agent. Any model
charges, data handling, and file permissions belong to that agent. tldraw
offline does not include a model subscription.

## Alternatives

Excalidraw, draw.io, and Rishah are simpler choices when the main requirement
is an offline whiteboard. They avoid tldraw offline's agent scripting model or
offer a more conventional open-source desktop setup.

Use the browser version of tldraw when collaboration and share links matter
more than local files. Use tldraw offline when the canvas must stay portable
and a trusted coding agent should be able to turn the drawing into a working
artifact.
