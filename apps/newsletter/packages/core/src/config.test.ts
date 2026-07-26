import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { ZodError } from 'zod'
import { loadConfig } from './config.js'

describe('loadConfig', () => {
  it('requires a positive provider send rate override', () => {
    assert.throws(
      () => loadConfig({ NODE_ENV: 'test', EMAIL_SEND_RATE_PER_SECOND: '0' }),
      ZodError,
    )
  })

  it('rejects placeholder secrets outside tests', () => {
    assert.throws(
      () => loadConfig({ API_TOKEN: 'replace-me' }),
      /API_TOKEN must not use a placeholder secret/,
    )
    assert.doesNotThrow(() => loadConfig({ NODE_ENV: 'test', API_TOKEN: 'replace-me' }))
  })
})
