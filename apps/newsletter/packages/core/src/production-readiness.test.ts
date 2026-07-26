import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { loadConfig } from './config.js'
import { CoreEmailPlatform } from './platform.js'
import { TestEmailProvider } from './providers.js'
import { MemoryEmailStore } from './store.js'

describe('production readiness', () => {
  it('previews warm-first send plans before creating broadcasts', async () => {
    const store = new MemoryEmailStore()
    const provider = new TestEmailProvider()
    const platform = new CoreEmailPlatform({
      store,
      provider,
      config: loadConfig({ NODE_ENV: 'test', EMAIL_FROM_EMAIL: 'from@example.com' }),
    })
    await platform.subscribe({ email: 'cold@example.com' })
    await platform.subscribe({ email: 'warm@example.com' })
    const warm = await store.findContactByEmail('warm@example.com')
    assert.ok(warm)
    await store.recordEvent({
      type: 'engagement.clicked',
      contactId: warm.id,
      source: 'test',
      metadata: {},
    })

    const preview = await platform.previewSendPlan({
      deliveryPolicy: { durationHours: 12 },
      scheduledAt: new Date('2026-06-21T09:00:00.000Z'),
    })

    assert.equal(preview.total, 2)
    assert.equal(preview.sample[0]?.email, 'warm@example.com')
    assert.equal(preview.sample[0]?.rankReason, 'prior_click')
    assert.equal(preview.startsAt?.toISOString(), '2026-06-21T09:00:00.000Z')
    assert.equal(preview.domains[0]?.domain, 'example.com')
    assert.equal(preview.domains[0]?.count, 2)
  })

  it('requires SNS webhook configuration before SES is ready', async () => {
    const store = new MemoryEmailStore()
    const provider = new TestEmailProvider()
    const missingTopic = new CoreEmailPlatform({
      store,
      provider,
      config: loadConfig({
        NODE_ENV: 'test',
        EMAIL_FROM_EMAIL: 'from@example.com',
        AWS_SNS_WEBHOOK_SECRET: 'sns-secret',
      }),
    })

    const report = await missingTopic.doctor()
    assert.equal(report.snsWebhookConfigured, true)
    assert.equal(report.snsTopicAllowlistConfigured, false)
    assert.equal(report.ready, false)

    const completeSes = new CoreEmailPlatform({
      store,
      provider,
      config: loadConfig({
        NODE_ENV: 'test',
        EMAIL_FROM_EMAIL: 'from@example.com',
        AWS_SNS_WEBHOOK_SECRET: 'sns-secret',
        AWS_SNS_ALLOWED_TOPICS: 'arn:aws:sns:us-east-1:123456789012:email',
      }),
    })
    assert.equal((await completeSes.doctor()).ready, true)
  })
})
