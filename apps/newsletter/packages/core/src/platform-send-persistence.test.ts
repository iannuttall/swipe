import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { loadConfig } from './config.js'
import { CoreEmailPlatform } from './platform.js'
import { TestEmailProvider } from './providers.js'
import { type EventRecord, MemoryEmailStore } from './store.js'
import type { MessageStatus } from './types.js'

describe('CoreEmailPlatform send persistence', () => {
  it('does not retry when sent event persistence fails after provider acceptance', async () => {
    const store = new FailingSentEventStore()
    const provider = new TestEmailProvider()
    const platform = testPlatform(store, provider)

    await platform.subscribe({ email: 'accepted@example.com' })
    const draft = await platform.createDraft({ subject: 'Subject', bodyMarkdown: 'Body' })
    await platform.createBroadcast({ draftId: draft.id, scheduledAt: new Date(0) })

    const result = await platform.sendDue(new Date('2026-06-20T00:00:00.000Z'))
    const retry = await platform.sendDue(new Date('2026-06-20T00:20:00.000Z'))
    const message = Array.from(store.messages.values())[0]

    assert.equal(result.sent, 1)
    assert.equal(result.retried, 0)
    assert.equal(provider.sent.length, 1)
    assert.equal(message?.status, 'sent')
    assert.equal(retry.sent, 0)
    assert.equal(provider.sent.length, 1)
  })

  it('does not requeue when sent status persistence fails after provider acceptance', async () => {
    const store = new FailingSentStatusStore()
    const provider = new TestEmailProvider()
    const platform = testPlatform(store, provider)

    await platform.subscribe({ email: 'status-fail@example.com' })
    const draft = await platform.createDraft({ subject: 'Subject', bodyMarkdown: 'Body' })
    await platform.createBroadcast({ draftId: draft.id, scheduledAt: new Date(0) })

    const result = await platform.sendDue(new Date('2026-06-20T00:00:00.000Z'))
    const retry = await platform.sendDue(new Date('2026-06-20T00:20:00.000Z'))
    const message = Array.from(store.messages.values())[0]

    assert.equal(result.sent, 1)
    assert.equal(result.retried, 0)
    assert.equal(provider.sent.length, 1)
    assert.equal(message?.status, 'sending')
    assert.equal(retry.sent, 0)
    assert.equal(provider.sent.length, 1)
  })
})

function testPlatform(store: MemoryEmailStore, provider: TestEmailProvider) {
  return new CoreEmailPlatform({
    store,
    provider,
    config: loadConfig({ NODE_ENV: 'test', EMAIL_FROM_EMAIL: 'from@example.com' }),
  })
}

class FailingSentEventStore extends MemoryEmailStore {
  override async recordEvent(
    input: Omit<EventRecord, 'id' | 'occurredAt'> & { occurredAt?: Date },
  ): Promise<EventRecord> {
    if (input.type === 'message.sent') throw new Error('sent event write failed')
    return super.recordEvent(input)
  }
}

class FailingSentStatusStore extends MemoryEmailStore {
  override async updateMessage(input: {
    id: string
    status: MessageStatus
    providerMessageId?: string
    provider?: string
    scheduledAt?: Date
    error?: Record<string, unknown>
  }): Promise<void> {
    if (input.status === 'sent') throw new Error('sent status write failed')
    return super.updateMessage(input)
  }
}
