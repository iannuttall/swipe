import crypto from 'node:crypto'
import type {
  ConfirmationPurpose,
  ConfirmationRequestRecord,
} from './confirmation-types.js'
import { isEmailLike, normalizeEmail } from './email-address.js'

interface ConfirmationTokenPayload {
  kind: 'confirmation'
  requestId: string
  contactId: string
  purpose: ConfirmationPurpose
  expiresAt: string
}

export interface SwipeInviteTokenPayload {
  kind: 'swipe_invite'
  email: string
  batchKey: string
  expiresAt: string
}

const swipeInviteVersion = 'v1'
const swipeInviteAad = Buffer.from('swipe-invite:v1', 'utf8')
const swipeInviteNonceLength = 12
const swipeInviteTagLength = 16

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

export function createSwipeInviteToken(
  input: {
    email: string
    batchKey: string
    expiresAt: Date
  },
  secret: string,
): string {
  const payload: SwipeInviteTokenPayload = {
    kind: 'swipe_invite',
    email: normalizeEmail(input.email),
    batchKey: input.batchKey,
    expiresAt: input.expiresAt.toISOString(),
  }
  if (!isSwipeInvitePayload(payload)) {
    throw new Error('Invalid Swipe invitation payload')
  }

  const plaintext = Buffer.from(JSON.stringify(payload), 'utf8')
  const nonce = crypto
    .createHmac('sha256', secret)
    .update(swipeInviteAad)
    .update(plaintext)
    .digest()
    .subarray(0, swipeInviteNonceLength)
  const cipher = crypto.createCipheriv('aes-256-gcm', swipeInviteKey(secret), nonce)
  cipher.setAAD(swipeInviteAad)
  const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()])
  const tag = cipher.getAuthTag()
  const body = Buffer.concat([nonce, tag, ciphertext]).toString('base64url')
  return `${swipeInviteVersion}.${body}`
}

export function verifySwipeInviteToken(
  token: string,
  secret: string,
): SwipeInviteTokenPayload | null {
  const [version, body, extra] = token.split('.')
  if (version !== swipeInviteVersion || !body || extra) return null

  try {
    const encrypted = Buffer.from(body, 'base64url')
    if (encrypted.length <= swipeInviteNonceLength + swipeInviteTagLength) return null
    const nonce = encrypted.subarray(0, swipeInviteNonceLength)
    const tag = encrypted.subarray(
      swipeInviteNonceLength,
      swipeInviteNonceLength + swipeInviteTagLength,
    )
    const ciphertext = encrypted.subarray(swipeInviteNonceLength + swipeInviteTagLength)
    const decipher = crypto.createDecipheriv('aes-256-gcm', swipeInviteKey(secret), nonce)
    decipher.setAAD(swipeInviteAad)
    decipher.setAuthTag(tag)
    const plaintext = Buffer.concat([decipher.update(ciphertext), decipher.final()])
    const expectedNonce = crypto
      .createHmac('sha256', secret)
      .update(swipeInviteAad)
      .update(plaintext)
      .digest()
      .subarray(0, swipeInviteNonceLength)
    if (!safeCompare(nonce.toString('base64url'), expectedNonce.toString('base64url'))) {
      return null
    }
    const parsed = JSON.parse(plaintext.toString('utf8')) as unknown
    return isSwipeInvitePayload(parsed) ? parsed : null
  } catch {
    return null
  }
}

function swipeInviteKey(secret: string): Buffer {
  return crypto
    .createHash('sha256')
    .update('swipe-invite-encryption\0', 'utf8')
    .update(secret, 'utf8')
    .digest()
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
    (payload.purpose === 'double_opt_in' ||
      payload.purpose === 'swipe_invite' ||
      payload.purpose === 'swipe_migration') &&
    typeof payload.expiresAt === 'string' &&
    !Number.isNaN(Date.parse(payload.expiresAt))
  )
}

function isSwipeInvitePayload(value: unknown): value is SwipeInviteTokenPayload {
  if (!value || typeof value !== 'object') return false
  const payload = value as Partial<SwipeInviteTokenPayload>
  return (
    payload.kind === 'swipe_invite' &&
    typeof payload.email === 'string' &&
    payload.email === normalizeEmail(payload.email) &&
    isEmailLike(payload.email) &&
    typeof payload.batchKey === 'string' &&
    /^[a-z0-9][a-z0-9_-]{2,79}$/i.test(payload.batchKey) &&
    typeof payload.expiresAt === 'string' &&
    !Number.isNaN(Date.parse(payload.expiresAt))
  )
}
