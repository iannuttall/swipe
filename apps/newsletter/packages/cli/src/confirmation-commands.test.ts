import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { FakePlatform } from './fake-platform.test-helper.js'
import { runCli } from './index.js'

describe('confirmation CLI commands', () => {
  it('requires --yes before preparing migration requests', async () => {
    const output: string[] = []
    const code = await runCli(
      [
        'confirmation',
        'prepare',
        '--batch-key',
        'swipe-migration-2026',
        '--expires-at',
        '2099-08-03T00:00:00.000Z',
        '--json',
      ],
      {
        platform: new FakePlatform(),
        stdout: (text) => output.push(text),
      },
    )
    assert.equal(code, 1)
    assert.match(output.join(''), /without --yes/)
  })

  it('reports a dry run before migration cleanup', async () => {
    const output: string[] = []
    const code = await runCli(
      [
        'confirmation',
        'unsubscribe-unconfirmed',
        '--batch-key',
        'swipe-migration-2026',
        '--expired-before',
        '2100-08-04T00:00:00.000Z',
        '--json',
      ],
      {
        platform: new FakePlatform(),
        stdout: (text) => output.push(text),
      },
    )
    assert.equal(code, 0)
    assert.deepEqual(JSON.parse(output.join('')).data, {
      matched: 1,
      unsubscribed: 0,
      dryRun: true,
    })
  })
})
