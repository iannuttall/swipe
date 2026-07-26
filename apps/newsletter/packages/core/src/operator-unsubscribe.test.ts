import assert from 'node:assert/strict'
import { it } from 'node:test'
import { loadConfig } from './config.js'
import { CoreEmailPlatform } from './platform.js'
import { TestEmailProvider } from './providers.js'
import { MemoryEmailStore } from './store.js'

it('unsubscribes contacts by email for operators', async () => {
  const store = new MemoryEmailStore()
  const platform = new CoreEmailPlatform({
    store,
    provider: new TestEmailProvider(),
    config: loadConfig({ NODE_ENV: 'test', EMAIL_FROM_EMAIL: 'from@example.com' }),
  })

  await platform.subscribe({ email: 'gone@example.com' })
  const draft = await platform.createDraft({ subject: 'Subject', bodyMarkdown: 'Body' })
  const broadcast = await platform.createBroadcast({
    draftId: draft.id,
    scheduledAt: new Date(0),
  })

  const input = {
    emailOrId: 'gone@example.com',
    broadcastId: broadcast.id,
    source: 'manual-recovery',
  }
  const result = await platform.unsubscribeContact(input)
  await platform.unsubscribeContact(input)

  assert.equal(result.email, 'gone@example.com')
  assert.equal((await platform.previewAudience()).total, 0)
  assert.equal((await platform.getBroadcastStats(broadcast.id))?.unsubscribed, 1)
})
