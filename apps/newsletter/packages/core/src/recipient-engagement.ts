import type { ContactRecord, MessageRecord } from './store.js'
import type { EngagementSummary, RecipientStatus } from './types.js'

export function emptyEngagement(contact: ContactRecord): EngagementSummary {
  return {
    contactId: contact.id,
    totalSends: 0,
    totalOpens: 0,
    totalClicks: 0,
    ...(contact.subscribedAt ? { lastSubscribedAt: contact.subscribedAt } : {}),
  }
}

export function recipientStatusFromMessage(
  message: MessageRecord,
): RecipientStatus | undefined {
  const status = message.metadata.recipientStatus
  return status === 'new' || status === 'warm' || status === 'cold' ? status : undefined
}
