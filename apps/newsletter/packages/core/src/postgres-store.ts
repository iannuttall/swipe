import { and, asc, desc, eq, gte, inArray, or, sql } from 'drizzle-orm'
import type { Database } from './db/index.js'
import {
  broadcasts,
  contactExternalIds,
  contacts,
  contactTags,
  contactValueRollups,
  drafts,
  links,
  messages,
  purchases,
  suppressions,
  tags,
} from './db/schema.js'
import { getEmailDomain, normalizeEmail } from './email-address.js'
import {
  getPostgresBroadcastLinkStats,
  getPostgresBroadcastStats,
  getPostgresContactLinkInsights,
  getPostgresContactTopicInsights,
  getPostgresEngagement,
  getPostgresLinkInsights,
  getPostgresLinkSummaryInsights,
  rebuildPostgresAnalyticsRollups,
} from './postgres-store-analytics.js'
import { resolvePostgresAudience } from './postgres-store-audience.js'
import { incrementBroadcastForStatus } from './postgres-store-broadcasts.js'
import {
  createPostgresCanaryCampaign,
  createPostgresCanaryCohort,
  getPostgresCanaryCampaign,
  listPostgresCanaryCohorts,
  updatePostgresCanaryCampaignStatus,
} from './postgres-store-canaries.js'
import { recordPostgresClickRollup } from './postgres-store-click-rollups.js'
import { listPostgresEvents, recordPostgresEvent } from './postgres-store-events.js'
import {
  assertMoney,
  type MessageRow,
  mapBroadcast,
  mapContact,
  mapContactExternalId,
  mapContactValue,
  mapDraft,
  mapLink,
  mapMessage,
  mapPurchase,
  mapSuppression,
} from './postgres-store-mappers.js'
import { createPostgresMessages } from './postgres-store-messages.js'
import {
  findExistingPurchase,
  rebuildContactValueRollup,
} from './postgres-store-purchases.js'
import { getPostgresQueueSummary } from './postgres-store-queue.js'
import type {
  BroadcastRecord,
  BroadcastStats,
  CanaryCampaignRecord,
  CanaryCohortRecord,
  CanaryStepValue,
  ClickRollupInput,
  ContactLinkInsight,
  ContactRecord,
  ContactTopicInsight,
  DraftRecord,
  EmailStore,
  EventListInput,
  EventRecord,
  LinkInsight,
  LinkRecord,
  LinkStats,
  LinkSummaryInsight,
  MessageRecord,
  QueueSummary,
  QueueSummaryInput,
  SuppressionRecord,
} from './store.js'
import {
  type AudienceFilter,
  type AudienceResolution,
  type ContactExternalIdRecord,
  type ContactTagRecord,
  type ContactValueRecord,
  normalizeCurrency,
  normalizeKey,
  type PurchaseRecord,
  type RollupRebuildResult,
} from './subscriber-intelligence.js'
import type {
  BroadcastStatus,
  ContactInput,
  ContactStatus,
  DeliveryPolicyInput,
  DraftInput,
  EngagementSummary,
  MessageStatus,
  PlannedRecipient,
  SuppressionReason,
} from './types.js'

export class PostgresEmailStore implements EmailStore {
  constructor(private readonly db: Database) {}

  async upsertContact(input: ContactInput): Promise<ContactRecord> {
    const email = normalizeEmail(input.email)
    const existing = await this.findContactByEmail(email)
    const mergedAttributes = {
      ...(existing?.attributes ?? {}),
      ...(input.attributes ?? {}),
    }
    const [row] = await this.db
      .insert(contacts)
      .values({
        email,
        emailDomain: getEmailDomain(email),
        status: existing?.status ?? 'active',
        attributes: mergedAttributes,
        subscribedAt: existing?.subscribedAt ?? new Date(),
        ...(input.name ? { name: input.name } : {}),
        ...(input.source ? { source: input.source } : {}),
      })
      .onConflictDoUpdate({
        target: contacts.email,
        set: {
          attributes: mergedAttributes,
          updatedAt: sql`now()`,
          ...(input.name ? { name: input.name } : {}),
          ...(input.source ? { source: input.source } : {}),
        },
      })
      .returning()
    if (!row) throw new Error('Failed to upsert contact')
    return mapContact(row)
  }

