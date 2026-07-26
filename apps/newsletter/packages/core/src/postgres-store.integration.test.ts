import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { eq } from 'drizzle-orm'
import * as schema from './db/schema.js'
import {
  databaseUrl,
  makeIntegrationPlatform,
} from './postgres-store.integration-helper.js'
import { plannedRecipient } from './postgres-store.test-helper.js'

describe('PostgresEmailStore integration', { skip: !databaseUrl }, () => {
  it('claims due messages once across concurrent senders', async () => {
    const firstRuntime = await makeIntegrationPlatform()
    const secondRuntime = await makeIntegrationPlatform({
      provider: firstRuntime.provider,
      reset: false,
    })
    const { platform, provider } = firstRuntime
    try {
      for (let index = 0; index < 4; index += 1) {
        await platform.subscribe({ email: `worker-${index}@example.com` })
      }
      const draft = await platform.createDraft({
        subject: 'Concurrent',
        bodyMarkdown: 'Body',
      })
      const broadcast = await platform.createBroadcast({
        draftId: draft.id,
        scheduledAt: new Date(0),
      })

      const [first, second] = await Promise.all([
        platform.sendDue(new Date('2026-06-20T00:00:00.000Z'), 2),
        secondRuntime.platform.sendDue(new Date('2026-06-20T00:00:00.000Z'), 2),
      ])

      assert.equal(first.sent + second.sent, 4)
      assert.equal(provider.sent.length, 4)
      assert.equal(new Set(provider.sent.map((message) => message.to)).size, 4)
      assert.equal((await platform.getBroadcastStats(broadcast.id))?.sent, 4)
      assert.equal(
        (await platform.sendDue(new Date('2026-06-20T00:01:00.000Z'), 10)).sent,
        0,
      )
    } finally {
      await firstRuntime.close()
      await secondRuntime.close()
    }
  })

  it('reports recent signups newest first from Postgres', async () => {
    const { close, platform, db } = await makeIntegrationPlatform()
    try {
      await platform.subscribe({ email: 'pg-recent@example.com', source: 'ian.is' })
      const older = await platform.subscribe({ email: 'pg-older@example.com' })
      await db
        .update(schema.contacts)
        .set({ subscribedAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) })
        .where(eq(schema.contacts.id, older.id))

      const recent = await platform.recentContacts({ days: 7 })
      assert.equal(recent.signups, 1)
      assert.equal(recent.contacts[0]?.email, 'pg-recent@example.com')

      const wide = await platform.recentContacts({ days: 60 })
      assert.equal(wide.signups, 2)
      assert.equal(wide.contacts[0]?.email, 'pg-recent@example.com')
      assert.equal(wide.contacts[1]?.email, 'pg-older@example.com')
    } finally {
      await close()
    }
  })

  it('persists repeated link clicks and topic rollups', async () => {
    const { close, platform, provider } = await makeIntegrationPlatform()
    try {
      await platform.subscribe({ email: 'signals@example.com' })
      const draft = await platform.createDraft({
        subject: 'Signals',
        bodyMarkdown: 'Try [AgentKit](https://advertiser.example/tools?ref=newsletter).',
        metadata: {
          links: [
            {
              index: 0,
              topics: ['ai-agents', 'developer-tools'],
              tags: ['advertiser', 'sponsor'],
              sponsor: 'agentkit',
            },
          ],
        },
      })
      const broadcast = await platform.createBroadcast({
        draftId: draft.id,
        scheduledAt: new Date(0),
      })
      await platform.sendDue(new Date('2026-06-20T00:00:00.000Z'), 1)

      const clickToken = provider.sent[0]?.html.match(/\/t\/click\/([^"]+)/)?.[1]
      assert.ok(clickToken)
      const humanAgent =
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_5) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Safari/605.1.15'
      for (let index = 0; index < 2; index += 1) {
        await platform.trackClick({ token: clickToken, userAgent: humanAgent })
      }
      await platform.trackClick({
        token: clickToken,
        userAgent: 'Proofpoint URL Defense',
      })

      const links = await platform.getLinkInsights({
        broadcastId: broadcast.id,
        topic: 'ai-agents',
      })
      assert.equal(links[0]?.humanClicks, 2)
      assert.equal(links[0]?.botClicks, 1)
      assert.equal(links[0]?.uniqueHumanContacts, 1)
      assert.equal(links[0]?.sponsor, 'agentkit')
      assert.deepEqual(links[0]?.topics, ['ai-agents', 'developer-tools'])

      const contactLinks = await platform.getContactLinkInsights({
        emailOrId: 'signals@example.com',
      })
      assert.equal(contactLinks?.[0]?.humanClicks, 2)
      assert.equal(contactLinks?.[0]?.botClicks, 1)

      const topics = await platform.getContactTopicInsights({
        emailOrId: 'signals@example.com',
      })
      assert.deepEqual(
        topics?.map((topic) => [topic.topic, topic.humanClicks]),
        [
          ['ai-agents', 2],
          ['developer-tools', 2],
        ],
      )
      const topicAudience = await platform.previewAudience({ linkTopics: ['ai-agents'] })
      assert.equal(topicAudience.sample[0]?.email, 'signals@example.com')
      const rebuilt = await platform.rebuildAnalyticsRollups()
      assert.deepEqual([rebuilt.linkRollups, rebuilt.contactLinkRollups], [1, 1])
      assert.equal(
        (await platform.getLinkSummaryInsights({ topic: 'ai-agents' }))[0]?.humanClicks,
        2,
      )
    } finally {
      await close()
    }
  })

  it('reopens completed broadcasts when failed messages are retried', async () => {
    const { close, store } = await makeIntegrationPlatform()
    try {
      const contact = await store.upsertContact({ email: 'pg-retry@example.com' })
      const draft = await store.createDraft({ subject: 'Retry', bodyMarkdown: 'Body' })
      const broadcast = await store.createBroadcast({
        draftId: draft.id,
        name: 'Retry',
        subject: draft.subject,
      })
      const [message] = await store.createMessages(broadcast.id, [
        plannedRecipient(contact, new Date(0), 0),
      ])
      assert.ok(message)
      await store.updateMessage({ id: message.id, status: 'failed' })
      await store.finalizeBroadcasts([broadcast.id])

      assert.equal((await store.getBroadcast(broadcast.id))?.status, 'completed')
      const now = new Date('2026-06-20T00:00:00.000Z')
      assert.equal(await store.retryFailedMessages({ scheduledAt: now, limit: 10 }), 1)

      assert.equal((await store.getBroadcast(broadcast.id))?.status, 'scheduled')
      assert.equal((await store.claimDueMessages(now, 10)).length, 1)
    } finally {
      await close()
    }
  })

  it('creates large message plans in chunks', async () => {
    const { close, store } = await makeIntegrationPlatform()
    try {
      const contact = await store.upsertContact({ email: 'chunk@example.com' })
      const draft = await store.createDraft({ subject: 'Chunk', bodyMarkdown: 'Body' })
      const broadcast = await store.createBroadcast({
        draftId: draft.id,
        name: 'Chunk',
        subject: draft.subject,
      })
      const recipients = Array.from({ length: 1_005 }, (_, index) =>
        plannedRecipient(contact, new Date(0), index),
      )

      const created = await store.createMessages(broadcast.id, recipients)
      assert.equal(created.length, recipients.length)
      assert.equal(
        (await store.getBroadcast(broadcast.id))?.totalPlanned,
        recipients.length,
      )
    } finally {
      await close()
    }
  })

  it('summarizes queue health from Postgres', async () => {
    const { close, store } = await makeIntegrationPlatform()
    try {
      const contact = await store.upsertContact({ email: 'pg-queue@example.com' })
      const draft = await store.createDraft({ subject: 'Queue', bodyMarkdown: 'Body' })
      const broadcast = await store.createBroadcast({
        draftId: draft.id,
        name: 'Queue',
        subject: draft.subject,
      })
      await store.createMessages(broadcast.id, [
        plannedRecipient(contact, new Date('2026-06-20T00:00:00.000Z'), 0),
        plannedRecipient(contact, new Date('2026-06-20T02:00:00.000Z'), 1),
      ])
      await store.claimDueMessages(new Date('2026-06-20T00:00:00.000Z'), 1)
      await store.recordEvent({
        type: 'message.complained',
        source: 'test',
        occurredAt: new Date('2026-06-19T23:30:00.000Z'),
        metadata: {},
      })

      const summary = await store.getQueueSummary({
        now: new Date('2026-06-20T00:20:00.000Z'),
        staleBefore: new Date('2026-06-20T00:10:00.000Z'),
        since: new Date('2026-06-19T00:20:00.000Z'),
      })

      assert.deepEqual(
        [
          summary.plannedDue,
          summary.plannedFuture,
          summary.sending,
          summary.staleSending,
          summary.recentComplaints,
        ],
        [0, 1, 1, 1, 1],
      )
    } finally {
      await close()
    }
  })

  it('persists contact intelligence, audience previews, and rebuilds', async () => {
    const { close, platform } = await makeIntegrationPlatform()
    try {
      await platform.subscribe({ email: 'buyer@example.com' })
      await platform.subscribe({ email: 'cold@example.com' })

      await platform.tagContact({
        emailOrId: 'buyer@example.com',
        tagKey: 'high-value',
      })
      await platform.upsertContactExternalId({
        emailOrId: 'buyer@example.com',
        provider: 'stripe',
        externalId: 'cus_postgres',
      })
      const purchase = await platform.recordPurchase({
        email: 'buyer@example.com',
        provider: 'stripe',
        externalId: 'pi_postgres',
        idempotencyKey: 'stripe:pi_postgres',
        productKey: 'prompt-stack',
        amountCents: 75_000,
        currency: 'USD',
      })
      const duplicate = await platform.recordPurchase({
        email: 'buyer@example.com',
        provider: 'stripe',
        externalId: 'pi_postgres',
        idempotencyKey: 'stripe:pi_postgres',
        productKey: 'prompt-stack',
        amountCents: 75_000,
        currency: 'USD',
      })
      assert.equal(duplicate.id, purchase.id)

      assert.equal(
        (
          await platform.findContactByExternalId({
            provider: 'stripe',
            externalId: 'cus_postgres',
          })
        )?.email,
        'buyer@example.com',
      )
      assert.equal(
        (await platform.getContactValue({ emailOrId: 'buyer@example.com' }))?.[0]
          ?.totalAmountCents,
        75_000,
      )

      const preview = await platform.previewAudience({
        contactTags: ['high-value'],
        purchasedProductKeys: ['prompt-stack'],
        minLifetimeValueCents: 50_000,
        currency: 'USD',
      })
      assert.equal(preview.total, 1)
      assert.equal(preview.sample[0]?.email, 'buyer@example.com')

      const rebuilt = await platform.rebuildAnalyticsRollups()
      assert.equal(rebuilt.valueRollups, 1)
    } finally {
      await close()
    }
  })

  it('does not treat one email unsubscribe as a hard suppression', async () => {
    const { close, platform, provider } = await makeIntegrationPlatform()
    try {
      await platform.subscribe({ email: 'one@gmail.com' })
      await platform.subscribe({ email: 'two@gmail.com' })
      const draft = await platform.createDraft({
        subject: 'Unsubscribe',
        bodyMarkdown: 'Body {{unsubscribeUrl}}',
      })
      const broadcast = await platform.createBroadcast({
        draftId: draft.id,
        scheduledAt: new Date(0),
      })
      await platform.sendDue(new Date('2026-06-20T00:00:00.000Z'), 1)
      const token = provider.sent[0]?.html.match(/\/unsubscribe\/([^"<]+)/)?.[1]
      assert.ok(token)
      await platform.unsubscribe({
        token,
        source: 'test',
      })
      assert.equal((await platform.getBroadcastStats(broadcast.id))?.unsubscribed, 1)

      const preview = await platform.previewAudience()
      const sentEmail = provider.sent[0]?.to
      const remainingEmail =
        sentEmail === 'one@gmail.com' ? 'two@gmail.com' : 'one@gmail.com'
      assert.equal(preview.total, 1)
      assert.equal(preview.suppressed, 0)
      assert.equal(preview.sample.map((contact) => contact.email)[0], remainingEmail)
      const exported = await platform.exportContacts()
      assert.equal(
        exported.contacts.find((contact) => contact.email === sentEmail)?.status,
        'unsubscribed',
      )
      assert.equal(exported.suppressions.length, 0)
    } finally {
      await close()
    }
  })

  it('rejects suppressions that target both an email and a domain', async () => {
    const { close, store } = await makeIntegrationPlatform()
    try {
      await assert.rejects(
        () =>
          store.addSuppression({
            email: 'person@gmail.com',
            domain: 'gmail.com',
            reason: 'manual',
          }),
        /cannot target both email and domain/i,
      )
    } finally {
      await close()
    }
  })
})
