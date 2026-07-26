import type { PlannedRecipient } from './types.js'

export function plannedRecipient(
  contact: { id: string; email: string; emailDomain: string },
  scheduledAt: Date,
  sendRank: number,
): PlannedRecipient {
  return {
    contactId: contact.id,
    email: contact.email,
    domain: contact.emailDomain,
    engagementScore: 0,
    sendRank,
    rankReason: 'default',
    status: 'new',
    scheduledAt,
  }
}
