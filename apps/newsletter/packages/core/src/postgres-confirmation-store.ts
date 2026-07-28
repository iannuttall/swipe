import { and, desc, eq, gt, sql } from 'drizzle-orm'
import type {
  ConfirmationReport,
  ConfirmationRequestInput,
  ConfirmationRequestRecord,
  ConfirmationStore,
} from './confirmation-types.js'
import type { Database } from './db/index.js'
import { confirmationRequests, contacts, events } from './db/schema.js'
import { getEmailDomain, normalizeEmail } from './email-address.js'
import { unsubscribeUnconfirmedPostgres } from './postgres-confirmation-cleanup.js'

const INSERT_CHUNK_SIZE = 1_000

export class PostgresConfirmationStore implements ConfirmationStore {
  constructor(private readonly db: Database) {}

  async upsertPendingContact(input: {
    email: string
    name?: string
    attributes?: Record<string, unknown>
    source?: string
  }): Promise<{ id: string; email: string; status: 'active' | 'pending' }> {
    const email = normalizeEmail(input.email)
    const [existing] = await this.db
      .select()
      .from(contacts)
      .where(eq(contacts.email, email))
      .limit(1)
    if (existing?.status === 'suppressed') {
      throw new Error('Email address is suppressed')
    }

    const attributes = {
      ...(existing?.attributes ?? {}),
      ...(input.attributes ?? {}),
    }
    const [row] = await this.db
      .insert(contacts)
      .values({
        email,
        emailDomain: getEmailDomain(email),
        status: existing?.status === 'active' ? 'active' : 'pending',
        attributes,
        ...(input.name ? { name: input.name } : {}),
        ...(input.source ? { source: input.source } : {}),
      })
      .onConflictDoUpdate({
        target: contacts.email,
        set: {
          status: existing?.status === 'active' ? 'active' : 'pending',
          attributes,
          updatedAt: sql`now()`,
          ...(input.name ? { name: input.name } : {}),
          ...(input.source ? { source: input.source } : {}),
        },
      })
      .returning({
        id: contacts.id,
        email: contacts.email,
        status: contacts.status,
      })
    if (!row || (row.status !== 'active' && row.status !== 'pending')) {
      throw new Error('Failed to create pending contact')
    }
    return { ...row, status: row.status }
  }

  async createRequests(inputs: ConfirmationRequestInput[]): Promise<number> {
    if (inputs.length === 0) return 0
    return this.db.transaction(async (transaction) => {
      const inserted: Array<typeof confirmationRequests.$inferSelect> = []
      for (const chunk of chunks(inputs, INSERT_CHUNK_SIZE)) {
        inserted.push(
          ...(await transaction
            .insert(confirmationRequests)
            .values(
              chunk.map((input) => ({
                ...input,
                metadata: input.metadata ?? {},
              })),
            )
            .onConflictDoNothing()
            .returning()),
        )
      }
      for (const chunk of chunks(inserted, INSERT_CHUNK_SIZE)) {
        await transaction
          .insert(events)
          .values(
            chunk.map((request) => ({
              type: 'contact.confirmation_requested' as const,
              contactId: request.contactId,
              source: request.source,
              occurredAt: request.requestedAt,
              idempotencyKey: `confirmation-requested:${request.id}`,
              metadata: {
                confirmationRequestId: request.id,
                purpose: request.purpose,
                ...(request.batchKey ? { batchKey: request.batchKey } : {}),
              },
            })),
          )
          .onConflictDoNothing()
      }
      return inserted.length
    })
  }

  async findRequest(input: {
    contactId: string
    purpose: ConfirmationRequestRecord['purpose']
    batchKey?: string
  }): Promise<ConfirmationRequestRecord | undefined> {
    const filters = [
      eq(confirmationRequests.contactId, input.contactId),
      eq(confirmationRequests.purpose, input.purpose),
      ...(input.batchKey
        ? [eq(confirmationRequests.batchKey, input.batchKey)]
        : [sql`${confirmationRequests.batchKey} is null`]),
    ]
    const [row] = await this.db
      .select()
      .from(confirmationRequests)
      .where(and(...filters))
      .orderBy(desc(confirmationRequests.requestedAt))
      .limit(1)
    return row ? mapRequest(row) : undefined
  }

  async findByTokenHash(
    tokenHash: string,
  ): Promise<ConfirmationRequestRecord | undefined> {
    const [row] = await this.db
      .select()
      .from(confirmationRequests)
      .where(eq(confirmationRequests.tokenHash, tokenHash))
      .limit(1)
    return row ? mapRequest(row) : undefined
  }

