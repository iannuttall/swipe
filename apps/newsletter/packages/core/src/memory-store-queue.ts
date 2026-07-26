import type {
  EventRecord,
  MessageRecord,
  QueueSummary,
  QueueSummaryInput,
} from './store.js'

export function getMemoryQueueSummary(
  messages: Iterable<MessageRecord>,
  events: EventRecord[],
  input: QueueSummaryInput,
): QueueSummary {
  const all = Array.from(messages)
  const plannedDue = all.filter(
    (message) =>
      message.status === 'planned' &&
      message.scheduledAt.getTime() <= input.now.getTime(),
  )
  const plannedFuture = all.filter(
    (message) =>
      message.status === 'planned' && message.scheduledAt.getTime() > input.now.getTime(),
  )
  const sending = all.filter((message) => message.status === 'sending')
  const recent = events.filter(
    (event) => event.occurredAt.getTime() >= input.since.getTime(),
  )

  return {
    generatedAt: input.now,
    plannedDue: plannedDue.length,
    plannedFuture: plannedFuture.length,
    sending: sending.length,
    staleSending: sending.filter(
      (message) =>
        message.attemptedAt &&
        message.attemptedAt.getTime() <= input.staleBefore.getTime(),
    ).length,
    failed: all.filter((message) => message.status === 'failed').length,
    bounced: all.filter((message) => message.status === 'bounced').length,
    complained: all.filter((message) => message.status === 'complained').length,
    recentBounces: recent.filter((event) => event.type === 'message.bounced').length,
    recentComplaints: recent.filter((event) => event.type === 'message.complained')
      .length,
    ...dateMin(
      'oldestDueAt',
      plannedDue.map((message) => message.scheduledAt),
    ),
    ...dateMin(
      'nextScheduledAt',
      plannedFuture.map((message) => message.scheduledAt),
    ),
  }
}

function dateMin<K extends string>(key: K, dates: Date[]): { [P in K]?: Date } {
  const timestamp = Math.min(...dates.map((date) => date.getTime()))
  return (Number.isFinite(timestamp) ? { [key]: new Date(timestamp) } : {}) as {
    [P in K]?: Date
  }
}
