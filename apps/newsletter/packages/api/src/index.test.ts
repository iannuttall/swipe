import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  authorized,
  makeSubscriptionTestApp,
  makeTestApp,
  snsBounce,
  snsDelivery,
} from './index.test-helper.js'

describe('api', () => {
  it('requires auth for API writes and subscribes contacts', async () => {
    const { app } = makeTestApp()
    assert.equal(
      (
        await app.request('/api/subscribe', {
          method: 'POST',
          body: JSON.stringify({ email: 'ian@example.com' }),
        })
      ).status,
      401,
    )
    const response = await app.request('/api/subscribe', {
      method: 'POST',
      headers: { 'x-api-token': 'api-token' },
      body: JSON.stringify({ email: 'ian@example.com', source: 'site' }),
    })
    assert.equal(response.status, 201)
    const body = (await response.json()) as { id: string }
    assert.ok(body.id)
  })

  it('creates broadcasts, sends due messages, and tracks clicks', async () => {
    const { app, provider, store } = makeTestApp()
    await authorized(app, '/api/subscribe', { email: 'clicker@example.com' })
    const draft = await authorized(app, '/api/drafts', {
      subject: 'Hello',
      bodyMarkdown: 'Read [this](https://example.com/read).',
    })
    await authorized(app, '/api/broadcasts', {
      draftId: draft.id,
      scheduledAt: new Date(0).toISOString(),
    })
    const sent = await authorized(app, '/api/send-due', {
      confirm: true,
      now: new Date('2026-06-20T00:00:00.000Z').toISOString(),
    })
    assert.equal(sent.sent, 1)
    assert.equal(provider.sent.length, 1)
    const token = provider.sent[0]?.html.match(/\/t\/click\/([^"]+)/)?.[1]
    assert.ok(token)
    const response = await app.request(`/t/click/${token}`, {
      headers: { 'user-agent': 'api-test', 'x-real-ip': '203.0.113.10' },
    })
    assert.equal(response.status, 302)
    assert.equal(response.headers.get('location'), 'https://example.com/read')
    assert.equal(
      store.events.filter((event) => event.type === 'engagement.clicked').length,
      1,
    )
    const broadcastId = Array.from(store.broadcasts.keys())[0]
    assert.ok(broadcastId)
    const linksResponse = await app.request(`/api/broadcasts/${broadcastId}/links`, {
      headers: { 'x-api-token': 'api-token' },
    })
    assert.equal(linksResponse.status, 200)
    const links = (await linksResponse.json()) as Array<{ humanClicks: number }>
    assert.equal(links[0]?.humanClicks, 1)
    const summaryResponse = await app.request('/api/analytics/link-summary', {
      headers: { 'x-api-token': 'api-token' },
    })
    assert.equal(summaryResponse.status, 200)
    const summary = (await summaryResponse.json()) as Array<{
      originalUrl: string
      humanClicks: number
      uniqueHumanContacts: number
      linkCount: number
    }>
    assert.equal(summary[0]?.originalUrl, 'https://example.com/read')
    assert.equal(summary[0]?.humanClicks, 1)
    assert.equal(summary[0]?.uniqueHumanContacts, 1)
    assert.equal(summary[0]?.linkCount, 1)

    const analyticsResponse = await app.request(
      '/api/contacts/clicker%40example.com/analytics',
      { headers: { 'x-api-token': 'api-token' } },
    )
    assert.equal(analyticsResponse.status, 200)
    const analytics = (await analyticsResponse.json()) as {
      engagement: { totalClicks: number }
    }
    assert.equal(analytics.engagement.totalClicks, 1)
  })

  it('requires confirmation for API send operations', async () => {
    const { app } = makeTestApp()
    for (const path of ['/api/send-due', '/api/tests', '/api/messages/retry-failed']) {
      const response = await app.request(path, {
        method: 'POST',
        headers: { 'x-api-token': 'api-token' },
        body: JSON.stringify({ draftId: 'draft_1', to: 'ian@example.com' }),
      })
      assert.equal(response.status, 400)
    }
  })

  it('records subscriber intelligence through protected endpoints', async () => {
    const { app } = makeTestApp()
    await authorized(app, '/api/subscribe', { email: 'buyer@example.com' })

    const tag = await authorized(app, '/api/contacts/buyer%40example.com/tags', {
      tagKey: 'high-value',
    })
    assert.equal(tag.tagKey, 'high-value')

    const externalId = await authorized(
      app,
      '/api/contacts/buyer%40example.com/external-ids',
      {
        provider: 'stripe',
        externalId: 'cus_api',
      },
    )
    assert.equal(externalId.externalId, 'cus_api')

    const purchase = await authorized(app, '/api/purchases', {
      email: 'buyer@example.com',
      provider: 'stripe',
      externalId: 'pi_api',
      idempotencyKey: 'stripe:pi_api',
      productKey: 'prompt-stack',
      amountCents: 50_000,
      currency: 'USD',
    })
    assert.equal(purchase.productKey, 'prompt-stack')

    const valueResponse = await app.request('/api/contacts/buyer%40example.com/value', {
      headers: { 'x-api-token': 'api-token' },
    })
    assert.equal(valueResponse.status, 200)
    const value = (await valueResponse.json()) as Array<{ totalAmountCents: number }>
    assert.equal(value[0]?.totalAmountCents, 50_000)

    const preview = await authorized(app, '/api/audience/preview', {
      contactTags: ['high-value'],
      purchasedProductKeys: ['prompt-stack'],
      minLifetimeValueCents: 25_000,
      currency: 'USD',
    })
    assert.equal(preview.total, 1)

    const plan = (await authorized(app, '/api/broadcasts/preview-plan', {
      audience: { contactTags: ['high-value'] },
      deliveryPolicy: { durationHours: 12 },
      sampleLimit: 5,
    })) as { total: number; sample: Array<{ email: string }> }
    assert.equal(plan.total, 1)
    assert.equal(plan.sample[0]?.email, 'buyer@example.com')

    const draft = await authorized(app, '/api/drafts', {
      subject: 'Segmented',
      bodyMarkdown: 'Body',
    })
    const broadcast = await authorized(app, '/api/broadcasts', {
      draftId: draft.id,
      audience: {
        contactTags: ['high-value'],
      },
      deliveryPolicy: {
        durationHours: 12,
      },
    })
    assert.equal(broadcast.totalPlanned, 1)

    const rebuild = await authorized(app, '/api/analytics/rebuild-rollups', {
      confirm: true,
    })
    assert.equal(typeof rebuild.valueRollups, 'number')
  })

  it('imports and exports contacts with suppressions', async () => {
    const { app } = makeTestApp()
    const imported = await authorized(app, '/api/contacts/import', {
      contacts: [{ email: 'imported@example.com', name: 'Imported' }],
      suppressions: [{ email: 'blocked@example.com', reason: 'manual' }],
    })
    assert.equal(imported.imported, 1)
    assert.equal(imported.suppressed, 1)

    const response = await app.request('/api/contacts/export', {
      headers: { 'x-api-token': 'api-token' },
    })
    assert.equal(response.status, 200)
    const exported = (await response.json()) as {
      contacts: Array<{ email: string }>
      suppressions: Array<{ email: string }>
    }
    assert.equal(
      exported.contacts.some((contact) => contact.email === 'imported@example.com'),
      true,
    )
    assert.equal(
      exported.suppressions.some(
        (suppression) => suppression.email === 'blocked@example.com',
      ),
      true,
    )
  })

  it('exposes authenticated doctor checks', async () => {
    const { app } = makeTestApp()
    for (const path of ['/health', '/healthz', '/readyz']) {
      const healthResponse = await app.request(path)
      assert.equal(healthResponse.status, 200)
      const health = (await healthResponse.json()) as { name: string }
      assert.equal(health.name, 'Acme Mail')
    }

    const response = await app.request('/api/doctor', {
      headers: { 'x-api-token': 'api-token' },
    })
    assert.equal(response.status, 200)
    const doctor = (await response.json()) as { appName: string; ready: boolean }
    assert.equal(doctor.appName, 'Acme Mail')
    assert.equal(doctor.ready, true)

    const checklistResponse = await app.request('/api/ops/checklist', {
      headers: { 'x-api-token': 'api-token' },
    })
    assert.equal(checklistResponse.status, 200)
    const checklist = (await checklistResponse.json()) as {
      ready: boolean
      rollout: Array<{ command: string }>
    }
    assert.equal(checklist.ready, true)
    assert.ok(checklist.rollout.some((step) => step.command.includes('canary create')))

    const blockedRecovery = await app.request('/api/ops/recover-stuck', {
      method: 'POST',
      headers: { 'x-api-token': 'api-token' },
      body: JSON.stringify({}),
    })
    assert.equal(blockedRecovery.status, 400)

    const recovery = await authorized(app, '/api/ops/recover-stuck', {
      confirm: true,
      limit: 10,
    })
    assert.deepEqual(recovery, { recovered: 0, failed: 0 })
  })

  it('requires confirmation before unsubscribe links change consent state', async () => {
    const { app, provider, store } = makeTestApp()
    await authorized(app, '/api/subscribe', { email: 'leave@example.com' })
    const draft = await authorized(app, '/api/drafts', {
      subject: 'Hello',
      bodyMarkdown: 'Footer {{unsubscribeUrl}}',
    })
    await authorized(app, '/api/broadcasts', {
      draftId: draft.id,
      scheduledAt: new Date(0).toISOString(),
    })
    await authorized(app, '/api/send-due', {
      confirm: true,
      now: new Date('2026-06-20T00:00:00.000Z').toISOString(),
    })

    const token = provider.sent[0]?.html.match(/\/unsubscribe\/([^"<]+)/)?.[1]
    assert.ok(token)
    const confirmation = await app.request(`/unsubscribe/${token}`)
    assert.equal(confirmation.status, 200)
    assert.match(await confirmation.text(), /Unsubscribe from Acme Mail/)
    assert.equal((await store.findContactByEmail('leave@example.com'))?.status, 'active')

    const response = await app.request(`/unsubscribe/${token}`, { method: 'POST' })
    assert.equal(response.status, 200)
    assert.match(await response.text(), /Unsubscribed from Acme Mail/)
    assert.equal(
      (await store.findContactByEmail('leave@example.com'))?.status,
      'unsubscribed',
    )
    assert.equal(
      (await store.findContactByEmail('leave@example.com'))?.suppressedAt,
      undefined,
    )
    assert.equal(await store.isSuppressed('leave@example.com'), false)
  })

  it('handles SES bounces and suppresses hard bounces', async () => {
    const { app, provider, store } = makeTestApp()
    await authorized(app, '/api/subscribe', { email: 'bounce@example.com' })
    const draft = await authorized(app, '/api/drafts', {
      subject: 'Hello',
      bodyMarkdown: 'Body',
    })
    await authorized(app, '/api/broadcasts', {
      draftId: draft.id,
      scheduledAt: new Date(0).toISOString(),
    })
    await authorized(app, '/api/send-due', {
      confirm: true,
      now: new Date('2026-06-20T00:00:00.000Z').toISOString(),
    })

    const response = await app.request('/webhooks/ses/sns-secret', {
      method: 'POST',
      body: JSON.stringify(snsBounce(provider.sent.length.toString())),
    })

    assert.equal(response.status, 202)
    assert.equal(
      (await store.findContactByEmail('bounce@example.com'))?.status,
      'suppressed',
    )
  })

  it('accepts the alternate SES webhook path without API auth', async () => {
    const { app, store } = makeTestApp()
    await authorized(app, '/api/subscribe', { email: 'bounce@example.com' })

    const response = await app.request('/api/webhooks/sns-secret/ses', {
      method: 'POST',
      body: JSON.stringify(snsBounce('alternate-route')),
    })

    assert.equal(response.status, 202)
    assert.equal(
      (await store.findContactByEmail('bounce@example.com'))?.status,
      'suppressed',
    )
  })

  it('ignores unsupported SES webhook notifications', async () => {
    const { app } = makeTestApp()
    const response = await app.request('/webhooks/ses/sns-secret', {
      method: 'POST',
      body: JSON.stringify(snsDelivery()),
    })

    assert.equal(response.status, 202)
    assert.deepEqual(await response.json(), { processed: 0 })
  })

  it('confirms SES SNS subscriptions after signature verification', async () => {
    let confirmedType: string | undefined
    const app = makeSubscriptionTestApp({
      confirmSnsSubscription: async (message) => {
        confirmedType = message.Type
        return true
      },
    })

    const response = await app.request('/webhooks/ses/sns-secret', {
      method: 'POST',
      body: JSON.stringify({
        Type: 'SubscriptionConfirmation',
        MessageId: 'sns-subscribe',
        TopicArn: 'arn:aws:sns:us-east-1:123456789012:email',
        Message: 'confirm',
        Timestamp: '2026-06-20T00:00:00.000Z',
        Token: 'token',
        SubscribeURL: 'https://sns.us-east-1.amazonaws.com/?Action=ConfirmSubscription',
      }),
    })

    assert.equal(response.status, 202)
    assert.equal(confirmedType, 'SubscriptionConfirmation')
  })

  it('exposes broadcast lifecycle and stats endpoints', async () => {
    const { app } = makeTestApp()
    await authorized(app, '/api/subscribe', { email: 'stats@example.com' })
    const draft = await authorized(app, '/api/drafts', {
      subject: 'Stats',
      bodyMarkdown: 'Body',
    })
    const broadcast = await authorized(app, '/api/broadcasts', {
      draftId: draft.id,
      scheduledAt: new Date(0).toISOString(),
    })

    const pause = await authorized(app, `/api/broadcasts/${broadcast.id}/pause`, {})
    assert.equal(pause.paused, true)
    const resume = await authorized(app, `/api/broadcasts/${broadcast.id}/resume`, {})
    assert.equal(resume.resumed, true)
    const statsResponse = await app.request(`/api/broadcasts/${broadcast.id}/stats`, {
      headers: { 'x-api-token': 'api-token' },
    })
    assert.equal(statsResponse.status, 200)
    const stats = (await statsResponse.json()) as { planned: number }
    assert.equal(stats.planned, 1)
  })
})