  async getContact(id: string): Promise<ContactRecord | undefined> {
    const [row] = await this.db
      .select()
      .from(contacts)
      .where(eq(contacts.id, id))
      .limit(1)
    return row ? mapContact(row) : undefined
  }

  async findContactByEmail(email: string): Promise<ContactRecord | undefined> {
    const [row] = await this.db
      .select()
      .from(contacts)
      .where(eq(contacts.email, normalizeEmail(email)))
      .limit(1)
    return row ? mapContact(row) : undefined
  }

  async listActiveContacts(): Promise<ContactRecord[]> {
    return this.listContacts({ status: 'active' })
  }

  async listContacts(
    input: { limit?: number; status?: ContactStatus } = {},
  ): Promise<ContactRecord[]> {
    if (input.status) {
      const rows = await this.db
        .select()
        .from(contacts)
        .where(eq(contacts.status, input.status))
        .orderBy(asc(contacts.email))
        .limit(input.limit ?? 10_000)
      return rows.map(mapContact)
    }

    const rows = await this.db
      .select()
      .from(contacts)
      .orderBy(asc(contacts.email))
      .limit(input.limit ?? 10_000)
    return rows.map(mapContact)
  }

  async listRecentContacts(input: {
    since: Date
    limit?: number
  }): Promise<ContactRecord[]> {
    const rows = await this.db
      .select()
      .from(contacts)
      .where(gte(contacts.subscribedAt, input.since))
      .orderBy(desc(contacts.subscribedAt))
      .limit(input.limit ?? 1000)
    return rows.map(mapContact)
  }

  async tagContact(input: {
    contactId: string
    tagKey: string
    name?: string
    source?: string
    metadata?: Record<string, unknown>
  }): Promise<ContactTagRecord> {
    const tagKey = normalizeKey(input.tagKey, 'contact tag')
    const [tag] = await this.db
      .insert(tags)
      .values({
        key: tagKey,
        name: input.name ?? tagKey,
      })
      .onConflictDoUpdate({
        target: tags.key,
        set: {
          name: input.name ?? tagKey,
          updatedAt: sql`now()`,
        },
      })
      .returning()
    if (!tag) throw new Error('Failed to upsert tag')

    const [row] = await this.db
      .insert(contactTags)
      .values({
        contactId: input.contactId,
        tagId: tag.id,
        source: input.source ?? 'manual',
        metadata: input.metadata ?? {},
      })
      .onConflictDoUpdate({
        target: [contactTags.contactId, contactTags.tagId],
        set: {
          source: input.source ?? 'manual',
          metadata: input.metadata ?? {},
        },
      })
      .returning()
    if (!row) throw new Error('Failed to tag contact')
    return {
      contactId: input.contactId,
      tagKey: tag.key,
      tagName: tag.name,
      source: row.source,
      metadata: row.metadata,
      taggedAt: row.taggedAt,
    }
  }

  async untagContact(input: { contactId: string; tagKey: string }): Promise<void> {
    const tagKey = normalizeKey(input.tagKey, 'contact tag')
    const [tag] = await this.db
      .select({ id: tags.id })
      .from(tags)
      .where(eq(tags.key, tagKey))
      .limit(1)
    if (!tag) return
    await this.db
      .delete(contactTags)
      .where(
        and(eq(contactTags.contactId, input.contactId), eq(contactTags.tagId, tag.id)),
      )
  }

