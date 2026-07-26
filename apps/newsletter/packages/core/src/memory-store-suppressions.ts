import type { ContactRecord, SuppressionRecord } from './store.js'
import type { SuppressionReason } from './types.js'

export type MemorySuppression = SuppressionRecord

export function applySuppressionToContact(
  contact: ContactRecord,
  reason: SuppressionReason,
  now: Date,
): void {
  contact.status = reason === 'unsubscribe' ? 'unsubscribed' : 'suppressed'
  if (reason === 'unsubscribe') {
    contact.unsubscribedAt = now
    delete contact.suppressedAt
    return
  }
  contact.suppressedAt = now
}

export function matchesSuppressionTarget(
  suppression: MemorySuppression,
  input: { email: string; domain: string; contactId?: string },
): boolean {
  return (
    suppression.email === input.email ||
    suppression.domain === input.domain ||
    (suppression.contactId !== undefined &&
      input.contactId !== undefined &&
      suppression.contactId === input.contactId)
  )
}
