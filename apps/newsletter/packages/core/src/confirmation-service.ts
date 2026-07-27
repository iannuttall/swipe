import type { AppConfig } from './config.js'
import { requireSecret } from './config.js'
import {
  assertConfirmationBatchKey,
  newConfirmationRequest,
  requestUrl,
  usableOrNewRequest,
} from './confirmation-request.js'
import { doubleOptInEmail } from './confirmation-template.js'
import { confirmationTokenHash, verifyConfirmationToken } from './confirmation-token.js'
import type { ConfirmationPurpose, ConfirmationReport } from './confirmation-types.js'
import { subscribeContact } from './contact-consent.js'
import type { EmailProvider } from './providers.js'
import type { EmailStore } from './store.js'
import { ipHash } from './tracking.js'

export async function subscribeWithConfirmation(
  deps: { store: EmailStore; provider: EmailProvider; config: AppConfig },
  input: { email: string; name?: string; source?: string },
): Promise<{
  id: string
  status: 'active' | 'pending'
  confirmationSent: boolean
}> {
  if (!deps.config.confirmation.doubleOptIn) {
    const result = await subscribeContact(deps.store, input)
    return { ...result, status: 'active', confirmationSent: false }
  }

  const activeSuppressions = await deps.store.listActiveSuppressionsForEmail(input.email)
  if (activeSuppressions.some((suppression) => suppression.reason !== 'unsubscribe')) {
    throw new Error('Email address is suppressed')
  }
  const contact = await deps.store.confirmations.upsertPendingContact(input)
  if (contact.status === 'active') {
    return { id: contact.id, status: 'active', confirmationSent: false }
  }

  const now = new Date()
  const request = await usableOrNewRequest({
    store: deps.store,
    config: deps.config,
    contactId: contact.id,
    purpose: 'double_opt_in',
    source: input.source ?? 'signup',
    requestedAt: now,
    expiresAt: new Date(
      now.getTime() + deps.config.confirmation.ttlHours * 60 * 60 * 1000,
    ),
  })
  const confirmationUrl = requestUrl(request, deps.config)
  await deps.provider.send(
    doubleOptInEmail({
      config: deps.config,
      email: contact.email,
      confirmationUrl,
    }),
  )
  return { id: contact.id, status: 'pending', confirmationSent: true }
}

export async function prepareMigrationConfirmations(
  deps: { store: EmailStore; config: AppConfig },
  input: {
    batchKey: string
    expiresAt: Date
    source?: string
    now?: Date
  },
): Promise<ConfirmationReport & { created: number }> {
  assertConfirmationBatchKey(input.batchKey)
  const now = input.now ?? new Date()
  if (input.expiresAt.getTime() <= now.getTime()) {
    throw new Error('Confirmation expiry must be in the future')
  }
  const audience = await deps.store.resolveAudience({})
  const requests = audience.contacts.map((contact) =>
    newConfirmationRequest({
      config: deps.config,
      contactId: contact.id,
      purpose: 'swipe_migration',
      batchKey: input.batchKey,
      source: input.source ?? 'swipe-migration',
      requestedAt: now,
      expiresAt: input.expiresAt,
    }),
  )
  const created = await deps.store.confirmations.createRequests(requests)
  const report = await deps.store.confirmations.report({
    purpose: 'swipe_migration',
    batchKey: input.batchKey,
  })
  return { ...report, created }
}

export async function confirmSubscription(
  deps: { store: EmailStore; config: AppConfig },
  input: {
    token: string
    ip?: string
    userAgent?: string
    sourceUrl?: string
    now?: Date
  },
): Promise<{
  confirmed: boolean
  alreadyConfirmed: boolean
  status: 'confirmed' | 'expired' | 'invalid'
  purpose?: ConfirmationPurpose
}> {
  const secret = requireSecret(deps.config.confirmation.secret, 'CONFIRMATION_SECRET')
  const payload = verifyConfirmationToken(input.token, secret)
  if (!payload) {
    return { confirmed: false, alreadyConfirmed: false, status: 'invalid' }
  }
  const request = await deps.store.confirmations.findByTokenHash(
    confirmationTokenHash(input.token),
  )
  if (
    !request ||
    request.id !== payload.requestId ||
    request.contactId !== payload.contactId ||
    request.purpose !== payload.purpose ||
    request.expiresAt.toISOString() !== payload.expiresAt
  ) {
    return { confirmed: false, alreadyConfirmed: false, status: 'invalid' }
  }
  if (request.status === 'confirmed') {
    return {
      confirmed: true,
      alreadyConfirmed: true,
      status: 'confirmed',
      purpose: request.purpose,
    }
  }
  const now = input.now ?? new Date()
  if (request.status !== 'pending' || request.expiresAt.getTime() <= now.getTime()) {
    await deps.store.confirmations.expireRequest(request.id)
    return {
      confirmed: false,
      alreadyConfirmed: false,
      status: 'expired',
      purpose: request.purpose,
    }
  }
  const confirmed = await deps.store.confirmations.confirmRequest({
    id: request.id,
    confirmedAt: now,
    ...(input.ip ? { confirmedIpHash: ipHash(input.ip, secret) } : {}),
    ...(input.userAgent ? { confirmedUserAgent: input.userAgent.slice(0, 500) } : {}),
    ...(input.sourceUrl
      ? { confirmedSourceUrl: sanitizeConfirmationSourceUrl(input.sourceUrl) }
      : {}),
  })
  const success = confirmed?.status === 'confirmed'
  return {
    confirmed: success,
    alreadyConfirmed: false,
    status: success ? 'confirmed' : 'invalid',
    purpose: request.purpose,
  }
}

function sanitizeConfirmationSourceUrl(value: string): string {
  try {
    const url = new URL(value)
    if (url.pathname.startsWith('/confirm/')) url.pathname = '/confirm'
    url.search = ''
    url.hash = ''
    return url.toString().slice(0, 1_000)
  } catch {
    return 'invalid'
  }
}

export async function unsubscribeUnconfirmedMigration(
  store: EmailStore,
  input: {
    batchKey: string
    expiredBefore: Date
    execute?: boolean
    source?: string
  },
) {
  assertConfirmationBatchKey(input.batchKey)
  return store.confirmations.unsubscribeUnconfirmed({
    purpose: 'swipe_migration',
    batchKey: input.batchKey,
    expiredBefore: input.expiredBefore,
    source: input.source ?? 'swipe-migration-cleanup',
    execute: input.execute ?? false,
  })
}
