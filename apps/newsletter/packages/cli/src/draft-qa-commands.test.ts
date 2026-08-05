import assert from 'node:assert/strict'
import { it } from 'node:test'
import { FakePlatform } from './fake-platform.test-helper.js'
import { runCli } from './index.js'

it('requires explicit confirmation before recording issue QA', async () => {
  const output: string[] = []
  const code = await runCli(
    [
      'draft',
      'qa-approve',
      '--draft-id',
      'draft_1',
      '--test-message-id',
      'message_1',
      '--checked-at',
      new Date().toISOString(),
      '--browser-checked-links',
      '3',
      '--archive-html-ok',
      '--archive-markdown-ok',
      '--json',
    ],
    { platform: new FakePlatform(), stdout: (text) => output.push(text) },
  )

  assert.equal(code, 2)
  assert.equal(
    JSON.parse(output.join('')).error,
    'Refusing to approve draft QA without --yes',
  )
})
