import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { createConfirmationToken, createSwipeInviteToken } from '@email/core'
import { authorized, makeTestApp } from './index.test-helper.js'

describe('confirmation routes', () => {
  it('protects migration preparation and confirms a signed request', async () => {
    const { app, store } = makeTestApp()
    const unauthorized = await app.request('/api/confirmations/migration/prepare', {
      method: 'POST',
      body: JSON.stringify({
        confirm: true,
        batchKey: 'swipe-migration-2026',
        expiresAt: '2099-08-03T00:00:00.000Z',
      }),
    })
    assert.equal(unauthorized.status, 401)

    await authorized(app, '/api/subscribe', { email: 'reader@example.com' })
    const prepared = await authorized(app, '/api/confirmations/migration/prepare', {
      confirm: true,
      batchKey: 'swipe-migration-2026',
      expiresAt: '2099-08-03T00:00:00.000Z',
    })
    assert.equal(prepared.created, 1)

    const request = Array.from(store.confirmations.requests.values())[0]
    assert.ok(request)
    const token = createConfirmationToken(request, 'test-secret')
    const confirmed = await authorized(app, '/api/confirmations/confirm', {
      token,
      ip: '203.0.113.10',
      userAgent: 'confirmation-route-test',
      sourceUrl: 'https://swipe.md/confirm',
    })
    assert.equal(confirmed.status, 'confirmed')
    assert.equal(confirmed.confirmed, true)
    assert.notEqual(request.confirmedIpHash, '203.0.113.10')
  })

  it('keeps migration cleanup in dry-run unless confirm is true', async () => {
    const { app } = makeTestApp()
    await authorized(app, '/api/subscribe', { email: 'reader@example.com' })
    await authorized(app, '/api/confirmations/migration/prepare', {
      confirm: true,
      batchKey: 'expired-migration',
      expiresAt: '2099-08-03T00:00:00.000Z',
    })
    const result = await authorized(
      app,
      '/api/confirmations/migration/unsubscribe-unconfirmed',
      {
        confirm: false,
        batchKey: 'expired-migration',
        expiredBefore: '2100-08-04T00:00:00.000Z',
      },
    )
    assert.deepEqual(result, { matched: 1, unsubscribed: 0 })
  })

  it('creates no contact for an invitation until its confirmed POST', async () => {
    const { app, store } = makeTestApp()
    const token = createSwipeInviteToken(
      {
        email: 'invited@example.com',
        batchKey: 'ians-list-to-swipe-2026',
        expiresAt: new Date('2099-08-03T00:00:00.000Z'),
      },
      'test-secret',
    )
    assert.equal(await store.findContactByEmail('invited@example.com'), undefined)

    const confirmed = await authorized(app, '/api/confirmations/confirm', {
      token,
      ip: '203.0.113.10',
      sourceUrl: 'https://swipe.md/confirm',
    })

    assert.equal(confirmed.status, 'confirmed')
    assert.equal(confirmed.purpose, 'swipe_invite')
    assert.equal(
      (await store.findContactByEmail('invited@example.com'))?.status,
      'active',
    )
  })
})
