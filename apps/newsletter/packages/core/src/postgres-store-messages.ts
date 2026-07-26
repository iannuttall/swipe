import { eq, sql } from 'drizzle-orm'
import type { Database } from './db/index.js'
import { broadcasts, messages } from './db/schema.js'
import { mapMessage } from './postgres-store-mappers.js'
import type { MessageRecord } from './store.js'
import type { PlannedRecipient } from './types.js'

const MESSAGE_INSERT_CHUNK_SIZE = 1_000

export async function createPostgresMessages(
  db: Database,
  broadcastId: string,
  recipients: PlannedRecipient[],
): Promise<MessageRecord[]> {
  const [broadcast] = await db
    .select({ subject: broadcasts.subject })
    .from(broadcasts)
    .where(eq(broadcasts.id, broadcastId))
    .limit(1)
  if (!broadcast) throw new Error(`Broadcast not found: ${broadcastId}`)
  if (recipients.length === 0) {
    await setPlannedCount(db, broadcastId, 0)
    return []
  }

  return db.transaction(async (transaction) => {
    const rows: Array<typeof messages.$inferSelect> = []
    for (const chunk of chunks(recipients, MESSAGE_INSERT_CHUNK_SIZE)) {
      rows.push(
        ...(await transaction
          .insert(messages)
          .values(
            chunk.map((recipient) => ({
              broadcastId,
              contactId: recipient.contactId,
              toEmail: recipient.email,
              subject: broadcast.subject,
              status: 'planned' as const,
              sendRank: recipient.sendRank,
              rankReason: recipient.rankReason,
              engagementScore: recipient.engagementScore,
              metadata: { recipientStatus: recipient.status },
              scheduledAt: recipient.scheduledAt,
              provider: 'ses',
              retryCount: 0,
              maxAttempts: 3,
            })),
          )
          .returning()),
      )
    }
    await setPlannedCount(transaction, broadcastId, rows.length)
    return rows.map(mapMessage)
  })
}

function chunks<T>(items: T[], size: number): T[][] {
  const result: T[][] = []
  for (let index = 0; index < items.length; index += size) {
    result.push(items.slice(index, index + size))
  }
  return result
}

async function setPlannedCount(
  db: Pick<Database, 'update'>,
  broadcastId: string,
  count: number,
): Promise<void> {
  await db
    .update(broadcasts)
    .set({ totalPlanned: count, updatedAt: sql`now()` })
    .where(eq(broadcasts.id, broadcastId))
}
