# Swipe editorial contract

## Position

Swipe is a weekly newsletter for founders, marketers, operators, product
people, and developers who use AI to get real work done.

It is not:

- an AI news digest;
- a trending-tools list;
- model or funding coverage;
- a generic productivity roundup;
- coverage of agent harnesses, orchestrators, context shells, or generic
  coding-agent wrappers.

Radar should find useful things early, before every AI newsletter repeats them.
It covers what people can do with AI, not another shell for running agents.

“Early” describes discovery, not a seven-day publication window. Older tools
and workflows qualify when Swipe has never considered them and the sources are
still current. A previously seen candidate needs a meaningful change, a new
use, better evidence, direct testing, or Ian's explicit feedback before it
returns to the shortlist.

## A publishable candidate

Every item needs:

1. **A real problem** — a job the reader already has.
2. **A non-obvious move** — more than “use AI for this”.
3. **Reuse** — a prompt, skill, workflow, technique, tool, experiment, or
   business pattern the reader can adapt.
4. **A receipt** — a test, result, artifact, example, or credible primary-source
   evidence.
5. **A useful reason** — a clear explanation of why the move matters.
6. **One transferable move** — something the reader can apply to their own
   work or business this week.
7. **A matching source** — the primary source explicitly teaches,
   demonstrates, or argues for the exact move in the newsletter.

The natural reader reaction should be: “we can swipe that.”

Usable artifacts outrank commentary. Prefer a tool, repository, skill, prompt,
or working example that the reader can try now, especially when it is free,
open source, locally runnable, or has a meaningful free path. A saved article
is normally a source for research. If its method deserves a reusable artifact,
incubate and test that artifact before proposing it for publication.

## Kill list

Reject:

- model releases, funding, and industry gossip;
- already-saturated tools without a fresh workflow;
- big familiar products unless the specific feature or use is still
  overlooked;
- vague productivity advice;
- consumer novelty with no reusable move;
- bare links with no explanation;
- standalone articles when the useful move has not been packaged into
  something a reader can actually try;
- thin skills or CLIs created only to make an article look like a product;
- products whose useful result is hidden behind payment, a waitlist, or a
  crippled demo;
- agent orchestrators, multi-agent harnesses, generic coding-agent wrappers,
  context shells, and agent runners, even when technically novel;
- claims that cannot be checked safely;
- workflows inferred from a source that does not actually teach them;
- general business stories with no reusable AI-agent step;
- filler included only to hit a fixed item count.

## Issue shape

The review-ready issue shape is:

- five tools, with at least three genuinely new, early, or beta;
- five reusable skills, loops, or workflows that a reader can perform
  with an AI agent.

Do not lower the quality bar to fill a slot. Keep researching when the first
pass is short. If a full source pass cannot support 5 + 5, report `no_draft`
and document the gap instead of marking a partial issue ready. “New” is an
editorial proxy for early, under-shared, or still-settling work. It does not
require a beta label. A new marker is independent from whether an item is a
tool or workflow.

Each final item must answer:

- What is it?
- Why would the reader use it?
- What can the reader make, save, sell, fix, or avoid?
- What exact move can they try in their own work or business?

Radar must still research limitations and failure modes before selecting an
item. Record them in the private report and reject anything unsafe or
misleading. Do not force a negative paragraph into every published pick.

Technical test details that only prove Radar did the work belong in the
private report. Technical details that explain the product or useful move can
stay, with a plain-English explanation of why they matter.

## Source integrity

The linked source and the newsletter claim must match. For each finalist,
record:

- the exact move proposed for the issue;
- the primary-source file, section, or short excerpt that supports it;
- what Radar tested;
- whether the test used a real product or a synthetic fixture.

A test can confirm or challenge a source claim. It cannot turn an unrelated
article into evidence for a workflow Radar invented.

Use “we” only for actions Radar genuinely performed. Do not describe changes
to an invented sample as though Swipe improved a real app, campaign, or
business.

## Source hierarchy

Prefer:

1. direct testing and Ian's own work;
2. primary documentation, repositories, papers, and author posts;
3. detailed practitioner reports;
4. Hacker News or GitHub discussion as supporting criticism;
5. secondary roundups only as discovery leads.

Popularity is not proof. Low visibility plus a strong reusable move is the
Radar advantage.

## Catalogue threshold

The public tool catalogue is default-in while the weekly issue keeps a high
editorial threshold. Every distinct, usable app, CLI, repository, or agent
skill that reaches source inspection gets a verified `/tools` page, even when
it is narrow or misses the week's five picks.

Reject only duplicates, unusable or inaccessible artefacts, unsafe or
deceptive products, dead releases with no remaining use, serious negative
evidence, or candidates whose central job cannot be verified. Record which
test failed. Search traffic, Hacker News attention, reader submissions, votes,
previous coverage, and product updates decide what to enrich or reconsider;
they never replace primary-source checks.
