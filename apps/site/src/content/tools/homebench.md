---
name: "Homebench"
seoTitle: "Homebench local LLM benchmark for your own tasks"
headline: "Homebench: Pick a local AI model using your own work"
tagline: "Compare local models on speed, memory, and tasks you care about."
description: "Homebench runs repeatable speed and quality checks against local language models, including custom task packs in JSON or YAML."
url: "https://github.com/david-g-3654/homebench"
kind: "repository"
platforms: ["macOS", "Linux", "Windows"]
repository: "https://github.com/david-g-3654/homebench"
category: "Local AI"
tags: ["local models", "benchmarks", "evaluation"]
status: "early"
firstSeen: 2026-08-04
lastChecked: 2026-08-04
reviewEveryDays: 30
featuredIssues: ["agent-video-rough-cut"]
sources:
  - kind: "repository"
    label: "Homebench repository"
    url: "https://github.com/david-g-3654/homebench"
    checkedAt: 2026-08-04
  - kind: "readme"
    label: "Homebench README and usage guide"
    url: "https://github.com/david-g-3654/homebench/blob/main/README.md"
    checkedAt: 2026-08-04
  - kind: "release"
    label: "Homebench releases"
    url: "https://github.com/david-g-3654/homebench/releases"
    checkedAt: 2026-08-04
  - kind: "docs"
    label: "Custom task pack example"
    url: "https://github.com/david-g-3654/homebench/blob/main/examples/sample_pack.json"
    checkedAt: 2026-08-04
---

## Compare models on the machine that will run them

Public model leaderboards cannot tell you how a model will perform on your
laptop, with your local server, on your actual task. Homebench runs the same
checks against models served by Ollama, LM Studio, llama.cpp, vLLM, or another
OpenAI-compatible local endpoint.

It records generation speed, time to the first token, memory use when that is
available, and task quality. The default quality suite is small and quick. A
full run contains 31 tasks, while the fast default uses eight.

The more useful feature is a custom task pack. You can replace the generic
questions with a few examples from your own work and grade exact requirements
without writing Python. This turns Homebench from a leaderboard copier into a
local buying decision for the models that fit your hardware.

## Make a five-task pack from real work

Install Homebench with Python 3.9 or newer. `pipx` keeps the command isolated:

```sh
pipx install homebench
```

Make a JSON file with five small tasks that represent what you ask a local
model to do. For a support workflow, include one classification, one structured
JSON response, one short rewrite, one policy question, and one deliberately
ambiguous request that the model must not guess about.

Then run the same pack against two or three models:

```sh
homebench --tasks support-tasks.json --models model-a,model-b,model-c
```

Use deterministic graders for exact formats, required phrases, and numeric
answers. Homebench also supports an AI judge for open-ended work, but that adds
another model's judgment to the result. Read those answers yourself before you
pick a winner.

The included sample pack loaded successfully in an isolated test and showed
four tasks with deterministic and AI-judge grading. No language model was run
in that test, so it confirms the task-pack setup rather than any performance
claim.

## Saved runs, caching, and network use

Homebench stores runs under `~/.homebench/runs` by default. Use `--no-save` for
a disposable comparison or set `HOMEBENCH_HOME` to keep the files in a project
directory. Quality responses are cached, which makes repeated grading faster.
Use `--refresh-cache` when a changed model or server setting must produce new
answers.

Local backends do not need a cloud API key. The normal benchmark talks to the
model server on your own machine. The optional `fit --online` command contacts
Hugging Face to refresh a model catalogue. Stay with the built-in catalogue if
you want the sizing step to remain offline.

The `fit` command estimates which models can fit in available memory. Those
sizes include estimated weights, working memory, and context overhead. Treat
"fits" as a shortlist, not a guarantee, because quantisation and server setup
change the real requirement.

## Read the result as a local comparison

Homebench's built-in suite is English-only and deliberately small. Its memory
figure is approximate, and speed changes with current machine load. A high
score does not prove that a model will handle a long conversation or your
private business rules.

Run each candidate under the same conditions. Close heavy apps, use the same
context size, and record the model tag or file. Then inspect failures alongside
the total score. One repeated formatting failure can matter more than a small
speed difference.

The project is young and released several versions in its first days. Pin the
version for a decision you may need to reproduce, and save the task pack beside
your notes.

## When Homebench fits

Choose Homebench when you already run local models and want a quick comparison
that includes your own work. It is useful for choosing a default model for one
repeatable job, or checking whether a smaller model is good enough.

Use a larger evaluation framework when you need research-grade datasets,
statistical analysis, or a shared public leaderboard. For an ordinary local
decision, a small custom pack that you can read is often the more honest test.
