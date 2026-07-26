import { and, desc, eq, inArray } from 'drizzle-orm'
import type { Database } from './db/index.js'
import { events } from './db/schema.js'
import { mapEvent } from './postgres-store-mappers.js'
import type { EventListInput, EventRecord } from './store.js'

export async function recordPostgresEvent(
  db: Database,
  input: Omit<EventRecord, 'id' | 'occurredAt'> & { occurredAt?: Date },
): Promise<EventRecord> {
  const values = {
    type: input.type,
    source: input.source,
    metadata: input.metadata,
    occurredAt: input.occurredAt ?? new Date(),
    ...(input.contactId ? { contactId: input.contactId } : {}),
    ...(input.broadcastId ? { broadcastId: input.broadcastId } : {}),
    ...(input.messageId ? { messageId: input.messageId } : {}),
    ...(input.linkId ? { linkId: input.linkId } : {}),
    ...(input.idempotencyKey ? { idempotencyKey: input.idempotencyKey } : {}),
    ...(input.userAgent ? { userAgent: input.userAgent } : {}),
    ...(input.ipHash ? { ipHash: input.ipHash } : {}),
  }
  const query = db.insert(events).values(values)
  const [row] = input.idempotencyKey
    ? await query.onConflictDoNothing({ target: events.idempotencyKey }).returning()
    : await query.returning()
  if (row) return mapEvent(row)
  if (input.idempotencyKey) {
    const [existing] = await db
      .select()
      .from(events)
      .where(eq(events.idempotencyKey, input.idempotencyKey))
      .limit(1)
    if (existing) return mapEvent(existing)
  }
  throw new Error('Failed to record event')
}

export async function listPostgresEvents(
  db: Database,
  input: EventListInput,
): Promise<EventRecord[]> {
  const filters = [
    ...(input.contactId ? [eq(events.contactId, input.contactId)] : []),
    ...(input.broadcastId ? [eq(events.broadcastId, input.broadcastId)] : []),
    ...(input.messageId ? [eq(events.messageId, input.messageId)] : []),
    ...(input.linkId ? [eq(events.linkId, input.linkId)] : []),
    ...(input.types?.length ? [inArray(events.type, input.types)] : []),
  ]
  const query = db.select().from(events)
  const rows = filters.length
    ? await query
        .where(and(...filters))
        .orderBy(desc(events.occurredAt))
        .limit(input.limit)
    : await query.orderBy(desc(events.occurredAt)).limit(input.limit)
  return rows.map(mapEvent)
}
