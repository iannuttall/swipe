import assert from 'node:assert/strict'
import { it } from 'node:test'
import { FakePlatform } from './fake-platform.test-helper.js'
import { runCli } from './index.js'

it('unsubscribes a contact with optional broadcast attribution', async () => {
  const output: string[] = []
  const platform = new FakePlatform()
  const code = await runCli(
    [
      'contact',
      'unsubscribe',
      'gone@example.com',
      '--broadcast-id',
      'broadcast_1',
      '--source',
      'manual-recovery',
      '--json',
    ],
    { platform, stdout: (text) => output.push(text) },
  )

  assert.equal(code, 0)
  assert.deepEqual(platform.unsubscribedContact, {
    emailOrId: 'gone@example.com',
    broadcastId: 'broadcast_1',
    source: 'manual-recovery',
  })
  assert.deepEqual(JSON.parse(output.join('')).data, {
    unsubscribed: true,
    contactId: 'contact_1',
    email: 'gone@example.com',
  })
})
