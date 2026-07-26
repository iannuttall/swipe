import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { loadConfig } from './config.js'
import { SesEmailProvider } from './providers.js'

describe('SesEmailProvider', () => {
  it('can boot without static AWS credentials', () => {
    assert.doesNotThrow(
      () =>
        new SesEmailProvider(
          loadConfig({
            NODE_ENV: 'test',
            EMAIL_FROM_EMAIL: 'from@example.com',
            EMAIL_PROVIDER: 'ses',
          }),
        ),
    )
  })
})
