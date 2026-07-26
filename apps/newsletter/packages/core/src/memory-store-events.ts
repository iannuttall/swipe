import type { EventRecord, MessageRecord } from './store.js'

export function eventsForBroadcast(
  events: EventRecord[],
  messages: MessageRecord[],
  broadcastId: string,
): EventRecord[] {
  const messageIds = new Set(messages.map((message) => message.id))
  return events.filter(
    (event) =>
      event.broadcastId === broadcastId ||
      (event.messageId !== undefined && messageIds.has(event.messageId)),
  )
}
