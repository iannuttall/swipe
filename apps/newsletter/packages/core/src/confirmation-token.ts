import crypto from 'node:crypto'
import type {
  ConfirmationPurpose,
  ConfirmationRequestRecord,
} from './confirmation-types.js'

interface ConfirmationTokenPayload {
  kind: 'confirmation'
  requestId: string
  contactId: string
  purpose: ConfirmationPurpose
  expiresAt: string
}

export function createConfirmationToken(
  request: Pick<ConfirmationRequestRecord, 'id' | 'contactId' | 'purpose' | 'expiresAt'>,
  secret: string,
): string {
  const payload: ConfirmationTokenPayload = {
    kind: 'confirmation',
    requestId: request.id,
    contactId: request.contactId,
    purpose: request.purpose,
    expiresAt: request.expiresAt.toISOString(),
  }
  const body = Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url')
  const signature = crypto.createHmac('sha256', secret).update(body).digest('base64url')
  return `${body}.${signature}`
}

export function verifyConfirmationToken(
  token: string,
  secret: string,
): ConfirmationTokenPayload | null {
  const [body, signature] = token.split('.')
  if (!body || !signature) return null
  const expected = crypto.createHmac('sha256', secret).update(body).digest('base64url')
  if (!safeCompare(signature, expected)) return null

  try {
    const parsed = JSON.parse(Buffer.from(body, 'base64url').toString('utf8')) as unknown
    return isConfirmationPayload(parsed) ? parsed : null
  } catch {
    return null
  }
}

export function confirmationTokenHash(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex')
}

function safeCompare(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  return crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b))
}

function isConfirmationPayload(value: unknown): value is ConfirmationTokenPayload {
  if (!value || typeof value !== 'object') return false
  const payload = value as Partial<ConfirmationTokenPayload>
  return (
    payload.kind === 'confirmation' &&
    typeof payload.requestId === 'string' &&
    typeof payload.contactId === 'string' &&
    (payload.purpose === 'double_opt_in' || payload.purpose === 'swipe_migration') &&
    typeof payload.expiresAt === 'string' &&
    !Number.isNaN(Date.parse(payload.expiresAt))
  )
}
