---
subject: "The only SEO skill your agent needs"
preheader: "Yes, I'm back, and I've built a lot of things!"
pubDate: 2026-07-21
draft: false
sentAt: 2026-07-21T14:55:49.173Z
broadcastId: "c63ae916-e75c-4b73-8ed3-e760bddfaa9f"
---
<Header name="Issue 001" />

Hey, it's Ian. It's been a while since I last sent an email.

This is issue 001 of the new format. Every week I'll share what I learned using AI, plus some interesting links you might not have seen elsewhere.

If you don't want to receive these, no hard feelings, here's a [quick unsubscribe link]({{unsubscribeUrl}}) you can use.

<Text title="I built a free, local, SEO tool for agents">

TLDR; [Click here to try SEO Skill](https://seoskill.dev).

I disappeared from social media back in March because I could feel myself spending more time consuming vs creating.

It got to the point where there was just too much FOMO and feeling like I was behind. So I went back to what I know - building a shitload of programmatic SEO projects.

I created about a dozen new sites in various niches. Some content driven, some free tools, some SaaS. A bunch of them are now making $1k+ per month. Many didn't rank at all...

As I was building them I wanted to see what was working and what didn't with a bunch of local scripts pulling in Google Search Console and Analytics data plus a crawler to pick up on issues.

I gave Codex the tools with a CLI and it fixed many, many problems and fed that back into my other blueprints I have locally to spin up new sites faster and better.

Those tools are now available to everyone, for free, with a new project called [SEO Skill](http://seoskill.dev).

I hate skill bloat and having to figure out what skill to use. This is one skill that teaches your agent exactly what audit tools are available, how to run them, when to run them, what to do next, and recommendations for fixing issues.

To use it, just run:

```sh
npm i -g seo
```

```bash
seo start
```

It's early, but well tested against my own sites and has some very useful programmatic SEO reports too.

Feel free to give feedback on the repo with suggestions on how to make this better.

The onboarding flow lets you authenticate easily with your Google account so there's almost no technical stuff you need to do. Just give your agent the docs and it'll know what to do.

Fun fact about the authentication: Google requires a video demo of your app before they grant you Analytics scopes and my human-done video was rejected.

I told Codex to do it for me and it took over my computer, figured out what screens to show, wrote the script, used local text-to-speech, and recorded the entire thing for me.

The Codex version was accepted instantly. Agent 1, human 0.
</Text>

<Links title="Worth a Click">
## [FanoutFox](https://suganthan.com/blog/fanoutfox)
See how ChatGPT actually picks its sources

A free GEO tool that reads your own ChatGPT session and shows the fan-out queries.

## [The Memory Heist](https://www.ayush.digital/blog/the-memory-heist)
How Claude got tricked into leaking secrets

A hidden prompt injection made Claude silently send the author's personal details to an attacker.

## [Your agent or theirs?](https://x.com/mitchellh/status/2077788454860316915)
The best product-agent debate this week

Mitchell Hashimoto says a generic harness plus your CLI/MCP beats built-in chat boxes. Guillermo Rauch makes the [counter-case](https://x.com/rauchg/status/2077847855306596563) for a first-party agent on your .com.

## [Specific writing gets cited more](https://www.searchenginejournal.com/ai-seo-writing-thats-specific-may-get-cited-more/582531)
The AI-search ranking factor you control

AI engines cite specific, first-hand writing and skip the generic overviews.
</Links>

<Box title="Ask me anything" color="blue">
I added a new section to my site which has not yet received any questions.

If you want to [ask me anything](https://ian.is/ama), I'll answer them on site and recap the latest AMAs in this email every week.
</Box>