  async listContactTags(contactId: string): Promise<ContactTagRecord[]> {
    const rows = await this.db
      .select({
        contactId: contactTags.contactId,
        tagKey: tags.key,
        tagName: tags.name,
        source: contactTags.source,
        metadata: contactTags.metadata,
        taggedAt: contactTags.taggedAt,
      })
      .from(contactTags)
      .innerJoin(tags, eq(tags.id, contactTags.tagId))
      .where(eq(contactTags.contactId, contactId))
      .orderBy(asc(tags.key))
    return rows
  }

  async upsertContactExternalId(input: {
    contactId: string
    provider: string
    externalId: string
    label?: string
    metadata?: Record<string, unknown>
  }): Promise<ContactExternalIdRecord> {
    const provider = normalizeKey(input.provider, 'provider')
    const externalId = input.externalId.trim()
    if (!externalId) throw new Error('externalId is required')
    const [row] = await this.db
      .insert(contactExternalIds)
      .values({
        contactId: input.contactId,
        provider,
        externalId,
        ...(input.label ? { label: input.label } : {}),
        metadata: input.metadata ?? {},
      })
      .onConflictDoUpdate({
        target: [contactExternalIds.provider, contactExternalIds.externalId],
        set: {
          contactId: input.contactId,
          ...(input.label ? { label: input.label } : {}),
          metadata: input.metadata ?? {},
          updatedAt: sql`now()`,
        },
      })
      .returning()
    if (!row) throw new Error('Failed to upsert external ID')
    return mapContactExternalId(row)
  }

  async findContactByExternalId(input: {
    provider: string
    externalId: string
  }): Promise<ContactRecord | undefined> {
    const [row] = await this.db
      .select({ contact: contacts })
      .from(contactExternalIds)
      .innerJoin(contacts, eq(contacts.id, contactExternalIds.contactId))
      .where(
        and(
          eq(contactExternalIds.provider, normalizeKey(input.provider, 'provider')),
          eq(contactExternalIds.externalId, input.externalId.trim()),
        ),
      )
      .limit(1)
    return row ? mapContact(row.contact) : undefined
  }

  async listContactExternalIds(contactId: string): Promise<ContactExternalIdRecord[]> {
    const rows = await this.db
      .select()
      .from(contactExternalIds)
      .where(eq(contactExternalIds.contactId, contactId))
      .orderBy(asc(contactExternalIds.provider), asc(contactExternalIds.externalId))
    return rows.map(mapContactExternalId)
  }

  async recordPurchase(input: {
    contactId: string
    provider?: string
    externalId?: string
    idempotencyKey?: string
    productKey: string
    productName?: string
    amountCents: number
    currency: string
    purchasedAt?: Date
    metadata?: Record<string, unknown>
  }): Promise<PurchaseRecord> {
    const provider = normalizeKey(input.provider ?? 'manual', 'provider')
    const productKey = normalizeKey(input.productKey, 'product key')
    const currency = normalizeCurrency(input.currency)
    assertMoney(input.amountCents)
    const existing = await findExistingPurchase(this.db, {
      provider,
      ...(input.externalId ? { externalId: input.externalId } : {}),
      ...(input.idempotencyKey ? { idempotencyKey: input.idempotencyKey } : {}),
    })
    if (existing) return existing

    const [row] = await this.db
      .insert(purchases)
      .values({
        contactId: input.contactId,
        provider,
        ...(input.externalId ? { externalId: input.externalId } : {}),
        ...(input.idempotencyKey ? { idempotencyKey: input.idempotencyKey } : {}),
        productKey,
        ...(input.productName ? { productName: input.productName } : {}),
        amountCents: input.amountCents,
        currency,
        purchasedAt: input.purchasedAt ?? new Date(),
        metadata: input.metadata ?? {},
      })
      .returning()
    if (!row) throw new Error('Failed to record purchase')
    await rebuildContactValueRollup(this.db, row.contactId, row.currency)
    return mapPurchase(row)
  }