  async confirmRequest(input: {
    id: string
    confirmedAt: Date
    confirmedIpHash?: string
    confirmedUserAgent?: string
    confirmedSourceUrl?: string
  }): Promise<ConfirmationRequestRecord | undefined> {
    return this.db.transaction(async (transaction) => {
      const [row] = await transaction
        .update(confirmationRequests)
        .set({
          status: 'confirmed',
          confirmedAt: input.confirmedAt,
          updatedAt: sql`now()`,
          ...(input.confirmedIpHash ? { confirmedIpHash: input.confirmedIpHash } : {}),
          ...(input.confirmedUserAgent
            ? { confirmedUserAgent: input.confirmedUserAgent }
            : {}),
          ...(input.confirmedSourceUrl
            ? { confirmedSourceUrl: input.confirmedSourceUrl }
            : {}),
        })
        .where(
          and(
            eq(confirmationRequests.id, input.id),
            eq(confirmationRequests.status, 'pending'),
            gt(confirmationRequests.expiresAt, input.confirmedAt),
          ),
        )
        .returning()
      if (!row) {
        const [existing] = await transaction
          .select()
          .from(confirmationRequests)
          .where(eq(confirmationRequests.id, input.id))
          .limit(1)
        return existing ? mapRequest(existing) : undefined
      }

      if (row.purpose === 'double_opt_in' || row.purpose === 'swipe_invite') {
        await transaction
          .update(contacts)
          .set({
            status: 'active',
            subscribedAt: input.confirmedAt,
            unsubscribedAt: null,
            suppressedAt: null,
            updatedAt: sql`now()`,
          })
          .where(eq(contacts.id, row.contactId))
      }
      await transaction
        .insert(events)
        .values({
          type: 'contact.confirmed',
          contactId: row.contactId,
          source: row.source,
          occurredAt: input.confirmedAt,
          idempotencyKey: `confirmation-confirmed:${row.id}`,
          ...(input.confirmedUserAgent ? { userAgent: input.confirmedUserAgent } : {}),
          ...(input.confirmedIpHash ? { ipHash: input.confirmedIpHash } : {}),
          metadata: {
            confirmationRequestId: row.id,
            purpose: row.purpose,
            ...(row.batchKey ? { batchKey: row.batchKey } : {}),
          },
        })
        .onConflictDoNothing()
      if (row.purpose === 'double_opt_in' || row.purpose === 'swipe_invite') {
        await transaction
          .insert(events)
          .values({
            type: 'contact.subscribed',
            contactId: row.contactId,
            source: row.source,
            occurredAt: input.confirmedAt,
            idempotencyKey: `confirmation-subscribed:${row.id}`,
            metadata: {
              confirmationRequestId: row.id,
              confirmationPurpose: row.purpose,
            },
          })
          .onConflictDoNothing()
      }
      return mapRequest(row)
    })
  }

  async expireRequest(id: string): Promise<void> {
    await this.db
      .update(confirmationRequests)
      .set({ status: 'expired', updatedAt: sql`now()` })
      .where(
        and(eq(confirmationRequests.id, id), eq(confirmationRequests.status, 'pending')),
      )
  }

  async report(input: {
    purpose: ConfirmationRequestRecord['purpose']
    batchKey?: string
  }): Promise<ConfirmationReport> {
    const batchFilter = input.batchKey
      ? eq(confirmationRequests.batchKey, input.batchKey)
      : sql`${confirmationRequests.batchKey} is null`
    const [row] = await this.db
      .select({
        total: sql<number>`count(*)::int`,
        pending: sql<number>`count(*) filter (
          where ${confirmationRequests.status} = 'pending'
            and ${confirmationRequests.expiresAt} > now()
        )::int`,
        confirmed: sql<number>`count(*) filter (where ${confirmationRequests.status} = 'confirmed')::int`,
        expired: sql<number>`count(*) filter (
          where ${confirmationRequests.status} = 'expired'
            or (
              ${confirmationRequests.status} = 'pending'
              and ${confirmationRequests.expiresAt} <= now()
            )
        )::int`,
        cancelled: sql<number>`count(*) filter (where ${confirmationRequests.status} = 'cancelled')::int`,
        activeUnconfirmed: sql<number>`count(*) filter (
          where ${contacts.status} = 'active'
            and ${confirmationRequests.status} <> 'confirmed'
        )::int`,
      })
      .from(confirmationRequests)
      .innerJoin(contacts, eq(contacts.id, confirmationRequests.contactId))
      .where(and(eq(confirmationRequests.purpose, input.purpose), batchFilter))
    return {
      purpose: input.purpose,
      ...(input.batchKey ? { batchKey: input.batchKey } : {}),
      total: Number(row?.total ?? 0),
      pending: Number(row?.pending ?? 0),
      confirmed: Number(row?.confirmed ?? 0),
      expired: Number(row?.expired ?? 0),
      cancelled: Number(row?.cancelled ?? 0),
      activeUnconfirmed: Number(row?.activeUnconfirmed ?? 0),
    }
  }

  async unsubscribeUnconfirmed(input: {
    purpose: 'swipe_migration'
    batchKey: string
    expiredBefore: Date
    source: string
    execute: boolean
  }): Promise<{ matched: number; unsubscribed: number }> {
    return unsubscribeUnconfirmedPostgres(this.db, input)
  }
}

function mapRequest(
  row: typeof confirmationRequests.$inferSelect,
): ConfirmationRequestRecord {
  return {
    id: row.id,
    contactId: row.contactId,
    purpose: row.purpose,
    ...(row.batchKey ? { batchKey: row.batchKey } : {}),
    tokenHash: row.tokenHash,
    status: row.status,
    source: row.source,
    requestedAt: row.requestedAt,
    expiresAt: row.expiresAt,
    ...(row.confirmedAt ? { confirmedAt: row.confirmedAt } : {}),
    ...(row.confirmedIpHash ? { confirmedIpHash: row.confirmedIpHash } : {}),
    ...(row.confirmedUserAgent ? { confirmedUserAgent: row.confirmedUserAgent } : {}),
    ...(row.confirmedSourceUrl ? { confirmedSourceUrl: row.confirmedSourceUrl } : {}),
    metadata: row.metadata,
  }
}

function chunks<T>(items: T[], size: number): T[][] {
  const result: T[][] = []
  for (let index = 0; index < items.length; index += size) {
    result.push(items.slice(index, index + size))
  }
  return result
}
