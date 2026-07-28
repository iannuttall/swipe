import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { loadConfig } from './config.js'
import { confirmationTokenHash, createConfirmationToken } from './confirmation-token.js'
import { CoreEmailPlatform } from './platform.js'
import {
  type ProviderSendInput,
  type ProviderSendResult,
  TestEmailProvider,
} from './providers.js'
import { MemoryEmailStore } from './store.js'
import { welcomeEmailContent } from './welcome-template.js'

function makePlatform(
  input: {
    doubleOptIn?: boolean
    nowBaseUrl?: string
    provider?: TestEmailProvider
  } = {},
) {
  const store = new MemoryEmailStore()
  const provider = input.provider ?? new TestEmailProvider()
  const config = loadConfig({
    NODE_ENV: 'test',
    APP_NAME: 'Swipe',
    BASE_URL: 'https://swipe.md',
    EMAIL_FROM_EMAIL: 'ian@swipe.md',
    EMAIL_FROM_NAME: 'Swipe',
    EMAIL_CONFIRMATION_BASE_URL: input.nowBaseUrl ?? 'https://swipe.md',
    EMAIL_DOUBLE_OPT_IN: String(input.doubleOptIn ?? true),
    CONFIRMATION_SECRET: 'confirmation-secret',
    SWIPE_INVITE_SECRET: 'shared-swipe-invite-secret',
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
    assert.equal(provider.sent.length, 2)
    const welcome = provider.sent[1]
    assert.equal(welcome?.subject, welcomeEmailContent.subject)
    assert.equal(welcome?.fromName, 'Swipe')
    assert.equal(welcome?.replyTo, 'ian@swipe.md')
    assert.match(welcome?.html ?? '', /move it from Promotions to Primary/)
    assert.match(welcome?.html ?? '', /ian@swipe\.md/)
    assert.match(welcome?.html ?? '', /https:\/\/swipe\.md\/unsubscribe\//)
    assert.ok(
      welcome?.headers?.some(
        (header) =>
          header.name === 'List-Unsubscribe' &&
          header.value.startsWith('<https://swipe.md/unsubscribe/'),
      ),
    )

    const repeated = await platform.confirmSubscription({ token })
    assert.equal(repeated.confirmed, true)
    assert.equal(repeated.alreadyConfirmed, true)
    assert.equal(provider.sent.length, 2)
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

  it('creates a Swipe contact only after an encrypted Ian invitation is confirmed', async () => {
    const ian = makePlatform({ doubleOptIn: false })
    await ian.platform.subscribe({ email: 'reader@example.com' })
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1_000)
    const draft = await ian.platform.createDraft({
      subject: 'Swipe is moving',
      bodyMarkdown: '[Keep sending me Swipe]({{confirmationUrl}})',
      metadata: {
        confirmation: {
          purpose: 'swipe_invite',
          batchKey: 'ians-list-to-swipe-2026',
          expiresAt: expiresAt.toISOString(),
        },
      },
    })
    await ian.platform.createBroadcast({
      draftId: draft.id,
      scheduledAt: new Date(0),
    })

    await ian.platform.sendDue(new Date(), 10)

    const sentHtml = ian.provider.sent[0]?.html ?? ''
    assert.match(sentHtml, /href="https:\/\/swipe\.md\/confirm\?token=/)
    assert.equal(
      Array.from(ian.store.links.values()).some((link) =>
        link.originalUrl.startsWith('https://swipe.md/confirm?token='),
      ),
      false,
    )
    assert.equal(ian.store.confirmations.requests.size, 0)

    const token = confirmationToken(sentHtml)
    assert.equal(
      token.includes(Buffer.from('reader@example.com').toString('base64url')),
      false,
    )

    const swipe = makePlatform()
    assert.equal(await swipe.store.findContactByEmail('reader@example.com'), undefined)
    const confirmed = await swipe.platform.confirmSubscription({
      token,
      ip: '203.0.113.20',
      sourceUrl: 'https://swipe.md/confirm',
    })
    assert.deepEqual(confirmed, {
      confirmed: true,
      alreadyConfirmed: false,
      status: 'confirmed',
      purpose: 'swipe_invite',
    })
    assert.equal(
      (await swipe.store.findContactByEmail('reader@example.com'))?.status,
      'active',
    )
    assert.equal(swipe.provider.sent.length, 1)
    assert.equal(swipe.provider.sent[0]?.subject, welcomeEmailContent.subject)
    assert.deepEqual(
      await swipe.platform.getConfirmationReport({
        purpose: 'swipe_invite',
        batchKey: 'ians-list-to-swipe-2026',
      }),
      {
        purpose: 'swipe_invite',
        batchKey: 'ians-list-to-swipe-2026',
        total: 1,
        pending: 0,
        confirmed: 1,
        expired: 0,
        cancelled: 0,
        activeUnconfirmed: 0,
      },
    )

    const repeated = await swipe.platform.confirmSubscription({ token })
    assert.equal(repeated.confirmed, true)
    assert.equal(repeated.alreadyConfirmed, true)
    assert.equal(swipe.provider.sent.length, 1)
  })

  it('keeps the confirmed subscription when the welcome email fails', async () => {
    const provider = new FailingWelcomeProvider()
    const { platform, store } = makePlatform({ provider })
    await platform.subscribe({ email: 'reader@example.com' })
    const token = confirmationToken(provider.sent[0]?.html ?? '')
    const originalConsoleError = console.error
    console.error = () => undefined

    try {
      const result = await platform.confirmSubscription({ token })

      assert.equal(result.confirmed, true)
      assert.equal(
        (await store.findContactByEmail('reader@example.com'))?.status,
        'active',
      )
      assert.equal((await platform.previewAudience()).total, 1)
      assert.equal(provider.sent.length, 2)
    } finally {
      console.error = originalConsoleError
    }
  })
})

class FailingWelcomeProvider extends TestEmailProvider {
  override async send(input: ProviderSendInput): Promise<ProviderSendResult> {
    const result = await super.send(input)
    if (this.sent.length === 2) throw new Error('Welcome send failed')
    return result
  }
}

function confirmationTokenForRequest(
  request: Parameters<typeof createConfirmationToken>[0],
  secret: string,
): string {
  return createConfirmationToken(request, secret)
}
