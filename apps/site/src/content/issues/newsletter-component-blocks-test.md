---
subject: Newsletter component blocks test
preheader: Every issue component plus a cold-recipient conditional.
pubDate: 2026-07-23
draft: true
---
<Header name="Component test" read-time="off" />

<Hero title="Hero" color="pink">
This hero is visible on the Astro issue page. The default email shell owns its own header, so it deliberately does not render hero chrome.
</Hero>

<Lead title="Lead">
This is the lead block. It uses larger introductory copy in email and ordinary issue prose on the site.
</Lead>

<Text title="Text">
This is a normal text block with **bold text**, `inline code`, and [Ian's website](https://ian.is).
</Text>

<Links title="Links">
## [Ian's List](https://list.ian.is)
The newsletter home

This is the longer description for the first link.

## [SEO Skill](https://seoskill.dev)
A local SEO toolkit for agents

This second item proves normal Markdown headings can separate links without `---` dividers.
</Links>

<Sponsor title="Sponsor" color="gray">
**Example Sponsor** helps practical builders ship useful software. This is test copy, not a real placement.
</Sponsor>

<Box title="Box" color="blue">
This is a reusable coloured box. It can contain paragraphs, lists, links, and fenced code.

- First useful point
- Second useful point
</Box>

<Classifieds title="Classifieds" note="Small placements for useful products." button="Advertise ↗︎" button-url="https://ian.is/advertise">
## Example classified
[Example classified](https://example.com) is placeholder copy for testing the first item.

## Another classified
[Another classified](https://example.org) proves multiple items split on Markdown headings.
</Classifieds>

<Quote title="Quote">
The simplest authoring format is the one you can remember six days later.

— Test issue
</Quote>

<Poll title="Poll" question="Which authoring format would you rather use?" color="yellow">
## [Component blocks](https://ian.is)

## [Old directive fences](https://ian.is)

## [Plain Markdown only](https://ian.is)
</Poll>

<Conditional if="status:cold">
<Box title="Cold subscriber conditional" color="red">
This block is included in the cold test email. It is removed from warm/new emails and from the public Astro issue archive.

[Confirm you want to stay on Ian's List](https://ian.is/?stay=1), or click any other link in this issue.
</Box>
</Conditional>

<Footer share-url="https://ian.is/issues/newsletter-component-blocks-test">
**Ian's List** is a weekly email about what I learned actually using AI to run my business.
</Footer>
