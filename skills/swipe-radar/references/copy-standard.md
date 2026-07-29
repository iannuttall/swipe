# Swipe copy standard

The research can be technical. The newsletter copy cannot read like a test
report.

Readers care about what a tool helps them do. Put commands, file formats,
status codes, implementation details, and test methodology in the private
Radar report when they only prove the test happened. Bring SQL, JSON, APIs,
file formats, or other technical details into the issue when the product or
useful lesson actually depends on them. Explain what they let the reader do.

Use the `writing-tips` skill for every issue. Use the local trained `blog`
profile through the `ai-writer` CLI for direct explanation, concrete examples,
varied rhythm, and human judgment. Do not copy its old subject matter, article
length, or dated vocabulary.

## Give each headline one job

Choose one lead item after the final issue mix is settled. Pick the item with
the strongest practical result, broadest usefulness, and clearest evidence.
Do not title the issue after an internal research category or the number of
items.

For now use these frontmatter rules:

- `subject` is the email subject. Start with `Swipe this:` and finish with the
  lead result. Aim for 35 to 60 characters.
- `preheader` is the inbox preview text. Add two or three other useful finds
  without repeating the subject. Aim for 50 to 90 characters, keep it under
  100, and put the most useful words inside the first 35 because some inboxes
  truncate that early.
- `title` is the standalone web headline. It can explain the lead in a little
  more detail and does not need the `Swipe this:` prefix.
- `description` is one simple line for the archive, search results, social
  cards, and visible page introduction. Describe what the reader will get in
  roughly 70 to 140 characters.
- The filename is the public slug. Use three to seven ordinary words that
  describe the lead result.

“Overlooked”, “new”, “early”, “beta”, “up-and-coming”, and “things you have
not seen elsewhere” are internal discovery filters. Do not put them in the
subject, preheader, title, description, or issue introduction. Do not describe
the number or category of items either. Public metadata should only state the
useful things inside.

