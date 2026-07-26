import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { loadConfig } from './config.js'
import { CoreEmailPlatform } from './platform.js'
import { TestEmailProvider } from './providers.js'
import { MemoryEmailStore } from './store.js'

describe('recentContacts', () => {
  it('reports recent signups newest first within the window', async () => {
    const store = new MemoryEmailStore()
    const platform = new CoreEmailPlatform({
      store,
      provider: new TestEmailProvider(),
      config: loadConfig({ NODE_ENV: 'test', EMAIL_FROM_EMAIL: 'from@example.com' }),
    })

    await platform.subscribe({ email: 'new@example.com', source: 'ian.is' })
    const old = await platform.subscribe({ email: 'old@example.com' })
    const oldContact = await store.getContact(old.id)
    assert.ok(oldContact)
    oldContact.subscribedAt = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)

    const recent = await platform.recentContacts({ days: 7 })
    assert.equal(recent.days, 7)
    assert.equal(recent.signups, 1)
    assert.equal(recent.contacts[0]?.email, 'new@example.com')
    assert.equal(recent.contacts[0]?.source, 'ian.is')
    assert.ok(recent.contacts[0]?.subscribedAt)

    const wide = await platform.recentContacts({ days: 60 })
    assert.equal(wide.signups, 2)
    assert.equal(wide.contacts[0]?.email, 'new@example.com')
    assert.equal(wide.contacts[1]?.email, 'old@example.com')
  })
})
