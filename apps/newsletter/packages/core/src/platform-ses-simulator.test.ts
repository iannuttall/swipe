import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { loadConfig } from './config.js'
import { CoreEmailPlatform } from './platform.js'
import { TestEmailProvider } from './providers.js'
import { MemoryEmailStore } from './store.js'

describe('CoreEmailPlatform SES simulator feedback', () => {
  it('does not hard-suppress simulator feedback addresses', async () => {
    const store = new MemoryEmailStore()
    const platform = new CoreEmailPlatform({
      store,
      provider: new TestEmailProvider(),
      config: loadConfig({ NODE_ENV: 'test', EMAIL_FROM_EMAIL: 'from@example.com' }),
    })

    await platform.handleProviderEvents([
      {
        provider: 'ses',
        providerEventId: 'normal-complaint',
        providerMessageId: 'ses-normal',
        type: 'message.complained',
        email: 'person@example.com',
        occurredAt: new Date('2026-06-30T12:00:00.000Z'),
        permanent: true,
        metadata: {},
      },
      {
        provider: 'ses',
        providerEventId: 'simulator-complaint',
        providerMessageId: 'ses-simulator',
        type: 'message.complained',
        email: 'complaint@simulator.amazonses.com',
        occurredAt: new Date('2026-06-30T12:01:00.000Z'),
        permanent: true,
        metadata: {},
      },
    ])

    assert.equal(store.events.length, 2)
    assert.equal(await store.isSuppressed('person@example.com'), true)
    assert.equal(await store.isSuppressed('complaint@simulator.amazonses.com'), false)
    assert.equal(store.suppressions.length, 1)
    assert.equal(store.suppressions[0]?.email, 'person@example.com')
  })
})
