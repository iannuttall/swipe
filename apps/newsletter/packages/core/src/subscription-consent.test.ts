import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { loadConfig } from './config.js'
import { CoreEmailPlatform } from './platform.js'
import { TestEmailProvider } from './providers.js'
import { MemoryEmailStore } from './store.js'

function makePlatform() {
  const store = new MemoryEmailStore()
  const platform = new CoreEmailPlatform({
    store,
    provider: new TestEmailProvider(),
    config: loadConfig({ NODE_ENV: 'test', EMAIL_FROM_EMAIL: 'from@example.com' }),
  })
  return { platform, store }
}

describe('subscription consent', () => {
  it('allows an unsubscribed contact to explicitly resubscribe', async () => {
    const { platform, store } = makePlatform()

    await platform.subscribe({ email: 'return@example.com' })
    const contact = await store.findContactByEmail('return@example.com')
    assert.ok(contact)
    await store.unsubscribeContact({ contactId: contact.id, email: contact.email })
    await store.addSuppression({
      contactId: contact.id,
      email: contact.email,
      reason: 'unsubscribe',
    })

    await platform.subscribe({ email: 'return@example.com', source: 'signup-form' })

    const resubscribed = await store.findContactByEmail('return@example.com')
    assert.equal(resubscribed?.status, 'active')
    assert.equal(resubscribed?.unsubscribedAt, undefined)
    assert.equal(resubscribed?.suppressedAt, undefined)
    assert.equal(await store.isSuppressed('return@example.com'), false)
  })

  it('keeps hard-suppressed contacts blocked from resubscribe', async () => {
    const { platform, store } = makePlatform()

    await platform.subscribe({ email: 'blocked@example.com' })
    await store.addSuppression({ email: 'blocked@example.com', reason: 'manual' })

    await assert.rejects(
      () => platform.subscribe({ email: 'blocked@example.com' }),
      /suppressed/i,
    )
  })
})
