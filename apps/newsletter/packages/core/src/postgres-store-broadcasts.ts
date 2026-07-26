import { eq, sql } from 'drizzle-orm'
import type { Database } from './db/index.js'
import { broadcasts } from './db/schema.js'
import type { MessageStatus } from './types.js'

export async function setBroadcastPlannedCount(
  db: Database,
  id: string,
  count: number,
): Promise<void> {
  await db
    .update(broadcasts)
    .set({ totalPlanned: count, updatedAt: sql`now()` })
    .where(eq(broadcasts.id, id))
}

export async function incrementBroadcastForStatus(
  db: Database,
  id: string,
  status: MessageStatus,
): Promise<void> {
  if (status === 'sent') {
    await incrementBroadcastColumn(db, id, 'totalSent')
  }
  if (status === 'bounced') {
    await incrementBroadcastColumn(db, id, 'totalBounced')
  }
  if (status === 'complained') {
    await incrementBroadcastColumn(db, id, 'totalComplained')
  }
}

async function incrementBroadcastColumn(
  db: Database,
  id: string,
  column: 'totalSent' | 'totalBounced' | 'totalComplained',
): Promise<void> {
  await db
    .update(broadcasts)
    .set({
      [column]: sql`${broadcasts[column]} + 1`,
      updatedAt: sql`now()`,
    })
    .where(eq(broadcasts.id, id))
}
