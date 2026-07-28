import crypto from 'node:crypto'
import type { AppConfig } from './config.js'
import { requireSecret } from './config.js'
import { confirmationTokenHash, createConfirmationToken } from './confirmation-token.js'
import type {
  ConfirmationPurpose,
  ConfirmationRequestInput,
  ConfirmationRequestRecord,
} from './confirmation-types.js'
import type { EmailStore } from './store.js'

export async function usableOrNewRequest(input: {
  store: EmailStore
  config: AppConfig
  contactId: string
  purpose: ConfirmationPurpose
  batchKey?: string
  source: string
  requestedAt: Date
  expiresAt: Date
  metadata?: Record<string, unknown>
}): Promise<ConfirmationRequestRecord> {
  const existing = await input.store.confirmations.findRequest(input)
  if (
    existing &&
    (existing.status === 'confirmed' ||
      (existing.status === 'pending' &&
        existing.expiresAt.getTime() > input.requestedAt.getTime()))
  ) {
    requestUrl(existing, input.config)
    return existing
  }
  if (existing?.status === 'pending') {
    await input.store.confirmations.expireRequest(existing.id)
  }
  const requestInput = newConfirmationRequest(input)
  await input.store.confirmations.createRequests([requestInput])
  const request = await input.store.confirmations.findByTokenHash(requestInput.tokenHash)
  if (!request) throw new Error('Failed to create confirmation request')
  return request
}

export function newConfirmationRequest(input: {
  config: AppConfig
  contactId: string
  purpose: ConfirmationPurpose
  batchKey?: string
  source: string
  requestedAt: Date
  expiresAt: Date
  metadata?: Record<string, unknown>
}): ConfirmationRequestInput {
  const request = {
    id: crypto.randomUUID(),
    contactId: input.contactId,
    purpose: input.purpose,
    expiresAt: input.expiresAt,
  }
  const token = createConfirmationToken(
    request,
    requireSecret(input.config.confirmation.secret, 'CONFIRMATION_SECRET'),
  )
  return {
    ...request,
    ...(input.batchKey ? { batchKey: input.batchKey } : {}),
    tokenHash: confirmationTokenHash(token),
    source: input.source,
    requestedAt: input.requestedAt,
    ...(input.metadata ? { metadata: input.metadata } : {}),
  }
}

export function requestUrl(
  request: ConfirmationRequestRecord,
  config: AppConfig,
): string {
  const secret = requireSecret(config.confirmation.secret, 'CONFIRMATION_SECRET')
  const token = createConfirmationToken(request, secret)
  if (confirmationTokenHash(token) !== request.tokenHash) {
    throw new Error('Confirmation secret does not match the stored request')
  }
  return `${config.confirmation.baseUrl.replace(/\/$/, '')}/confirm?token=${encodeURIComponent(token)}`
}

export function assertConfirmationBatchKey(batchKey: string): void {
  if (!/^[a-z0-9][a-z0-9_-]{2,79}$/i.test(batchKey)) {
    throw new Error(
      'Confirmation batch key must be 3 to 80 letters, numbers, underscores, or hyphens',
    )
  }
}
