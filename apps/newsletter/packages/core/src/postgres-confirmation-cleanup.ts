import { and, eq, lte, ne, sql } from 'drizzle-orm'
import type { Database } from './db/index.js'
import { confirmationRequests, contacts, events } from './db/schema.js'

const INSERT_CHUNK_SIZE = 1_000

export async function unsubscribeUnconfirmedPostgres(
  db: Database,
  input: {
    purpose: 'swipe_migration'
    batchKey: string
    expiredBefore: Date
    source: string
    execute: boolean
  },
): Promise<{ matched: number; unsubscribed: number }> {
  const eligible = and(
    eq(confirmationRequests.purpose, input.purpose),
    eq(confirmationRequests.batchKey, input.batchKey),
    ne(confirmationRequests.status, 'confirmed'),
    lte(confirmationRequests.expiresAt, input.expiredBefore),
    eq(contacts.status, 'active'),
  )
  const [count] = await db
    .select({ count: sql<number>`count(distinct ${contacts.id})::int` })
    .from(confirmationRequests)
    .innerJoin(contacts, eq(contacts.id, confirmationRequests.contactId))
    .where(eligible)
  const matched = Number(count?.count ?? 0)
  if (!input.execute || matched === 0) return { matched, unsubscribed: 0 }

  const rows = await db.transaction(async (transaction) => {
    const updated = await transaction.execute<{ id: string; email: string }>(sql`
      update contacts
      set status = 'unsubscribed',
          unsubscribed_at = now(),
          suppressed_at = null,
          updated_at = now()
      where contacts.id in (
        select confirmation_requests.contact_id
        from confirmation_requests
        where confirmation_requests.purpose = ${input.purpose}
          and confirmation_requests.batch_key = ${input.batchKey}
          and confirmation_requests.status <> 'confirmed'
          and confirmation_requests.expires_at <= ${input.expiredBefore.toISOString()}
      )
        and contacts.status = 'active'
      returning contacts.id, contacts.email
    `)
    for (const chunk of chunks(Array.from(updated), INSERT_CHUNK_SIZE)) {
      await transaction
        .insert(events)
        .values(
          chunk.map((contact) => ({
            type: 'contact.unsubscribed' as const,
            contactId: contact.id,
            source: input.source,
            idempotencyKey: `migration-unsubscribe:${input.batchKey}:${contact.id}`,
            metadata: {
              email: contact.email,
              confirmationPurpose: input.purpose,
              confirmationBatchKey: input.batchKey,
            },
          })),
        )
        .onConflictDoNothing()
    }
    return updated
  })
  return { matched, unsubscribed: rows.length }
}

function chunks<T>(items: T[], size: number): T[][] {
  const result: T[][] = []
  for (let index = 0; index < items.length; index += size) {
    result.push(items.slice(index, index + size))
  }
  return result
}