  async listContactPurchases(contactId: string, limit = 100): Promise<PurchaseRecord[]> {
    const rows = await this.db
      .select()
      .from(purchases)
      .where(eq(purchases.contactId, contactId))
      .orderBy(desc(purchases.purchasedAt))
      .limit(limit)
    return rows.map(mapPurchase)
  }

  async getContactValue(contactId: string): Promise<ContactValueRecord[]> {
    const rows = await this.db
      .select()
      .from(contactValueRollups)
      .where(eq(contactValueRollups.contactId, contactId))
      .orderBy(desc(contactValueRollups.totalAmountCents))
    return rows.map(mapContactValue)
  }
  async resolveAudience(input: AudienceFilter = {}): Promise<AudienceResolution> {
    return resolvePostgresAudience(this.db, input)
  }
  async rebuildAnalyticsRollups(): Promise<RollupRebuildResult> {
    return rebuildPostgresAnalyticsRollups(this.db)
  }

  async unsubscribeContact(input: { contactId?: string; email?: string }): Promise<void> {
    const now = new Date()
    const values = {
      status: 'unsubscribed' as const,
      unsubscribedAt: now,
      suppressedAt: null,
      updatedAt: sql`now()`,
    }
    if (input.contactId) {
      await this.db.update(contacts).set(values).where(eq(contacts.id, input.contactId))
      return
    }
    if (input.email) {
      await this.db
        .update(contacts)
        .set(values)
        .where(eq(contacts.email, normalizeEmail(input.email)))
    }
  }

  async reactivateContact(input: { contactId?: string; email?: string }): Promise<void> {
    const values = {
      status: 'active' as const,
      subscribedAt: new Date(),
      unsubscribedAt: null,
      suppressedAt: null,
      updatedAt: sql`now()`,
    }
    if (input.contactId) {
      await this.db.update(contacts).set(values).where(eq(contacts.id, input.contactId))
    } else if (input.email) {
      await this.db
        .update(contacts)
        .set(values)
        .where(eq(contacts.email, normalizeEmail(input.email)))
    }
  }

  async addSuppression(input: {
    email?: string
    domain?: string
    contactId?: string
    reason: SuppressionReason
    description?: string
    source?: string
  }): Promise<void> {
    const email = input.email ? normalizeEmail(input.email) : undefined
    const domain = input.domain?.toLowerCase()
    if (email && domain) {
      throw new Error('Suppression cannot target both email and domain')
    }
    const active = input.reason !== 'unsubscribe'
    await this.db.insert(suppressions).values({
      reason: input.reason,
      ...(email ? { email } : {}),
      ...(domain ? { domain } : {}),
      ...(input.contactId ? { contactId: input.contactId } : {}),
      ...(input.description ? { description: input.description } : {}),
      source: input.source ?? 'system',
      active,
    })

    const now = new Date()
    const contactUpdate =
      input.reason === 'unsubscribe'
        ? {
            status: 'unsubscribed' as const,
            unsubscribedAt: now,
            suppressedAt: null,
            updatedAt: sql`now()`,
          }
        : {
            status: 'suppressed' as const,
            suppressedAt: now,
            updatedAt: sql`now()`,
          }
    if (input.contactId) {
      await this.db
        .update(contacts)
        .set(contactUpdate)
        .where(eq(contacts.id, input.contactId))
    } else if (email) {
      await this.db.update(contacts).set(contactUpdate).where(eq(contacts.email, email))
    } else if (domain) {
      await this.db
        .update(contacts)
        .set(contactUpdate)
        .where(eq(contacts.emailDomain, domain))
    }
  }

  async listActiveSuppressionsForEmail(email: string): Promise<SuppressionRecord[]> {
    const normalized = normalizeEmail(email)
    const domain = getEmailDomain(normalized)
    const contact = await this.findContactByEmail(normalized)
    const clauses = [
      eq(suppressions.email, normalized),
      eq(suppressions.domain, domain),
      ...(contact ? [eq(suppressions.contactId, contact.id)] : []),
    ]
    const rows = await this.db
      .select()
      .from(suppressions)
      .where(and(eq(suppressions.active, true), or(...clauses)))
      .orderBy(desc(suppressions.suppressedAt))
    return rows.map(mapSuppression)
  }

