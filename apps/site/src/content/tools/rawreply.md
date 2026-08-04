---
name: "RawReply"
seoTitle: "RawReply AI email writer that learns your voice"
headline: "RawReply: Turn rough notes into an email that sounds like you"
tagline: "Write the facts first, then get a direct email draft."
description: "RawReply drafts emails from rough notes and uses saved writing facts to make later replies sound more recognisable."
url: "https://rawreply.com/"
kind: "web-app"
platforms: ["Web"]
category: "Writing"
tags: ["email", "writing", "voice"]
status: "early"
firstSeen: 2026-08-04
lastChecked: 2026-08-04
reviewEveryDays: 60
featuredIssues: ["agent-video-rough-cut"]
sources:
  - kind: "landing"
    label: "RawReply landing page and public demo"
    url: "https://rawreply.com/"
    checkedAt: 2026-08-04
  - kind: "docs"
    label: "RawReply email writing guide"
    url: "https://rawreply.com/email-writing-ai-assistant"
    checkedAt: 2026-08-04
  - kind: "docs"
    label: "RawReply privacy policy"
    url: "https://rawreply.com/privacy"
    checkedAt: 2026-08-04
---

## Draft the message from facts, not a polished prompt

RawReply is a small web app for writing emails. Give it the rough facts, the
decision, and the next step. It turns those notes into a concise message.

The useful difference is that the input can stay messy. You do not have to
write a careful prompt or clean up the order first. This works well for client
updates, follow-ups, introductions, and replies where the facts matter more
than a clever format.

The public demo does not require an account. In a synthetic test, these notes:

> Checkout redesign is live for 10 percent of users. No errors yet. Watch it
> until Friday, then expand if stable. Keep it direct.

became a short update with a subject line, the 10% rollout, the Friday review,
and the condition for expanding it. That proves the anonymous demo can turn a
small fact set into a usable draft. It does not test the personal voice memory
available after sign-in.

## Give it the details another person needs

Start with one email you have been postponing. Paste five things:

1. Who the message is for.
2. What changed or happened.
3. Any number or date that must be exact.
4. What you need from the other person.
5. One style constraint, such as "direct" or "warm but brief."

Read the result against those notes. Check names, dates, amounts, promises, and
the requested action. RawReply can shape the message, but it cannot know that a
private fact is correct unless you give it the right fact.

This approach is often faster than asking a general chat tool to invent the
context through several follow-up questions. It also keeps the draft focused
on the outcome instead of adding a long explanation around it.

## How the voice memory works

Signed-in use adds a memory layer. RawReply can save facts about how you write
and use them in later drafts. The site says that those facts are visible, can
be edited or deleted, and decay after 90 days when they are not used.

This is a better fit for repeated business email than a one-off public demo.
The value should increase only after the app has enough real examples to learn
stable habits. Keep checking the output while it learns. A remembered phrase
can be recognisable without being right for every recipient.

The current site does not show a public pricing page. Try the demo before you
create an account, and check the live account screen for any limits or paid
plan before you move a regular workflow into it.

## What RawReply stores

RawReply's privacy policy says that messages and responses are stored on its
servers. Saved facts are also stored as memory. Messages go to Anthropic for
generation, with Amazon Bedrock listed as a backup provider. The company says
that it does not use the content to train AI models.

PostHog receives hashed usage events and Sentry receives error information.
The policy says that a full account deletion request can be made by email and
is completed within 48 hours. There is not yet a self-service account deletion
button.

Do not paste passwords, private keys, health information, or a confidential
thread merely to copy its tone. Summarise the facts that the recipient needs.
That usually makes a better email and gives the service less private material.

## When to use something else

Use RawReply when the hard part is turning rough notes into a clear email and
you want later drafts to become more familiar. The anonymous demo is enough
for occasional messages. An account makes more sense for repeated use.

Use your normal email client's built-in writing help when you need edits inside
the existing thread. Use a general AI chat when the work needs research,
attachments, or a longer discussion before the email can be written.
