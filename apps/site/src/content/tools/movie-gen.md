---
name: "movie-gen"
seoTitle: "movie-gen workflow for making AI short films"
headline: "movie-gen: Make a cheap animatic before AI video"
tagline: "Fix story and timing before paying to generate every clip."
description: "movie-gen is an open-source Claude Code workflow for building AI short films from character anchors, still-frame animatics, generated clips, voices, and ffmpeg assembly."
url: "https://github.com/dawndrain/movie-gen"
kind: "repository"
platforms: ["Claude Code", "Python", "ffmpeg"]
repository: "https://github.com/dawndrain/movie-gen"
category: "AI video"
tags: ["filmmaking", "animatic", "video generation"]
status: "early"
firstSeen: 2026-07-29
lastChecked: 2026-08-04
reviewEveryDays: 60
featuredIssues: ["sketch-an-app-with-ai"]
sources:
  - kind: "repository"
    label: "movie-gen source and README"
    url: "https://github.com/dawndrain/movie-gen"
    checkedAt: 2026-08-04
  - kind: "docs"
    label: "movie-gen production lessons"
    url: "https://github.com/dawndrain/movie-gen/blob/main/MOVIE_LESSONS.md"
    checkedAt: 2026-08-04
---

## Make the whole rough cut from stills first

movie-gen documents and supplies scripts for a short-film pipeline driven from
Claude Code. It starts with consistent character images and scene frames, casts
voices, cuts a still-image animatic, generates video clips, then assembles and
reviews the film with ffmpeg and a browser storyboard.

The most reusable move is the animatic. Hold each scene's start frame for its
planned duration, add draft speech and music, and review the complete story
before generating expensive clips. The project's own logs report that a draft
voice line cost far less than a video clip, although provider prices can change.

This is a working repository, not a one-command video app. It expects paid
Higgsfield and ElevenLabs access, optional Gemini access, Claude Code, ffmpeg,
and active direction. Generated footage can still regress between takes, so
keep previous versions and use the cheapest fix that addresses each note.
