import type { ContactRecord, EventRecord } from './store.js'
import type { EngagementSummary } from './types.js'

export function getMemoryEngagement(
  contacts: Iterable<ContactRecord>,
  events: EventRecord[],
  contactIds: string[],
): Map<string, EngagementSummary> {
  const wanted = new Set(contactIds)
  const contactsById = new Map(Array.from(contacts, (contact) => [contact.id, contact]))
  const engagement = new Map<string, EngagementSummary>()
  for (const id of wanted) {
    const contact = contactsById.get(id)
    engagement.set(id, {
      contactId: id,
      totalSends: 0,
      totalOpens: 0,
      totalClicks: 0,
      ...(contact?.subscribedAt ? { lastSubscribedAt: contact.subscribedAt } : {}),
    })
  }

  for (const event of events) {
    if (!event.contactId || !wanted.has(event.contactId)) continue
    const current = engagement.get(event.contactId)
    if (!current) continue
    if (event.type === 'message.sent') current.totalSends += 1
    if (event.type === 'engagement.opened') {
      current.totalOpens += 1
      current.lastOpenedAt = latest(current.lastOpenedAt, event.occurredAt)
    }
    if (event.type === 'engagement.clicked') {
      current.totalClicks += 1
      current.lastClickedAt = latest(current.lastClickedAt, event.occurredAt)
    }
  }
  return engagement
}

function latest(current: Date | undefined, candidate: Date): Date {
  return !current || current.getTime() < candidate.getTime() ? candidate : current
}
