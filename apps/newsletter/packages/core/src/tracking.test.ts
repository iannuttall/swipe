import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  classifyTrackingRequest,
  createTrackingToken,
  tokenHash,
  verifyTrackingToken,
} from './tracking.js'

describe('tracking tokens', () => {
  it('round trips signed payloads', () => {
    const token = createTrackingToken(
      { kind: 'click', messageId: 'm1', contactId: 'c1', linkId: 'l1' },
      'secret',
    )

    assert.deepEqual(verifyTrackingToken(token, 'secret'), {
      kind: 'click',
      messageId: 'm1',
      contactId: 'c1',
      linkId: 'l1',
    })
  })

  it('rejects tampered tokens', () => {
    const token = createTrackingToken({ kind: 'open', messageId: 'm1' }, 'secret')
    assert.equal(verifyTrackingToken(`${token}x`, 'secret'), null)
  })

  it('hashes tokens for lookup without storing raw tokens', () => {
    const token = createTrackingToken({ kind: 'open', messageId: 'm1' }, 'secret')
    assert.equal(tokenHash(token).length, 64)
  })

  it('classifies scanners and normal browsers', () => {
    assert.deepEqual(classifyTrackingRequest({}), {
      isBot: true,
      reason: 'missing_user_agent',
    })
    assert.equal(
      classifyTrackingRequest({ userAgent: 'curl/8.7.1' }).reason,
      'http_client',
    )
    assert.equal(
      classifyTrackingRequest({ userAgent: 'Proofpoint URL Defense' }).reason,
      'security_gateway',
    )
    assert.equal(
      classifyTrackingRequest({
        userAgent:
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_5) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Safari/605.1.15',
      }).isBot,
      false,
    )
  })
})
