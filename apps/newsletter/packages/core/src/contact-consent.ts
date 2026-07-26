import type { EmailStore } from './store.js'

export async function subscribeContact(
  store: EmailStore,
  input: { email: string; name?: string; source?: string },
): Promise<{ id: string }> {
  const activeSuppressions = await store.listActiveSuppressionsForEmail(input.email)
  const hardSuppressions = activeSuppressions.filter(
    (suppression) => suppression.reason !== 'unsubscribe',
  )
  if (hardSuppressions.length > 0) throw new Error('Email address is suppressed')

  const contact = await store.upsertContact(input)
  if (contact.status === 'unsubscribed' || activeSuppressions.length > 0) {
    await store.reactivateContact({ email: contact.email, contactId: contact.id })
  }
  await store.recordEvent({
    type: 'contact.subscribed',
    contactId: contact.id,
    source: input.source ?? 'api',
    metadata: { email: contact.email },
  })
  return { id: contact.id }
}

export async function unsubscribeContact(
  store: EmailStore,
  input: { emailOrId: string; broadcastId?: string; source?: string },
): Promise<{ unsubscribed: boolean; contactId: string; email: string }> {
  const contact = input.emailOrId.includes('@')
    ? await store.findContactByEmail(input.emailOrId)
    : await store.getContact(input.emailOrId)
  if (!contact) throw new Error(`Contact not found: ${input.emailOrId}`)
  if (input.broadcastId && !(await store.getBroadcast(input.broadcastId))) {
    throw new Error(`Broadcast not found: ${input.broadcastId}`)
  }

  await store.unsubscribeContact({ contactId: contact.id, email: contact.email })
  await store.recordEvent({
    type: 'contact.unsubscribed',
    contactId: contact.id,
    ...(input.broadcastId ? { broadcastId: input.broadcastId } : {}),
    source: input.source ?? 'cli',
    idempotencyKey: `manual-unsubscribe:${input.broadcastId ?? 'contact'}:${contact.id}`,
    metadata: { email: contact.email },
  })
  return { unsubscribed: true, contactId: contact.id, email: contact.email }
}
