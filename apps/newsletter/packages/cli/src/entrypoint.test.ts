import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { it } from 'node:test'
import { fileURLToPath } from 'node:url'

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