  async isSuppressed(email: string): Promise<boolean> {
    return (await this.listActiveSuppressionsForEmail(email)).length > 0
  }

  async listSuppressions(input: { limit?: number } = {}): Promise<SuppressionRecord[]> {
    const rows = await this.db
      .select()
      .from(suppressions)
      .orderBy(desc(suppressions.suppressedAt))
      .limit(input.limit ?? 10_000)
    return rows.map(mapSuppression)
  }

  async createDraft(input: DraftInput): Promise<DraftRecord> {
    const [row] = await this.db
      .insert(drafts)
      .values({
        subject: input.subject,
        bodyMarkdown: input.bodyMarkdown,
        template: input.template ?? 'default',
        metadata: input.metadata ?? {},
        ...(input.name ? { name: input.name } : {}),
        ...(input.preview ? { preview: input.preview } : {}),
        ...(input.fromEmail ? { fromEmail: input.fromEmail } : {}),
        ...(input.fromName ? { fromName: input.fromName } : {}),
        ...(input.replyTo ? { replyTo: input.replyTo } : {}),
      })
      .returning()
    if (!row) throw new Error('Failed to create draft')
    return mapDraft(row)
  }

  async getDraft(id: string): Promise<DraftRecord | undefined> {
    const [row] = await this.db.select().from(drafts).where(eq(drafts.id, id)).limit(1)
    return row ? mapDraft(row) : undefined
  }

  async createBroadcast(input: {
    draftId: string
    name: string
    subject: string
    audience?: AudienceFilter
    deliveryPolicy?: DeliveryPolicyInput
    scheduledAt?: Date
  }): Promise<BroadcastRecord> {
    const [row] = await this.db
      .insert(broadcasts)
      .values({
        draftId: input.draftId,
        name: input.name,
        subject: input.subject,
        status: 'scheduled',
        audience: (input.audience ?? {}) as Record<string, unknown>,
        deliveryPolicy: (input.deliveryPolicy ?? {}) as Record<string, unknown>,
        ...(input.scheduledAt ? { scheduledAt: input.scheduledAt } : {}),
      })
      .returning()
    if (!row) throw new Error('Failed to create broadcast')
    return mapBroadcast(row)
  }

  async createCanaryCampaign(input: {
    draftId: string
    name?: string
    audience?: AudienceFilter
    deliveryPolicy?: DeliveryPolicyInput
    steps: CanaryStepValue[]
    scheduledAt?: Date
  }): Promise<CanaryCampaignRecord> {
    return createPostgresCanaryCampaign(this.db, input)
  }

  async getCanaryCampaign(id: string): Promise<CanaryCampaignRecord | undefined> {
    return getPostgresCanaryCampaign(this.db, id)
  }

  async updateCanaryCampaignStatus(
    id: string,
    status: CanaryCampaignRecord['status'],
  ): Promise<void> {
    await updatePostgresCanaryCampaignStatus(this.db, id, status)
  }

  async createCanaryCohort(input: {
    campaignId: string
    stepIndex: number
    target: CanaryStepValue
    targetTotal: number
    addedCount: number
    broadcastId: string
    contactIds: string[]
  }): Promise<CanaryCohortRecord> {
    return createPostgresCanaryCohort(this.db, input)
  }

  async listCanaryCohorts(campaignId: string): Promise<CanaryCohortRecord[]> {
    return listPostgresCanaryCohorts(this.db, campaignId)
  }

  async getBroadcast(id: string): Promise<BroadcastRecord | undefined> {
    const [row] = await this.db
      .select()
      .from(broadcasts)
      .where(eq(broadcasts.id, id))
      .limit(1)
    return row ? mapBroadcast(row) : undefined
  }

