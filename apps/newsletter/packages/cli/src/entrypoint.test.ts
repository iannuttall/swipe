import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { it } from 'node:test'
import { fileURLToPath } from 'node:url'
import { runCli } from './index.js'

it('runs a complete local template preflight without creating platform state', async () => {
  let output = ''
  const exitCode = await runCli(
    [
      'template',
      'preflight',
      '--subject',
      'Useful tools',
      '--body',
      'Hello\n\n[Unsubscribe]({{unsubscribeUrl}})',
      '--from-email',
      'ian@swipe.md',
      '--base-url',
      'https://swipe.md',
      '--spamassassin-command',
      fileURLToPath(new URL('../test-fixtures/spamassassin-pass.sh', import.meta.url)),
      '--json',
    ],
    {
      env: { ...process.env, NODE_ENV: 'test' },
      stdout: (text) => {
        output += text
      },
    },
  )

  assert.equal(exitCode, 0)
  const result = JSON.parse(output)
  assert.equal(result.ok, true)
  assert.equal(result.data.ready, true)
  assert.equal(result.data.spamAssassin.score, 0.1)
})

it('exits cleanly after parallel database connection failures', () => {
  const result = spawnSync(
    process.execPath,
    [
      fileURLToPath(new URL('./index.js', import.meta.url)),
      'audience',
      'preview',
      '--json',
    ],
    {
      encoding: 'utf8',
      env: {
        ...process.env,
        DATABASE_URL: 'postgresql://postgres:postgres@127.0.0.1:1/email',
        NODE_ENV: 'test',
      },
      timeout: 5_000,
    },
  )

  assert.equal(result.error, undefined)
  assert.equal(result.status, 1)
  assert.doesNotMatch(result.stderr, /unsettled top-level await/i)
  assert.equal(JSON.parse(result.stdout).ok, false)
})
