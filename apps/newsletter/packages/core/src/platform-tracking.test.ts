import assert from 'node:assert/strict'
import crypto from 'node:crypto'
import { describe, it } from 'node:test'
import { loadConfig } from './config.js'
import { CoreEmailPlatform } from './platform.js'
import { TestEmailProvider } from './providers.js'
import { MemoryEmailStore } from './store.js'

describe('CoreEmailPlatform tracking', () => {
  it('rejects click tokens when the stored link no longer matches', async () => {
    const store = new MemoryEmailStore()
    const provider = new TestEmailProvider()
    const platform = new CoreEmailPlatform({
      store,
      provider,
      config: loadConfig({ NODE_ENV: 'test', EMAIL_FROM_EMAIL: 'from@example.com' }),
    })

    await platform.subscribe({ email: 'mismatch@example.com' })
    const draft = await platform.createDraft({
      subject: 'Tracked',
      bodyMarkdown: 'Read [this](https://example.com/read).',
    })
    await platform.createBroadcast({ draftId: draft.id, scheduledAt: new Date(0) })
    await platform.sendDue(new Date('2026-06-20T00:00:00.000Z'))

    const clickToken = provider.sent[0]?.html.match(/\/t\/click\/([^"]+)/)?.[1]
    const link = Array.from(store.links.values())[0]
    assert.ok(clickToken)
    assert.ok(link)
    link.messageId = crypto.randomUUID()

    assert.deepEqual(
      await platform.trackClick({
        token: clickToken,
        userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_5) AppleWebKit/605.1.15',
      }),
      { recorded: false },
    )
  })
})