  async listBroadcasts(limit: number): Promise<BroadcastRecord[]> {
    const rows = await this.db
      .select()
      .from(broadcasts)
      .orderBy(sql`${broadcasts.createdAt} desc`)
      .limit(limit)
    return rows.map(mapBroadcast)
  }
  async getBroadcastStats(id: string): Promise<BroadcastStats | undefined> {
    return getPostgresBroadcastStats(this.db, id)
  }
  async getBroadcastLinkStats(id: string): Promise<LinkStats[]> {
    return getPostgresBroadcastLinkStats(this.db, id)
  }
  async getLinkInsights(
    input: {
      broadcastId?: string
      topic?: string
      tag?: string
      sponsor?: string
      limit?: number
    } = {},
  ): Promise<LinkInsight[]> {
    return getPostgresLinkInsights(this.db, input)
  }
  async getLinkSummaryInsights(
    input: {
      broadcastId?: string
      topic?: string
      tag?: string
      sponsor?: string
      limit?: number
    } = {},
  ): Promise<LinkSummaryInsight[]> {
    return getPostgresLinkSummaryInsights(this.db, input)
  }
  async getContactLinkInsights(
    contactId: string,
    limit = 100,
  ): Promise<ContactLinkInsight[]> {
    return getPostgresContactLinkInsights(this.db, contactId, limit)
  }
  async getContactTopicInsights(
    contactId: string,
    limit = 100,
  ): Promise<ContactTopicInsight[]> {
    return getPostgresContactTopicInsights(this.db, contactId, limit)
  }
  async listEvents(input: EventListInput): Promise<EventRecord[]> {
    return listPostgresEvents(this.db, input)
  }

  async updateBroadcastStatus(id: string, status: BroadcastStatus): Promise<void> {
    await this.db
      .update(broadcasts)
      .set({
        status,
        updatedAt: sql`now()`,
        ...(status === 'sending' ? { startedAt: new Date() } : {}),
        ...(status === 'completed' ? { completedAt: new Date() } : {}),
      })
      .where(eq(broadcasts.id, id))
  }

  async cancelBroadcastMessages(id: string): Promise<number> {
    const rows = await this.db
      .update(messages)
      .set({
        status: 'skipped',
        error: { reason: 'broadcast_cancelled' },
        updatedAt: sql`now()`,
      })
      .where(and(eq(messages.broadcastId, id), eq(messages.status, 'planned')))
      .returning({ id: messages.id })
    return rows.length
  }

  async createMessages(
    broadcastId: string,
    recipients: PlannedRecipient[],
  ): Promise<MessageRecord[]> {
    return createPostgresMessages(this.db, broadcastId, recipients)
  }

  async getMessage(id: string): Promise<MessageRecord | undefined> {
    const [row] = await this.db
      .select()
      .from(messages)
      .where(eq(messages.id, id))
      .limit(1)
    return row ? mapMessage(row) : undefined
  }

  async findMessageByProviderId(
    providerMessageId: string,
  ): Promise<MessageRecord | undefined> {
    const [row] = await this.db
      .select()
      .from(messages)
      .where(eq(messages.providerMessageId, providerMessageId))
      .limit(1)
    return row ? mapMessage(row) : undefined
  }

  async listDueMessages(now: Date, limit: number): Promise<MessageRecord[]> {
    const rows = await this.db
      .select()
      .from(messages)
      .innerJoin(broadcasts, eq(broadcasts.id, messages.broadcastId))
      .where(
        and(
          eq(messages.status, 'planned'),
          sql`${messages.scheduledAt} <= ${now}`,
          inArray(broadcasts.status, ['scheduled', 'sending']),
        ),
      )
      .orderBy(asc(messages.scheduledAt), asc(messages.sendRank))
      .limit(limit)
    return rows.map((row) => mapMessage(row.messages))
  }