The preheader range is deliberately conservative. Campaign Monitor notes that
some clients show as little as
[35 characters](https://help.campaignmonitor.com/articles/Knowledge/preheader-text),
SendGrid recommends
[50 to 90](https://sendgrid.com/en-us/blog/perfecting-your-email-preview-text),
and Litmus recommends staying
[under 90](https://www.litmus.com/blog/the-ultimate-guide-to-preview-text-support).
There is no universal display length, so front-loading the useful words matters
more than filling the range.

Bad:

> Subject: Four AI tools that leave you with something useful
>
> Slug: `editable-ai-artifacts`

Good:

> Subject: Swipe this: Sketch an app, then let AI build it
>
> Preheader: Instant web hosting, cheaper AI video, customer research, and more.
>
> Title: Sketch an app, then let AI build it on the same page
>
> Description: Sketch apps, share demos, research customers, and improve the
> quality of what AI agents build.
>
> Slug: `sketch-an-app-with-ai`

The lead must be genuinely present in the issue and the wording must match the
source. Avoid `best`, `ultimate`, and other claims Radar cannot prove.

## Write for the reader

Every item should let a non-developer answer four questions on the first read:

1. What is this?
2. When would I use it?
3. What could I make, save, sell, fix, or avoid?
4. What should I watch out for?

Write to founders, marketers, operators, product people, and curious
non-developers. Developers can handle plain English too. A developer tool can
still qualify, but it needs a novel use or lesson beyond the normal reason
people already know it.

## Keep the contents short

- Tool titles are product names.
- Workflow titles use two to five words.
- Descriptions use three to six ordinary words.
- A description says what the thing is or does. It does not classify the
  research.

Examples:

- Bad: `Disposable links for artifacts.`
- Good: `Free instant web hosting for agents.`
- Bad: `Local AI context bundles.`
- Good: `Local-first Markdown editor.`
- Bad: `Storyboard before spending generation credits.`
- Good: `Storyboard first.`
- Bad: `Unknown-unknown discovery protocol.`
- Good: `Find the blind spots.`

## Lead with the useful move

`<Like>` should take two to four short sentences. Start with a practical use,
then give one concrete example. Explain the result in words the reader would
use when telling a friend.

Bad:

> We published a plain HTML receipt with no account or credentials. It
> returned a live URL and served the expected content with a 200 response.

Good:

> Give an agent a report, mockup, or small web page and it gives you a link you
> can share. We used it without creating an account. This beats asking a client
> to download code just to see a quick demo.

Bad:

> Against a synthetic two-model transcript, cc-audit calculated the expected
> total. Point `--root` at a fixture and add `--json`.

Good:

> See how much your Claude Code sessions cost and which jobs used the most
> tokens. It is useful when a small experiment quietly turns into a large bill.

## Make the limitation useful

`<Dislike>` should take one or two short sentences. Say what could go wrong and
what the reader should do about it.

Bad:

> Version 0.4.1 accepted a made-up chart property without an error.

Good:

> It is still early and can ignore options it does not understand. Check the
> chart against your source data before sharing it.

## Technical detail has to earn its place

Start with the result the reader wants. Keep a specialist term only when they
need it to use the product. Explain it immediately in ordinary words. If a
plain substitute works, use it.

Bad:

> The test returned a 200 response and stored the result in SQLite.

Good:

> Your work stays in a local SQLite file, so you can back it up or move it
> without creating an account.

Bad:

> Build a cheap animatic from still frames.

Good:

> Make a rough video first so you can fix the story before paying for the final
> clips.

Bad:

> Create a semantic specification for renderer portability.

Good:

> Describe the chart once, then choose how it looks later.

Terms such as SQL, JSON, API, MCP, file-format names, or command flags can stay
when the product depends on them. Terms such as artifact, fixture, synthetic,
semantic spec, upstream, implementation, status code, or animatic usually
belong in the private test receipt. Never assume the reader knows a product's
specialist vocabulary.

## Capture the source's main point

Read the whole primary source before turning it into a workflow. Write its main
argument in one plain sentence in `candidates.md`, then compare the proposed
item with that sentence.

Do not promote one memorable line or final paragraph into the lesson of an
otherwise different article. A supporting detail can appear in the issue, but
the title and practical move must reflect the source's central argument. If
they do not, find a source that actually teaches the move.

## One move worth stealing

Each item needs one practical move the reader can apply to their own work or
business. State it clearly. Testing filters weak candidates and supports the
verdict, but the test procedure is not the takeaway.

Prefer products and ideas that most readers have not already seen. A familiar
brand only qualifies when Radar finds a new feature, overlooked use, or
workflow that changes what the reader can do with it.

## Say only what happened

Every factual sentence needs one of two foundations:

- the linked primary source explicitly supports it; or
- Radar genuinely observed it in a recorded test.

The source must support the exact workflow, not a nearby topic. A story about
open-weight models does not support a copy-locking workflow merely because its
page was generated. An article about software quality does not prove that we
fixed a real app.

Use “we tested”, “we built”, “we changed”, or “we found” only for actions
Radar actually performed. A synthetic JSON fixture is test data, not a sample
app or a real customer result. Keep it in the private receipt unless the
newsletter clearly labels it as an invented example and that detail helps the
reader.

## Final copy check

Read the issue out loud. If it sounds like a developer explaining a test to
another developer, rewrite it.

The issue is ready when:

- there are no more than four tools and four workflows;
- at least three tools are genuinely early or new;
- each title and description is easy to scan;
- no specialist term remains when an ordinary phrase says the same thing;
- every `<Like>` contains a practical use or example;
- every `<Dislike>` helps the reader make a decision;
- every item contains one practical move the reader can apply;
- every workflow is something the reader can do with an AI agent;
- every factual sentence maps to the linked source or a real test receipt;
- the linked source explicitly supports the exact move in the item;
- the item reflects the source's main argument rather than one isolated line;
- the product, feature, or use is early, overlooked, or genuinely novel;
- public metadata describes the useful contents without saying they are new,
  overlooked, early, or better than everything else;
- the preheader complements the subject, stays under 100 characters, and makes
  sense when only its first 35 characters are visible;
- the `writing-tips` checks pass;
- the local writing-profile score is ready for review, or the run report explains
  a specific scoring mismatch that does not justify making the human copy
  worse.
