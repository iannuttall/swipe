import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { loadConfig } from './config.js'
import { CoreEmailPlatform } from './platform.js'
import { TestEmailProvider } from './providers.js'
import { MemoryEmailStore } from './store.js'

describe('CoreEmailPlatform conditional rendering', () => {
  it('snapshots recipient status and renders conditional blocks per message', async () => {
    const store = new MemoryEmailStore()
    const provider = new TestEmailProvider()
    const platform = new CoreEmailPlatform({
      store,
      provider,
      config: loadConfig({ NODE_ENV: 'test', EMAIL_FROM_EMAIL: 'from@example.com' }),
    })

    await platform.subscribe({ email: 'cold@example.com' })
    await platform.subscribe({ email: 'warm@example.com' })
    const cold = await store.findContactByEmail('cold@example.com')
    const warm = await store.findContactByEmail('warm@example.com')
    assert.ok(cold)
    assert.ok(warm)

    for (let index = 0; index < 9; index += 1) {
      await store.recordEvent({
        type: 'message.sent',
        contactId: cold.id,
        messageId: `cold-${index}`,
        source: 'test',
        metadata: {},
      })
    }
    await store.recordEvent({
      type: 'engagement.clicked',
      contactId: warm.id,
      source: 'test',
      metadata: {},
    })

    const draft = await platform.createDraft({
      subject: 'Conditional',
      bodyMarkdown: [
        'Hello.',
        '<Conditional if="status:cold">',
        'Cold warning.',
        '</Conditional>',
      ].join('\n'),
    })
    await platform.createBroadcast({ draftId: draft.id, scheduledAt: new Date(0) })
    await platform.sendDue(new Date(), 10)

    const coldSend = provider.sent.find((message) => message.to === cold.email)
    const warmSend = provider.sent.find((message) => message.to === warm.email)
    assert.match(coldSend?.html ?? '', /Cold warning/)
    assert.doesNotMatch(warmSend?.html ?? '', /Cold warning/)
  })
})
