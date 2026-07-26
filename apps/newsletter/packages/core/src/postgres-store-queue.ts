import { sql } from 'drizzle-orm'
import type { Database } from './db/index.js'
import type { QueueSummary, QueueSummaryInput } from './store.js'

export async function getPostgresQueueSummary(
  db: Database,
  input: QueueSummaryInput,
): Promise<QueueSummary> {
  const [messages] = await db.execute(sql`
    select
      count(*) filter (where status = 'planned' and scheduled_at <= ${input.now.toISOString()}::timestamptz) as planned_due,
      count(*) filter (where status = 'planned' and scheduled_at > ${input.now.toISOString()}::timestamptz) as planned_future,
      count(*) filter (where status = 'sending') as sending,
      count(*) filter (where status = 'sending' and attempted_at <= ${input.staleBefore.toISOString()}::timestamptz) as stale_sending,
      count(*) filter (where status = 'failed') as failed,
      count(*) filter (where status = 'bounced') as bounced,
      count(*) filter (where status = 'complained') as complained,
      min(scheduled_at) filter (where status = 'planned' and scheduled_at <= ${input.now.toISOString()}::timestamptz) as oldest_due_at,
      min(scheduled_at) filter (where status = 'planned' and scheduled_at > ${input.now.toISOString()}::timestamptz) as next_scheduled_at
    from messages
  `)
  const [events] = await db.execute(sql`
    select
      count(*) filter (where type = 'message.bounced') as recent_bounces,
      count(*) filter (where type = 'message.complained') as recent_complaints
    from events
    where occurred_at >= ${input.since.toISOString()}::timestamptz
  `)
  const messageRow = messages as QueueMessageRow | undefined
  const eventRow = events as QueueEventRow | undefined

  return {
    generatedAt: input.now,
    plannedDue: numberValue(messageRow?.planned_due),
    plannedFuture: numberValue(messageRow?.planned_future),
    sending: numberValue(messageRow?.sending),
    staleSending: numberValue(messageRow?.stale_sending),
    failed: numberValue(messageRow?.failed),
    bounced: numberValue(messageRow?.bounced),
    complained: numberValue(messageRow?.complained),
    recentBounces: numberValue(eventRow?.recent_bounces),
    recentComplaints: numberValue(eventRow?.recent_complaints),
    ...dateValue('oldestDueAt', messageRow?.oldest_due_at),
    ...dateValue('nextScheduledAt', messageRow?.next_scheduled_at),
  }
}

interface QueueMessageRow {
  planned_due?: unknown
  planned_future?: unknown
  sending?: unknown
  stale_sending?: unknown
  failed?: unknown
  bounced?: unknown
  complained?: unknown
  oldest_due_at?: unknown
  next_scheduled_at?: unknown
}

interface QueueEventRow {
  recent_bounces?: unknown
  recent_complaints?: unknown
}

function numberValue(value: unknown): number {
  return typeof value === 'number' ? value : Number(value ?? 0)
}

function dateValue<K extends string>(key: K, value: unknown): { [P in K]?: Date } {
  return (value instanceof Date ? { [key]: value } : {}) as { [P in K]?: Date }
}