  async getQueueSummary(input: QueueSummaryInput): Promise<QueueSummary> {
    return getPostgresQueueSummary(this.db, input)
  }

  async claimDueMessages(now: Date, limit: number): Promise<MessageRecord[]> {
    const nowIso = now.toISOString()
    const rows = await this.db.transaction(async (transaction) =>
      transaction.execute(sql`
        with due as (
          select messages.id
          from messages
          inner join broadcasts on broadcasts.id = messages.broadcast_id
          where messages.status = 'planned'
            and messages.scheduled_at <= ${nowIso}::timestamptz
            and broadcasts.status in ('scheduled', 'sending')
          order by messages.scheduled_at asc, messages.send_rank asc
          limit ${limit}
          for update skip locked
        )
        update messages
        set status = 'sending',
            attempted_at = ${nowIso}::timestamptz,
            retry_count = retry_count + 1,
            updated_at = now()
        from due
        where messages.id = due.id
        returning
          messages.id,
          messages.broadcast_id as "broadcastId",
          messages.contact_id as "contactId",
          messages.provider,
          messages.provider_message_id as "providerMessageId",
          messages.to_email as "toEmail",
          messages.subject,
          messages.status,
          messages.send_rank as "sendRank",
          messages.rank_reason as "rankReason",
          messages.engagement_score as "engagementScore",
          messages.scheduled_at as "scheduledAt",
          messages.attempted_at as "attemptedAt",
          messages.sent_at as "sentAt",
          messages.failed_at as "failedAt",
          messages.retry_count as "retryCount",
          messages.max_attempts as "maxAttempts",
          messages.error,
          messages.metadata,
          messages.created_at as "createdAt",
          messages.updated_at as "updatedAt"
      `),
    )
    return rows.map((row) => mapMessage(row as MessageRow))
  }

  async updateMessage(input: {
    id: string
    status: MessageStatus
    providerMessageId?: string
    provider?: string
    scheduledAt?: Date
    error?: Record<string, unknown>
  }): Promise<void> {
    const [existing] = await this.db
      .select({
        status: messages.status,
        broadcastId: messages.broadcastId,
      })
      .from(messages)
      .where(eq(messages.id, input.id))
      .limit(1)

    await this.db
      .update(messages)
      .set({
        status: input.status,
        updatedAt: sql`now()`,
        ...(input.provider ? { provider: input.provider } : {}),
        ...(input.providerMessageId
          ? { providerMessageId: input.providerMessageId }
          : {}),
        ...(input.status === 'sent' ? { sentAt: new Date() } : {}),
        ...(input.status === 'failed' ? { failedAt: new Date() } : {}),
        ...(input.scheduledAt ? { scheduledAt: input.scheduledAt } : {}),
        ...(input.error ? { error: input.error } : {}),
      })
      .where(eq(messages.id, input.id))

    if (existing?.broadcastId && existing.status !== input.status) {
      await incrementBroadcastForStatus(this.db, existing.broadcastId, input.status)
    }
  }

  async retryFailedMessages(input: {
    broadcastId?: string
    scheduledAt: Date
    limit: number
  }): Promise<number> {
    const scheduledAtIso = input.scheduledAt.toISOString()
    const rows = await this.db.execute(sql`
      with failed as (
        select id
        from messages
        where status = 'failed'
          and (${input.broadcastId ?? null}::uuid is null or broadcast_id = ${input.broadcastId ?? null})
        order by failed_at asc nulls last, updated_at asc
        limit ${input.limit}
        for update skip locked
      )
      update messages
      set status = 'planned',
          scheduled_at = ${scheduledAtIso}::timestamptz,
          failed_at = null,
          error = jsonb_build_object('reason', 'manual_retry'),
          updated_at = now()
      from failed
      where messages.id = failed.id
      returning messages.id, messages.broadcast_id
    `)
    const broadcastIds = rows.map((row) => (row as { broadcast_id: string }).broadcast_id)
    if (broadcastIds.length > 0) {
      await this.db
        .update(broadcasts)
        .set({ status: 'scheduled', completedAt: null, updatedAt: sql`now()` })
        .where(
          and(
            inArray(broadcasts.id, broadcastIds),
            inArray(broadcasts.status, ['completed', 'failed']),
          ),
        )
    }
    return rows.length
  }

