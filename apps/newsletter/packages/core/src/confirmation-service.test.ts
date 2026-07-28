import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { loadConfig } from './config.js'
import { confirmationTokenHash, createConfirmationToken } from './confirmation-token.js'
import { CoreEmailPlatform } from './platform.js'
import { TestEmailProvider } from './providers.js'
import { MemoryEmailStore } from './store.js'

function makePlatform(input: { doubleOptIn?: boolean; nowBaseUrl?: string } = {}) {
  const store = new MemoryEmailStore()
  const provider = new TestEmailProvider()
  const config = loadConfig({
    NODE_ENV: 'test',
    APP_NAME: 'Swipe',
    EMAIL_FROM_EMAIL: 'ian@swipe.md',
    EMAIL_CONFIRMATION_BASE_URL: input.nowBaseUrl ?? 'https://swipe.md',
    EMAIL_DOUBLE_OPT_IN: String(input.doubleOptIn ?? true),
    CONFIRMATION_SECRET: 'confirmation-secret',
  })
  const platform = new CoreEmailPlatform({ store, provider, config })
  return { platform, provider, store }
}

function confirmationToken(html: string): string {
  const token = html.match(/https:\/\/swipe\.md\/confirm\?token=([^"]+)/)?.[1]
  assert.ok(token)
  return decodeURIComponent(token)
}

describe('subscriber confirmations', () => {
  it('keeps a new signup pending until its signed link is confirmed', async () => {
    const { platform, provider, store } = makePlatform()

    const signup = await platform.subscribe({
      email: 'reader@example.com',
      source: 'swipe.md',
    })

    assert.equal(signup.status, 'pending')
    assert.equal(signup.confirmationSent, true)
    assert.equal(
      (await store.findContactByEmail('reader@example.com'))?.status,
      'pending',
    )
    assert.equal((await platform.previewAudience()).total, 0)
    assert.equal(provider.sent.length, 1)

    const token = confirmationToken(provider.sent[0]?.html ?? '')
    const request = await store.confirmations.findByTokenHash(
      confirmationTokenHash(token),
    )
    assert.ok(request)
    assert.equal(JSON.stringify(request).includes(token), false)

    const result = await platform.confirmSubscription({
      token,
      ip: '203.0.113.5',
      userAgent: 'Mozilla/5.0 Test Browser',
      sourceUrl: `https://swipe.md/confirm?token=${encodeURIComponent(token)}`,
    })
    assert.deepEqual(result, {
      confirmed: true,
      alreadyConfirmed: false,
      status: 'confirmed',
      purpose: 'double_opt_in',
    })
    assert.equal((await store.findContactByEmail('reader@example.com'))?.status, 'active')
    assert.equal((await platform.previewAudience()).total, 1)
    assert.ok(request.confirmedIpHash)
    assert.notEqual(request.confirmedIpHash, '203.0.113.5')
    assert.equal(JSON.stringify(request).includes(token), false)
    assert.equal(
      store.events.filter((event) => event.type === 'contact.subscribed').length,
      1,
    )

    const repeated = await platform.confirmSubscription({ token })
    assert.equal(repeated.confirmed, true)
    assert.equal(repeated.alreadyConfirmed, true)
  })

  it('does not send another confirmation to an active contact', async () => {
    const { platform, provider, store } = makePlatform({ doubleOptIn: false })
    await platform.subscribe({ email: 'active@example.com' })
    const confirmationPlatform = new CoreEmailPlatform({
      store,
      provider,
      config: loadConfig({
        NODE_ENV: 'test',
        APP_NAME: 'Swipe',
        EMAIL_FROM_EMAIL: 'ian@swipe.md',
        EMAIL_DOUBLE_OPT_IN: 'true',
        CONFIRMATION_SECRET: 'confirmation-secret',
      }),
    })

    const result = await confirmationPlatform.subscribe({
      email: 'active@example.com',
    })

    assert.equal(result.status, 'active')
    assert.equal(result.confirmationSent, false)
    assert.equal(provider.sent.length, 0)
  })

  it('prepares an idempotent migration batch and cleans up only its non-confirmers', async () => {
    const { platform, store } = makePlatform({ doubleOptIn: false })
    await platform.subscribe({ email: 'keep@example.com' })
    await platform.subscribe({ email: 'remove@example.com' })
    await platform.subscribe({ email: 'already-gone@example.com' })
    await platform.unsubscribeContact({ emailOrId: 'already-gone@example.com' })
    const expiresAt = new Date('2099-08-03T12:00:00.000Z')

    const first = await platform.prepareMigrationConfirmations({
      batchKey: 'swipe-migration-2026',
      expiresAt,
      source: 'transition-email',
    })
    const repeated = await platform.prepareMigrationConfirmations({
      batchKey: 'swipe-migration-2026',
      expiresAt,
      source: 'transition-email',
    })
    assert.equal(first.created, 2)
    assert.equal(first.total, 2)
    assert.equal(repeated.created, 0)

    const keep = await store.findContactByEmail('keep@example.com')
    assert.ok(keep)
    const keepRequest = await store.confirmations.findRequest({
      contactId: keep.id,
      purpose: 'swipe_migration',
      batchKey: 'swipe-migration-2026',
    })
    assert.ok(keepRequest)
    const token = confirmationTokenForRequest(keepRequest, 'confirmation-secret')
    await platform.confirmSubscription({ token })

    const dryRun = await platform.unsubscribeUnconfirmedMigration({
      batchKey: 'swipe-migration-2026',
      expiredBefore: new Date('2100-08-04T00:00:00.000Z'),
    })
    assert.deepEqual(dryRun, { matched: 1, unsubscribed: 0 })
    assert.equal((await store.findContactByEmail('remove@example.com'))?.status, 'active')

    const executed = await platform.unsubscribeUnconfirmedMigration({
      batchKey: 'swipe-migration-2026',
      expiredBefore: new Date('2100-08-04T00:00:00.000Z'),
      execute: true,
    })
    assert.deepEqual(executed, { matched: 1, unsubscribed: 1 })
    assert.equal((await store.findContactByEmail('keep@example.com'))?.status, 'active')
    assert.equal(
      (await store.findContactByEmail('remove@example.com'))?.status,
      'unsubscribed',
    )
    assert.equal(
      (await store.findContactByEmail('already-gone@example.com'))?.status,
      'unsubscribed',
    )
  })

  it('personalizes migration links without storing them as tracked URLs', async () => {
    const { platform, provider, store } = makePlatform({ doubleOptIn: false })
    await platform.subscribe({ email: 'reader@example.com' })
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1_000)
    await platform.prepareMigrationConfirmations({
      batchKey: 'swipe-migration-2026',
      expiresAt,
    })
    const draft = await platform.createDraft({
      subject: 'Swipe is moving',
      bodyMarkdown: '[Keep sending me Swipe]({{confirmationUrl}})',
      metadata: {
        confirmation: {
          purpose: 'swipe_migration',
          batchKey: 'swipe-migration-2026',
          expiresAt: expiresAt.toISOString(),
        },
      },
    })
    await platform.createBroadcast({
      draftId: draft.id,
      scheduledAt: new Date(0),
    })

    await platform.sendDue(new Date(), 10)

    const sentHtml = provider.sent[0]?.html ?? ''
    assert.match(sentHtml, /href="https:\/\/swipe\.md\/confirm\?token=/)
    assert.equal(
      Array.from(store.links.values()).some((link) =>
        link.originalUrl.startsWith('https://swipe.md/confirm?token='),
      ),
      false,
    )
  })
})

function confirmationTokenForRequest(
  request: Parameters<typeof createConfirmationToken>[0],
  secret: string,
): string {
  return createConfirmationToken(request, secret)
}
