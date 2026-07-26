import { and, eq, or, sql } from 'drizzle-orm'
import type { Database } from './db/index.js'
import { purchases } from './db/schema.js'
import { mapPurchase } from './postgres-store-mappers.js'
import type { PurchaseRecord } from './subscriber-intelligence.js'

export async function findExistingPurchase(
  db: Database,
  input: {
    provider: string
    externalId?: string
    idempotencyKey?: string
  },
): Promise<PurchaseRecord | undefined> {
  const filters = [
    ...(input.idempotencyKey ? [eq(purchases.idempotencyKey, input.idempotencyKey)] : []),
    ...(input.externalId
      ? [
          and(
            eq(purchases.provider, input.provider),
            eq(purchases.externalId, input.externalId),
          ),
        ]
      : []),
  ]
  if (filters.length === 0) return undefined
  const [row] = await db
    .select()
    .from(purchases)
    .where(filters.length === 1 ? filters[0] : or(...filters))
    .limit(1)
  return row ? mapPurchase(row) : undefined
}

export async function rebuildContactValueRollup(
  db: Database,
  contactId: string,
  currency: string,
): Promise<void> {
  await db.execute(sql`
    insert into contact_value_rollups (
      contact_id,
      currency,
      purchase_count,
      total_amount_cents,
      first_purchased_at,
      last_purchased_at
    )
    select
      contact_id,
      currency,
      count(*)::int,
      sum(amount_cents)::bigint,
      min(purchased_at),
      max(purchased_at)
    from purchases
    where contact_id = ${contactId}
      and currency = ${currency}
    group by contact_id, currency
    on conflict (contact_id, currency) do update
    set purchase_count = excluded.purchase_count,
        total_amount_cents = excluded.total_amount_cents,
        first_purchased_at = excluded.first_purchased_at,
        last_purchased_at = excluded.last_purchased_at,
        updated_at = now()
  `)
}