  async recoverStuckMessages(input: {
    staleBefore: Date
    rescheduleAt: Date
    limit: number
  }): Promise<{ recovered: number; failed: number }> {
    const staleBeforeIso = input.staleBefore.toISOString()
    const rescheduleAtIso = input.rescheduleAt.toISOString()
    const rows = await this.db.transaction(async (transaction) =>
      transaction.execute(sql`
        with stuck as (
          select id
          from messages
          where status = 'sending'
            and attempted_at <= ${staleBeforeIso}::timestamptz
          order by attempted_at asc
          limit ${input.limit}
          for update skip locked
        )
        update messages
        set status = case
              when retry_count >= max_attempts then 'failed'::message_status
              else 'planned'::message_status
            end,
            scheduled_at = case
              when retry_count >= max_attempts then scheduled_at
              else ${rescheduleAtIso}::timestamptz
            end,
            failed_at = case
              when retry_count >= max_attempts then ${rescheduleAtIso}::timestamptz
              else failed_at
            end,
            error = jsonb_build_object('reason', 'stuck_sending'),
            updated_at = now()
        from stuck
        where messages.id = stuck.id
        returning messages.status
      `),
    )
    const statuses = rows as unknown as Array<{ status: string }>
    return statuses.reduce<{ recovered: number; failed: number }>(
      (total, row) => {
        if (row.status === 'failed') total.failed += 1
        else total.recovered += 1
        return total
      },
      { recovered: 0, failed: 0 },
    )
  }

  async finalizeBroadcasts(broadcastIds: string[]): Promise<void> {
    for (const broadcastId of new Set(broadcastIds)) {
      await this.db.execute(sql`
        update broadcasts
        set status = 'completed',
            completed_at = coalesce(completed_at, now()),
            updated_at = now()
        where id = ${broadcastId}
          and exists (
            select 1 from messages where messages.broadcast_id = broadcasts.id
          )
          and not exists (
            select 1
            from messages
            where messages.broadcast_id = broadcasts.id
              and messages.status in ('planned', 'sending')
          )
      `)
    }
  }
  async recordEvent(
    input: Omit<EventRecord, 'id' | 'occurredAt'> & { occurredAt?: Date },
  ): Promise<EventRecord> {
    return recordPostgresEvent(this.db, input)
  }
  async recordClickRollup(input: ClickRollupInput): Promise<void> {
    await recordPostgresClickRollup(this.db, input)
  }
  async getEngagement(contactIds: string[]): Promise<Map<string, EngagementSummary>> {
    return getPostgresEngagement(this.db, contactIds)
  }

  async createLink(
    input: Omit<LinkRecord, 'id' | 'metadata'> & {
      id?: string
      metadata?: Record<string, unknown>
    },
  ): Promise<LinkRecord> {
    const [row] = await this.db
      .insert(links)
      .values({
        ...(input.id ? { id: input.id } : {}),
        ...(input.messageId ? { messageId: input.messageId } : {}),
        ...(input.broadcastId ? { broadcastId: input.broadcastId } : {}),
        originalUrl: input.originalUrl,
        linkIndex: input.linkIndex,
        tokenHash: input.tokenHash,
        metadata: input.metadata ?? {},
      })
      .returning()
    if (!row) throw new Error('Failed to create link')
    return mapLink(row)
  }

  async findLinkByTokenHash(tokenHash: string): Promise<LinkRecord | undefined> {
    const [row] = await this.db
      .select()
      .from(links)
      .where(eq(links.tokenHash, tokenHash))
      .limit(1)
    return row ? mapLink(row) : undefined
  }
}
