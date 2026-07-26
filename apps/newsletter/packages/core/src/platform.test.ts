import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { loadConfig } from './config.js'
import { CoreEmailPlatform } from './platform.js'
import type { EmailProvider, ProviderSendInput, ProviderSendResult } from './providers.js'
import { TestEmailProvider } from './providers.js'
import { MemoryEmailStore } from './store.js'

describe('CoreEmailPlatform', () => {
  it('creates broadcasts with warm-first planned messages', async () => {
    const store = new MemoryEmailStore()
    const provider = new TestEmailProvider()
    const platform = new CoreEmailPlatform({
      store,
      provider,
      config: loadConfig({ NODE_ENV: 'test', EMAIL_FROM_EMAIL: 'from@example.com' }),
    })

    await platform.subscribe({ email: 'cold@example.com' })
    await platform.subscribe({ email: 'hot@example.com' })
    const hot = await store.findContactByEmail('hot@example.com')
    assert.ok(hot)
    await store.recordEvent({
      type: 'engagement.clicked',
      contactId: hot.id,
      source: 'test',
      metadata: {},
    })
    const draft = await platform.createDraft({
      subject: 'Broadcast',
      bodyMarkdown: 'Hello [there](https://example.com)',
    })
    const broadcast = await platform.createBroadcast({ draftId: draft.id })

    assert.equal(broadcast.totalPlanned, 2)
    const messages = Array.from(store.messages.values()).toSorted(
      (a, b) => a.sendRank - b.sendRank,
    )
    assert.equal(messages[0]?.toEmail, 'hot@example.com')
    assert.equal(messages[0]?.rankReason, 'prior_click')
  })

  it('records contact intelligence and creates segmented broadcasts', async () => {
    const store = new MemoryEmailStore()
    const provider = new TestEmailProvider()
    const platform = new CoreEmailPlatform({
      store,
      provider,
      config: loadConfig({ NODE_ENV: 'test', EMAIL_FROM_EMAIL: 'from@example.com' }),
    })

    await platform.subscribe({ email: 'buyer@example.com' })
    await platform.subscribe({ email: 'cold@example.com' })
    await platform.subscribe({ email: 'blocked@example.com' })
    await store.addSuppression({ email: 'blocked@example.com', reason: 'manual' })

    const tag = await platform.tagContact({
      emailOrId: 'buyer@example.com',
      tagKey: 'high-value',
    })
    assert.equal(tag.tagKey, 'high-value')
    assert.equal(
      (await platform.listContactTags({ emailOrId: 'buyer@example.com' }))?.length,
      1,
    )

    const externalId = await platform.upsertContactExternalId({
      emailOrId: 'buyer@example.com',
      provider: 'stripe',
      externalId: 'cus_123',
    })
    assert.equal(externalId.provider, 'stripe')
    assert.equal(
      (
        await platform.findContactByExternalId({
          provider: 'stripe',
          externalId: 'cus_123',
        })
      )?.email,
      'buyer@example.com',
    )

    const purchase = await platform.recordPurchase({
      provider: 'stripe',
      externalId: 'pi_123',
      email: 'buyer@example.com',
      idempotencyKey: 'stripe:pi_123',
      productKey: 'prompt-stack',
      productName: 'Prompt Stack',
      amountCents: 50_000,
      currency: 'usd',
      purchasedAt: new Date('2026-06-20T10:00:00.000Z'),
    })
    const duplicate = await platform.recordPurchase({
      provider: 'stripe',
      externalId: 'pi_123',
      email: 'buyer@example.com',
      idempotencyKey: 'stripe:pi_123',
      productKey: 'prompt-stack',
      amountCents: 50_000,
      currency: 'USD',
    })
    assert.equal(duplicate.id, purchase.id)

    const value = await platform.getContactValue({ emailOrId: 'buyer@example.com' })
    assert.equal(value?.[0]?.totalAmountCents, 50_000)
    assert.equal(value?.[0]?.purchaseCount, 1)

    const preview = await platform.previewAudience({
      contactTags: ['high-value'],
      purchasedProductKeys: ['prompt-stack'],
      minLifetimeValueCents: 25_000,
      currency: 'USD',
    })
    assert.equal(preview.total, 1)
    assert.equal(preview.suppressed, 0)
    assert.equal(preview.sample[0]?.email, 'buyer@example.com')

    const draft = await platform.createDraft({
      subject: 'Segmented',
      bodyMarkdown: 'Hello segment.',
    })
    const broadcast = await platform.createBroadcast({
      draftId: draft.id,
      audience: preview.audience,
    })
    assert.equal(broadcast.totalPlanned, 1)
    assert.equal(Array.from(store.messages.values())[0]?.toEmail, 'buyer@example.com')
  })

  it('returns total audience size while bounding preview samples', async () => {
    const store = new MemoryEmailStore()
    const platform = new CoreEmailPlatform({
      store,
      provider: new TestEmailProvider(),
      config: loadConfig({ NODE_ENV: 'test', EMAIL_FROM_EMAIL: 'from@example.com' }),
    })

    for (let index = 0; index < 30; index += 1) {
      await platform.subscribe({ email: `preview-${index}@example.com` })
    }

    const preview = await platform.previewAudience()
    assert.equal(preview.total, 30)
    assert.equal(preview.sample.length, 25)
    assert.deepEqual(preview.audience, {})
  })

  it('sends due messages through the provider and skips suppressions', async () => {
    const store = new MemoryEmailStore()
    const provider = new TestEmailProvider()
    const platform = new CoreEmailPlatform({
      store,
      provider,
      config: loadConfig({ NODE_ENV: 'test', EMAIL_FROM_EMAIL: 'from@example.com' }),
    })

    await platform.subscribe({ email: 'send@example.com' })
    await platform.subscribe({ email: 'blocked@example.com' })
    await store.addSuppression({ email: 'blocked@example.com', reason: 'manual' })
    const draft = await platform.createDraft({ subject: 'Subject', bodyMarkdown: 'Body' })
    await platform.createBroadcast({ draftId: draft.id, scheduledAt: new Date(0) })
    const result = await platform.sendDue(new Date('2026-06-20T00:00:00.000Z'))

    assert.equal(result.sent, 1)
    assert.equal(result.skipped, 0)
    assert.equal(provider.sent.length, 1)
    assert.equal(provider.sent[0]?.to, 'send@example.com')
  })

  it('preserves query params when rewriting tracked links', async () => {
    const store = new MemoryEmailStore()
    const provider = new TestEmailProvider()
    const platform = new CoreEmailPlatform({
      store,
      provider,
      config: loadConfig({ NODE_ENV: 'test', EMAIL_FROM_EMAIL: 'from@example.com' }),
    })

    await platform.subscribe({ email: 'query@example.com' })
    const draft = await platform.createDraft({
      subject: 'Query params',
      bodyMarkdown:
        'Read [this](https://example.com/read?utm_source=local-test&utm_medium=email&utm_campaign=seed-test).',
    })
    await platform.createBroadcast({ draftId: draft.id, scheduledAt: new Date(0) })
    await platform.sendDue(new Date('2026-06-20T00:00:00.000Z'))

    const html = provider.sent[0]?.html ?? ''
    const clickToken = html.match(/\/t\/click\/([^"]+)/)?.[1]
    assert.ok(clickToken)

    const result = await platform.trackClick({
      token: clickToken,
      userAgent:
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_5) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Safari/605.1.15',
    })

    assert.equal(
      result.url,
      'https://example.com/read?utm_source=local-test&utm_medium=email&utm_campaign=seed-test',
    )
    assert.equal(new URL(result.url ?? '').searchParams.get('utm_medium'), 'email')
  })

  it('reschedules failed sends until attempts are exhausted', async () => {
    const store = new MemoryEmailStore()
    const provider = new FailingProvider()
    const platform = new CoreEmailPlatform({
      store,
      provider,
      config: loadConfig({ NODE_ENV: 'test', EMAIL_FROM_EMAIL: 'from@example.com' }),
    })

    await platform.subscribe({ email: 'retry@example.com' })
    const draft = await platform.createDraft({ subject: 'Subject', bodyMarkdown: 'Body' })
    await platform.createBroadcast({ draftId: draft.id, scheduledAt: new Date(0) })

    const result = await platform.sendDue(new Date('2026-06-20T00:00:00.000Z'))
    const message = Array.from(store.messages.values())[0]

    assert.equal(result.retried, 1)
    assert.equal(result.failed, 0)
    assert.equal(message?.status, 'planned')
    assert.equal(message?.retryCount, 1)
    assert.equal(message?.scheduledAt.toISOString(), '2026-06-20T00:15:00.000Z')
  })

  it('retries failed messages and sends SES simulator tests', async () => {
    const store = new MemoryEmailStore()
    const provider = new TestEmailProvider()
    const platform = new CoreEmailPlatform({
      store,
      provider,
      config: loadConfig({ NODE_ENV: 'test', EMAIL_FROM_EMAIL: 'from@example.com' }),
    })

    await platform.subscribe({ email: 'utility@example.com' })
    const draft = await platform.createDraft({ subject: 'Subject', bodyMarkdown: 'Body' })
    await platform.createBroadcast({ draftId: draft.id, scheduledAt: new Date(0) })
    const message = Array.from(store.messages.values())[0]
    assert.ok(message)
    await store.updateMessage({ id: message.id, status: 'failed' })

    assert.deepEqual(await platform.retryFailedMessages(), { retried: 1 })
    assert.equal(message.status, 'planned')

    const simulator = await platform.sendSesSimulator({
      draftId: draft.id,
      type: 'complaint',
    })
    assert.equal(simulator.to, 'complaint@simulator.amazonses.com')
    assert.equal(provider.sent.at(-1)?.to, 'complaint@simulator.amazonses.com')
  })

  it('pauses, resumes, and cancels broadcasts', async () => {
    const store = new MemoryEmailStore()
    const provider = new TestEmailProvider()
    const platform = new CoreEmailPlatform({
      store,
      provider,
      config: loadConfig({ NODE_ENV: 'test', EMAIL_FROM_EMAIL: 'from@example.com' }),
    })

    await platform.subscribe({ email: 'life@example.com' })
    const draft = await platform.createDraft({ subject: 'Subject', bodyMarkdown: 'Body' })
    const broadcast = await platform.createBroadcast({
      draftId: draft.id,
      scheduledAt: new Date(0),
    })

    assert.deepEqual(await platform.pauseBroadcast(broadcast.id), { paused: true })
    assert.equal((await platform.sendDue(new Date('2026-06-20T00:00:00.000Z'))).sent, 0)
    assert.deepEqual(await platform.resumeBroadcast(broadcast.id), { resumed: true })
    assert.equal((await platform.sendDue(new Date('2026-06-20T00:00:00.000Z'))).sent, 1)

    const second = await platform.createBroadcast({
      draftId: draft.id,
      scheduledAt: new Date(0),
    })
    assert.deepEqual(await platform.cancelBroadcast(second.id), {
      cancelled: true,
      skipped: 1,
    })
    const stats = await platform.getBroadcastStats(second.id)
    assert.equal(stats?.skipped, 1)
  })

  it('keeps scanner tracking separate from human engagement', async () => {
    const store = new MemoryEmailStore()
    const provider = new TestEmailProvider()
    const platform = new CoreEmailPlatform({
      store,
      provider,
      config: loadConfig({ NODE_ENV: 'test', EMAIL_FROM_EMAIL: 'from@example.com' }),
    })

    await platform.subscribe({ email: 'scan@example.com' })
    const draft = await platform.createDraft({
      subject: 'Tracked',
      bodyMarkdown: 'Read [this](https://example.com/read).',
      metadata: {
        links: [
          {
            index: 0,
            topics: ['ai-agents', 'developer-tools'],
            tags: ['advertiser'],
            sponsor: 'acme',
          },
        ],
      },
    })
    const broadcast = await platform.createBroadcast({
      draftId: draft.id,
      scheduledAt: new Date(0),
    })
    await platform.sendDue(new Date('2026-06-20T00:00:00.000Z'))

    const html = provider.sent[0]?.html ?? ''
    const openToken = html.match(/\/t\/open\/([^"]+)/)?.[1]
    const clickToken = html.match(/\/t\/click\/([^"]+)/)?.[1]
    const unsubscribeToken = html.match(/\/unsubscribe\/([^"<]+)/)?.[1]
    assert.ok(openToken)
    assert.ok(clickToken)
    assert.ok(unsubscribeToken)

    await platform.trackOpen({ token: openToken, userAgent: 'Proofpoint URL Defense' })
    await platform.trackClick({ token: clickToken, userAgent: 'Proofpoint URL Defense' })
    await platform.trackClick({
      token: clickToken,
      userAgent:
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_5) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Safari/605.1.15',
    })
    const stats = await platform.getBroadcastStats(broadcast.id)
    assert.equal(stats?.opened, 1)
    assert.equal(stats?.clicked, 1)
    assert.equal(stats?.openedByBot, 1)
    assert.equal(stats?.clickedByBot, 1)

    const linkStats = await platform.getBroadcastLinkStats(broadcast.id)
    assert.equal(linkStats?.[0]?.humanClicks, 1)
    assert.equal(linkStats?.[0]?.botClicks, 1)

    const analytics = await platform.getContactAnalytics({
      emailOrId: 'scan@example.com',
    })
    assert.equal(analytics?.engagement.totalClicks, 1)
    assert.equal(analytics?.links[0]?.humanClicks, 1)
    assert.equal(analytics?.links[0]?.botClicks, 1)
    assert.deepEqual(
      analytics?.topics.map((topic) => topic.topic),
      ['ai-agents', 'developer-tools'],
    )
    assert.equal(
      analytics?.events.some((event) => event.type === 'engagement.clicked_by_bot'),
      true,
    )

    const events = await platform.listBroadcastEvents({ broadcastId: broadcast.id })
    assert.ok((events?.length ?? 0) >= 4)

    const insights = await platform.getLinkInsights({ topic: 'ai-agents' })
    assert.equal(insights[0]?.humanClicks, 1)
    assert.equal(insights[0]?.uniqueHumanContacts, 1)
    assert.equal(insights[0]?.sponsor, 'acme')

    await platform.trackClick({
      token: clickToken,
      userAgent:
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_5) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Safari/605.1.15',
    })
    const repeated = await platform.getContactLinkInsights({
      emailOrId: 'scan@example.com',
    })
    assert.equal(repeated?.[0]?.humanClicks, 2)

    const summary = await platform.getLinkSummaryInsights({ topic: 'ai-agents' })
    assert.equal(summary[0]?.originalUrl, 'https://example.com/read')
    assert.equal(summary[0]?.humanClicks, 2)
    assert.equal(summary[0]?.botClicks, 1)
    assert.equal(summary[0]?.uniqueHumanContacts, 1)
    assert.equal(summary[0]?.linkCount, 1)
    assert.equal(summary[0]?.sponsor, 'acme')

    const topicAudience = await platform.previewAudience({ linkTopics: ['ai-agents'] })
    assert.equal(topicAudience.total, 1)
    assert.equal(topicAudience.sample[0]?.email, 'scan@example.com')

    store.linkRollups.clear()
    store.contactLinkRollups.clear()
    const rebuilt = await platform.rebuildAnalyticsRollups()
    assert.equal(rebuilt.linkRollups, 1)
    assert.equal(rebuilt.contactLinkRollups, 1)
    assert.equal(
      (await platform.getLinkSummaryInsights({ topic: 'ai-agents' }))[0]?.humanClicks,
      2,
    )
    await platform.unsubscribe({ token: unsubscribeToken })
    await platform.unsubscribe({ token: unsubscribeToken })
    assert.equal((await platform.getBroadcastStats(broadcast.id))?.unsubscribed, 1)
  })

  it('can disable open pixel tracking while keeping clicks', async () => {
    const store = new MemoryEmailStore()
    const provider = new TestEmailProvider()
    const platform = new CoreEmailPlatform({
      store,
      provider,
      config: loadConfig({
        NODE_ENV: 'test',
        EMAIL_FROM_EMAIL: 'from@example.com',
        EMAIL_TRACK_OPENS: 'false',
      }),
    })

    await platform.subscribe({ email: 'privacy@example.com' })
    const draft = await platform.createDraft({
      subject: 'Privacy',
      bodyMarkdown: 'Read [this](https://example.com/read).',
    })
    const broadcast = await platform.createBroadcast({
      draftId: draft.id,
      scheduledAt: new Date(0),
    })
    await platform.sendDue(new Date('2026-06-20T00:00:00.000Z'))

    const html = provider.sent[0]?.html ?? ''
    assert.equal(html.includes('/t/open/'), false)
    const clickToken = html.match(/\/t\/click\/([^"]+)/)?.[1]
    assert.ok(clickToken)

    await platform.trackClick({
      token: clickToken,
      userAgent:
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_5) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Safari/605.1.15',
    })

    const stats = await platform.getBroadcastStats(broadcast.id)
    assert.equal(stats?.opened, 0)
    assert.equal(stats?.clicked, 1)
  })

  it('creates cumulative warm-first canary cohorts', async () => {
    const store = new MemoryEmailStore()
    const provider = new TestEmailProvider()
    const platform = new CoreEmailPlatform({
      store,
      provider,
      config: loadConfig({ NODE_ENV: 'test', EMAIL_FROM_EMAIL: 'from@example.com' }),
    })

    for (const email of [
      'warm-1@example.com',
      'warm-2@example.com',
      'cold-1@example.com',
      'cold-2@example.com',
      'cold-3@example.com',
    ]) {
      await platform.subscribe({ email })
    }
    for (const email of ['warm-1@example.com', 'warm-2@example.com']) {
      const contact = await store.findContactByEmail(email)
      assert.ok(contact)
      await store.recordEvent({
        type: 'engagement.clicked',
        contactId: contact.id,
        source: 'test',
        metadata: {},
      })
    }

    const draft = await platform.createDraft({
      subject: 'Canary',
      bodyMarkdown: 'Hello [there](https://example.com)',
    })
    const canary = await platform.createCanary({
      draftId: draft.id,
      steps: [2, 4, 'all'],
      scheduledAt: new Date(0),
    })

    assert.equal(canary.cohorts.length, 1)
    assert.equal(canary.cohorts[0]?.addedCount, 2)
    assert.equal(canary.nextStep, 4)

    const promoted = await platform.promoteCanary({
      id: canary.campaign.id,
      scheduledAt: new Date(60_000),
    })
    assert.equal(promoted.cohorts.length, 2)
    assert.equal(promoted.cohorts[1]?.addedCount, 2)
    assert.equal(
      promoted.cohorts[0]?.contactIds.some((id) =>
        promoted.cohorts[1]?.contactIds.includes(id),
      ),
      false,
    )

    const completed = await platform.promoteCanary({ id: canary.campaign.id })
    assert.equal(completed.campaign.status, 'completed')
    assert.equal(completed.cohorts.length, 3)
    assert.equal(completed.cohorts[2]?.addedCount, 1)
    assert.equal(Array.from(store.messages.values()).length, 5)
  })
})

class FailingProvider implements EmailProvider {
  readonly id = 'failing'

  async send(_input: ProviderSendInput): Promise<ProviderSendResult> {
    throw new Error('SES unavailable')
  }
}
