import crypto from 'node:crypto'
import { getEmailDomain, normalizeEmail } from './email-address.js'
import { getMemoryLinkSummaryInsights } from './memory-store-analytics.js'
import { matchesMemoryAudience } from './memory-store-audience.js'
import { getMemoryEngagement } from './memory-store-engagement.js'
import { eventsForBroadcast } from './memory-store-events.js'
import {
  assertMoney,
  contactTagKey,
  externalIdKey,
  findExistingPurchase,
  linkAnalyticsMetadata,
  rebuildMemoryValueRollup,
  uniqueContactCount,
} from './memory-store-helpers.js'
import { getMemoryQueueSummary } from './memory-store-queue.js'
import {
  applySuppressionToContact,
  type MemorySuppression,
  matchesSuppressionTarget,
} from './memory-store-suppressions.js'
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
  normalizeAudience,
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
  MessageStatus,
  PlannedRecipient,
  SuppressionReason,
} from './types.js'

export class MemoryEmailStore implements EmailStore {
  readonly contacts = new Map<string, ContactRecord>()
  readonly suppressions: MemorySuppression[] = []
  readonly drafts = new Map<string, DraftRecord>()
  readonly broadcasts = new Map<string, BroadcastRecord>()
  readonly canaryCampaigns = new Map<string, CanaryCampaignRecord>()
  readonly canaryCohorts = new Map<string, CanaryCohortRecord>()
  readonly messages = new Map<string, MessageRecord>()
  readonly events: EventRecord[] = []
  readonly links = new Map<string, LinkRecord>()
  readonly linkRollups = new Map<string, LinkInsight>()
  readonly contactLinkRollups = new Map<string, ContactLinkInsight>()
  readonly contactTags = new Map<string, ContactTagRecord>()
  readonly externalIds = new Map<string, ContactExternalIdRecord>()
  readonly purchases = new Map<string, PurchaseRecord>()
  readonly valueRollups = new Map<string, ContactValueRecord>()

  private async findContactByInput(input: {
    contactId?: string
    email?: string
  }): Promise<ContactRecord | undefined> {
    if (input.contactId !== undefined) return this.getContact(input.contactId)
    return input.email ? this.findContactByEmail(input.email) : undefined
  }

  async upsertContact(input: ContactInput): Promise<ContactRecord> {
    const email = normalizeEmail(input.email)
    const existing = this.contacts.get(email)
    const record: ContactRecord = {
      id: existing?.id ?? crypto.randomUUID(),
      email,
      emailDomain: getEmailDomain(email),
      status: existing?.status ?? 'active',
      attributes: { ...(existing?.attributes ?? {}), ...(input.attributes ?? {}) },
      hardBounceCount: existing?.hardBounceCount ?? 0,
      softBounceCount: existing?.softBounceCount ?? 0,
      complaintCount: existing?.complaintCount ?? 0,
      subscribedAt: existing?.subscribedAt ?? new Date(),
      ...(input.name
        ? { name: input.name }
        : existing?.name
          ? { name: existing.name }
          : {}),
      ...(input.source
        ? { source: input.source }
        : existing?.source
          ? { source: existing.source }
          : {}),
      ...(existing?.unsubscribedAt ? { unsubscribedAt: existing.unsubscribedAt } : {}),
      ...(existing?.suppressedAt ? { suppressedAt: existing.suppressedAt } : {}),
    }
    this.contacts.set(email, record)
    return record
  }

  async getContact(id: string): Promise<ContactRecord | undefined> {
    return Array.from(this.contacts.values()).find((contact) => contact.id === id)
  }

  async findContactByEmail(email: string): Promise<ContactRecord | undefined> {
    return this.contacts.get(normalizeEmail(email))
  }

  async listActiveContacts(): Promise<ContactRecord[]> {
    return this.listContacts({ status: 'active' })
  }

  async listContacts(
    input: { limit?: number; status?: ContactStatus } = {},
  ): Promise<ContactRecord[]> {
    return Array.from(this.contacts.values())
      .filter((contact) => !input.status || contact.status === input.status)
      .toSorted((a, b) => a.email.localeCompare(b.email))
      .slice(0, input.limit ?? 10_000)
  }

  async listRecentContacts(input: { since: Date; limit?: number }) {
    const time = (contact: ContactRecord) => contact.subscribedAt?.getTime() ?? -1
    return Array.from(this.contacts.values())
      .filter((contact) => time(contact) >= input.since.getTime())
      .toSorted((a, b) => time(b) - time(a))
      .slice(0, input.limit ?? 1000)
  }

  async tagContact(input: {
    contactId: string
    tagKey: string
    name?: string
    source?: string
    metadata?: Record<string, unknown>
  }): Promise<ContactTagRecord> {
    const tagKey = normalizeKey(input.tagKey, 'contact tag')
    const key = contactTagKey(input.contactId, tagKey)
    const record: ContactTagRecord = {
      contactId: input.contactId,
      tagKey,
      tagName: input.name ?? tagKey,
      source: input.source ?? 'manual',
      metadata: input.metadata ?? {},
      taggedAt: this.contactTags.get(key)?.taggedAt ?? new Date(),
    }
    this.contactTags.set(key, record)
    return record
  }

  async untagContact(input: { contactId: string; tagKey: string }): Promise<void> {
    this.contactTags.delete(contactTagKey(input.contactId, input.tagKey))
  }

  async listContactTags(contactId: string): Promise<ContactTagRecord[]> {
    return Array.from(this.contactTags.values())
      .filter((tag) => tag.contactId === contactId)
      .toSorted((a, b) => a.tagKey.localeCompare(b.tagKey))
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
    const key = externalIdKey(provider, externalId)
    const existing = this.externalIds.get(key)
    const record: ContactExternalIdRecord = {
      id: existing?.id ?? crypto.randomUUID(),
      contactId: input.contactId,
      provider,
      externalId,
      ...(input.label
        ? { label: input.label }
        : existing?.label
          ? { label: existing.label }
          : {}),
      metadata: { ...(existing?.metadata ?? {}), ...(input.metadata ?? {}) },
      createdAt: existing?.createdAt ?? new Date(),
    }
    this.externalIds.set(key, record)
    return record
  }

  async findContactByExternalId(input: {
    provider: string
    externalId: string
  }): Promise<ContactRecord | undefined> {
    const identity = this.externalIds.get(
      externalIdKey(input.provider, input.externalId.trim()),
    )
    return identity ? this.getContact(identity.contactId) : undefined
  }

  async listContactExternalIds(contactId: string): Promise<ContactExternalIdRecord[]> {
    return Array.from(this.externalIds.values())
      .filter((identity) => identity.contactId === contactId)
      .toSorted((a, b) => a.provider.localeCompare(b.provider))
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
    const existing = findExistingPurchase(this.purchases, {
      provider,
      ...(input.externalId ? { externalId: input.externalId } : {}),
      ...(input.idempotencyKey ? { idempotencyKey: input.idempotencyKey } : {}),
    })
    if (existing) return existing

    const record: PurchaseRecord = {
      id: crypto.randomUUID(),
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
    }
    this.purchases.set(record.id, record)
    rebuildMemoryValueRollup(
      this.purchases,
      this.valueRollups,
      record.contactId,
      record.currency,
    )
    return record
  }

  async listContactPurchases(contactId: string, limit = 100): Promise<PurchaseRecord[]> {
    return Array.from(this.purchases.values())
      .filter((purchase) => purchase.contactId === contactId)
      .toSorted((a, b) => b.purchasedAt.getTime() - a.purchasedAt.getTime())
      .slice(0, limit)
  }

  async getContactValue(contactId: string): Promise<ContactValueRecord[]> {
    return Array.from(this.valueRollups.values())
      .filter((rollup) => rollup.contactId === contactId)
      .toSorted((a, b) => b.totalAmountCents - a.totalAmountCents)
  }

  async resolveAudience(input: AudienceFilter = {}): Promise<AudienceResolution> {
    const audience = normalizeAudience(input)
    const contacts = await this.listContacts({ status: 'active' })
    const matched: ContactRecord[] = []
    let total = 0
    let suppressed = 0
    for (const contact of contacts) {
      if (await this.isSuppressed(contact.email)) {
        suppressed += 1
        continue
      }
      if (
        matchesMemoryAudience({
          contact,
          audience,
          contactTags: this.contactTags.values(),
          contactLinkRollups: this.contactLinkRollups.values(),
          purchases: this.purchases.values(),
          valueRollups: this.valueRollups,
        })
      ) {
        total += 1
        if (!audience.limit || matched.length < audience.limit) {
          matched.push(contact)
        }
      }
    }
    return { audience, contacts: matched, total, suppressed }
  }

  async rebuildAnalyticsRollups(): Promise<RollupRebuildResult> {
    this.linkRollups.clear()
    this.contactLinkRollups.clear()
    const linksById = new Map(
      Array.from(this.links.values()).map((link) => [link.id, link]),
    )
    for (const event of this.events) {
      if (
        !event.contactId ||
        !event.linkId ||
        (event.type !== 'engagement.clicked' &&
          event.type !== 'engagement.clicked_by_bot')
      ) {
        continue
      }
      const link = linksById.get(event.linkId)
      if (!link) continue
      await this.recordClickRollup({
        link,
        contactId: event.contactId,
        isBot: event.type === 'engagement.clicked_by_bot',
        occurredAt: event.occurredAt,
      })
    }

    this.valueRollups.clear()
    for (const purchase of this.purchases.values()) {
      rebuildMemoryValueRollup(
        this.purchases,
        this.valueRollups,
        purchase.contactId,
        purchase.currency,
      )
    }
    return {
      linkRollups: this.linkRollups.size,
      contactLinkRollups: this.contactLinkRollups.size,
      valueRollups: this.valueRollups.size,
    }
  }

  async unsubscribeContact(input: { contactId?: string; email?: string }): Promise<void> {
    const contact = await this.findContactByInput(input)
    if (contact) {
      contact.status = 'unsubscribed'
      contact.unsubscribedAt = new Date()
      delete contact.suppressedAt
    }
  }

  async reactivateContact(input: { contactId?: string; email?: string }): Promise<void> {
    const contact = await this.findContactByInput(input)
    if (contact) {
      contact.status = 'active'
      contact.subscribedAt = new Date()
      delete contact.unsubscribedAt
      delete contact.suppressedAt
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
    const now = new Date()
    const active = input.reason !== 'unsubscribe'
    this.suppressions.push({
      id: crypto.randomUUID(),
      ...(input.email ? { email: normalizeEmail(input.email) } : {}),
      ...(input.domain ? { domain: input.domain.toLowerCase() } : {}),
      ...(input.contactId ? { contactId: input.contactId } : {}),
      reason: input.reason,
      ...(input.description ? { description: input.description } : {}),
      source: input.source ?? 'system',
      active,
      suppressedAt: now,
    })

    if (input.email) {
      const contact = await this.findContactByEmail(input.email)
      if (contact) applySuppressionToContact(contact, input.reason, now)
    }
    if (input.contactId) {
      const contact = await this.getContact(input.contactId)
      if (contact) applySuppressionToContact(contact, input.reason, now)
    }
  }

  async listActiveSuppressionsForEmail(email: string): Promise<SuppressionRecord[]> {
    const normalized = normalizeEmail(email)
    const domain = getEmailDomain(normalized)
    const contact = this.contacts.get(normalized)
    return this.suppressions.filter(
      (suppression) =>
        suppression.active &&
        matchesSuppressionTarget(suppression, {
          email: normalized,
          domain,
          ...(contact?.id ? { contactId: contact.id } : {}),
        }),
    )
  }

  async isSuppressed(email: string): Promise<boolean> {
    return (await this.listActiveSuppressionsForEmail(email)).length > 0
  }

  async listSuppressions(input: { limit?: number } = {}): Promise<SuppressionRecord[]> {
    return this.suppressions
      .toSorted((a, b) => b.suppressedAt.getTime() - a.suppressedAt.getTime())
      .slice(0, input.limit ?? 10_000)
  }

  async createDraft(input: DraftInput): Promise<DraftRecord> {
    const record: DraftRecord = {
      ...input,
      id: crypto.randomUUID(),
      status: 'draft',
      createdAt: new Date(),
    }
    this.drafts.set(record.id, record)
    return record
  }

  async getDraft(id: string): Promise<DraftRecord | undefined> {
    return this.drafts.get(id)
  }

  async createBroadcast(input: {
    draftId: string
    name: string
    subject: string
    audience?: AudienceFilter
    deliveryPolicy?: DeliveryPolicyInput
    scheduledAt?: Date
  }): Promise<BroadcastRecord> {
    const record: BroadcastRecord = {
      id: crypto.randomUUID(),
      draftId: input.draftId,
      name: input.name,
      subject: input.subject,
      status: 'scheduled',
      audience: (input.audience ?? {}) as Record<string, unknown>,
      deliveryPolicy: (input.deliveryPolicy ?? {}) as Record<string, unknown>,
      totalPlanned: 0,
      ...(input.scheduledAt ? { scheduledAt: input.scheduledAt } : {}),
    }
    this.broadcasts.set(record.id, record)
    return record
  }

  async createCanaryCampaign(input: {
    draftId: string
    name?: string
    audience?: AudienceFilter
    deliveryPolicy?: DeliveryPolicyInput
    steps: CanaryStepValue[]
    scheduledAt?: Date
  }): Promise<CanaryCampaignRecord> {
    const record: CanaryCampaignRecord = {
      id: crypto.randomUUID(),
      draftId: input.draftId,
      status: 'active',
      audience: (input.audience ?? {}) as Record<string, unknown>,
      deliveryPolicy: (input.deliveryPolicy ?? {}) as Record<string, unknown>,
      steps: input.steps,
      createdAt: new Date(),
      ...(input.name ? { name: input.name } : {}),
      ...(input.scheduledAt ? { scheduledAt: input.scheduledAt } : {}),
    }
    this.canaryCampaigns.set(record.id, record)
    return record
  }

  async getCanaryCampaign(id: string): Promise<CanaryCampaignRecord | undefined> {
    return this.canaryCampaigns.get(id)
  }

  async updateCanaryCampaignStatus(
    id: string,
    status: CanaryCampaignRecord['status'],
  ): Promise<void> {
    const campaign = this.canaryCampaigns.get(id)
    if (!campaign) throw new Error(`Canary campaign not found: ${id}`)
    campaign.status = status
    if (status === 'completed') campaign.completedAt = new Date()
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
    const record = {
      ...input,
      id: crypto.randomUUID(),
      createdAt: new Date(),
    }
    this.canaryCohorts.set(record.id, record)
    return record
  }

  async listCanaryCohorts(campaignId: string): Promise<CanaryCohortRecord[]> {
    return Array.from(this.canaryCohorts.values())
      .filter((cohort) => cohort.campaignId === campaignId)
      .toSorted((a, b) => a.stepIndex - b.stepIndex)
  }

  async getBroadcast(id: string): Promise<BroadcastRecord | undefined> {
    return this.broadcasts.get(id)
  }

  async listBroadcasts(limit: number): Promise<BroadcastRecord[]> {
    return Array.from(this.broadcasts.values())
      .toSorted(
        (a, b) => (b.scheduledAt?.getTime() ?? 0) - (a.scheduledAt?.getTime() ?? 0),
      )
      .slice(0, limit)
  }

  async getBroadcastStats(id: string): Promise<BroadcastStats | undefined> {
    if (!this.broadcasts.has(id)) return undefined
    const messages = Array.from(this.messages.values()).filter(
      (message) => message.broadcastId === id,
    )
    const events = eventsForBroadcast(this.events, messages, id)
    return {
      broadcastId: id,
      planned: messages.filter((message) => message.status === 'planned').length,
      sending: messages.filter((message) => message.status === 'sending').length,
      sent: messages.filter((message) => message.status === 'sent').length,
      failed: messages.filter((message) => message.status === 'failed').length,
      bounced: messages.filter((message) => message.status === 'bounced').length,
      complained: messages.filter((message) => message.status === 'complained').length,
      unsubscribed: new Set(
        events
          .filter((event) => event.type === 'contact.unsubscribed')
          .flatMap((event) => (event.contactId ? [event.contactId] : [])),
      ).size,
      skipped: messages.filter((message) => message.status === 'skipped').length,
      opened: events.filter((event) => event.type === 'engagement.opened').length,
      clicked: events.filter((event) => event.type === 'engagement.clicked').length,
      openedByBot: events.filter((event) => event.type === 'engagement.opened_by_bot')
        .length,
      clickedByBot: events.filter((event) => event.type === 'engagement.clicked_by_bot')
        .length,
    }
  }

  async getBroadcastLinkStats(id: string): Promise<LinkStats[]> {
    const links = Array.from(this.links.values())
      .filter((link) => link.broadcastId === id)
      .toSorted((a, b) => a.linkIndex - b.linkIndex)

    return links.map((link) => {
      const events = this.events.filter((event) => event.linkId === link.id)
      const humanClicks = events.filter((event) => event.type === 'engagement.clicked')
      const botClicks = events.filter(
        (event) => event.type === 'engagement.clicked_by_bot',
      )
      const lastClickedAt = events
        .filter(
          (event) =>
            event.type === 'engagement.clicked' ||
            event.type === 'engagement.clicked_by_bot',
        )
        .toSorted(
          (a, b) => b.occurredAt.getTime() - a.occurredAt.getTime(),
        )[0]?.occurredAt

      return {
        linkId: link.id,
        ...(link.broadcastId ? { broadcastId: link.broadcastId } : {}),
        ...(link.messageId ? { messageId: link.messageId } : {}),
        originalUrl: link.originalUrl,
        linkIndex: link.linkIndex,
        humanClicks: humanClicks.length,
        botClicks: botClicks.length,
        uniqueHumanContacts: uniqueContactCount(humanClicks),
        uniqueBotContacts: uniqueContactCount(botClicks),
        ...(lastClickedAt ? { lastClickedAt } : {}),
      }
    })
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
    return Array.from(this.linkRollups.values())
      .filter((rollup) => {
        if (input.broadcastId && rollup.broadcastId !== input.broadcastId) return false
        if (input.topic && !rollup.topics.includes(input.topic)) return false
        if (input.tag && !rollup.tags.includes(input.tag)) return false
        if (input.sponsor && rollup.sponsor !== input.sponsor) return false
        return true
      })
      .toSorted((a, b) => b.humanClicks - a.humanClicks)
      .slice(0, input.limit ?? 100)
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
    return getMemoryLinkSummaryInsights(this.contactLinkRollups.values(), input)
  }

  async getContactLinkInsights(
    contactId: string,
    limit = 100,
  ): Promise<ContactLinkInsight[]> {
    return Array.from(this.contactLinkRollups.values())
      .filter((rollup) => rollup.contactId === contactId)
      .toSorted((a, b) => b.humanClicks - a.humanClicks)
      .slice(0, limit)
  }

  async getContactTopicInsights(
    contactId: string,
    limit = 100,
  ): Promise<ContactTopicInsight[]> {
    const topics = new Map<string, ContactTopicInsight>()
    for (const rollup of this.contactLinkRollups.values()) {
      if (rollup.contactId !== contactId) continue
      for (const topic of rollup.topics) {
        const current =
          topics.get(topic) ??
          ({
            contactId,
            topic,
            humanClicks: 0,
            linkCount: 0,
          } satisfies ContactTopicInsight)
        current.humanClicks += rollup.humanClicks
        current.linkCount += 1
        if (
          rollup.lastClickedAt &&
          (!current.lastClickedAt ||
            current.lastClickedAt.getTime() < rollup.lastClickedAt.getTime())
        ) {
          current.lastClickedAt = rollup.lastClickedAt
        }
        topics.set(topic, current)
      }
    }
    return Array.from(topics.values())
      .toSorted((a, b) => b.humanClicks - a.humanClicks)
      .slice(0, limit)
  }

  async listEvents(input: EventListInput): Promise<EventRecord[]> {
    const types = input.types ? new Set(input.types) : undefined
    return this.events
      .filter((event) => {
        if (input.contactId && event.contactId !== input.contactId) return false
        if (input.broadcastId && event.broadcastId !== input.broadcastId) return false
        if (input.messageId && event.messageId !== input.messageId) return false
        if (input.linkId && event.linkId !== input.linkId) return false
        if (types && !types.has(event.type)) return false
        return true
      })
      .toSorted((a, b) => b.occurredAt.getTime() - a.occurredAt.getTime())
      .slice(0, input.limit)
  }

  async updateBroadcastStatus(id: string, status: BroadcastStatus): Promise<void> {
    const broadcast = this.broadcasts.get(id)
    if (!broadcast) throw new Error(`Broadcast not found: ${id}`)
    broadcast.status = status
    if (status === 'sending') broadcast.startedAt = new Date()
  }

  async cancelBroadcastMessages(id: string): Promise<number> {
    let cancelled = 0
    for (const message of this.messages.values()) {
      if (message.broadcastId === id && message.status === 'planned') {
        message.status = 'skipped'
        message.error = { reason: 'broadcast_cancelled' }
        cancelled += 1
      }
    }
    return cancelled
  }

  async createMessages(
    broadcastId: string,
    recipients: PlannedRecipient[],
  ): Promise<MessageRecord[]> {
    const broadcast = this.broadcasts.get(broadcastId)
    if (!broadcast) throw new Error(`Broadcast not found: ${broadcastId}`)
    const messages = recipients.map((recipient) => {
      const message: MessageRecord = {
        id: crypto.randomUUID(),
        broadcastId,
        contactId: recipient.contactId,
        toEmail: recipient.email,
        subject: broadcast.subject,
        status: 'planned',
        sendRank: recipient.sendRank,
        rankReason: recipient.rankReason,
        engagementScore: recipient.engagementScore,
        metadata: { recipientStatus: recipient.status },
        scheduledAt: recipient.scheduledAt,
        provider: 'ses',
        retryCount: 0,
        maxAttempts: 3,
      }
      this.messages.set(message.id, message)
      return message
    })
    broadcast.totalPlanned = messages.length
    return messages
  }

  async getMessage(id: string): Promise<MessageRecord | undefined> {
    return this.messages.get(id)
  }

  async findMessageByProviderId(
    providerMessageId: string,
  ): Promise<MessageRecord | undefined> {
    return Array.from(this.messages.values()).find(
      (message) => message.providerMessageId === providerMessageId,
    )
  }

  async listDueMessages(now: Date, limit: number): Promise<MessageRecord[]> {
    return Array.from(this.messages.values())
      .filter(
        (message) =>
          message.status === 'planned' &&
          message.scheduledAt.getTime() <= now.getTime() &&
          ['scheduled', 'sending'].includes(
            this.broadcasts.get(message.broadcastId)?.status ?? '',
          ),
      )
      .toSorted((a, b) => a.scheduledAt.getTime() - b.scheduledAt.getTime())
      .slice(0, limit)
  }

  async getQueueSummary(input: QueueSummaryInput): Promise<QueueSummary> {
    return getMemoryQueueSummary(this.messages.values(), this.events, input)
  }

  async claimDueMessages(now: Date, limit: number): Promise<MessageRecord[]> {
    const messages = await this.listDueMessages(now, limit)
    for (const message of messages) {
      message.status = 'sending'
      message.attemptedAt = now
      message.retryCount += 1
    }
    return messages
  }

  async updateMessage(input: {
    id: string
    status: MessageStatus
    providerMessageId?: string
    provider?: string
    scheduledAt?: Date
    error?: Record<string, unknown>
  }): Promise<void> {
    const message = this.messages.get(input.id)
    if (!message) throw new Error(`Message not found: ${input.id}`)
    message.status = input.status
    if (input.providerMessageId) message.providerMessageId = input.providerMessageId
    if (input.provider) message.provider = input.provider
    if (input.scheduledAt) message.scheduledAt = input.scheduledAt
    if (input.error) message.error = input.error
    if (input.status === 'failed') message.failedAt = new Date()
    if (input.status === 'sent') {
      const broadcast = this.broadcasts.get(message.broadcastId)
      if (broadcast) broadcast.status = 'sending'
    }
  }

  async retryFailedMessages(input: {
    broadcastId?: string
    scheduledAt: Date
    limit: number
  }): Promise<number> {
    let retried = 0
    for (const message of Array.from(this.messages.values())
      .filter(
        (message) =>
          message.status === 'failed' &&
          (!input.broadcastId || message.broadcastId === input.broadcastId),
      )
      .slice(0, input.limit)) {
      message.status = 'planned'
      message.scheduledAt = input.scheduledAt
      delete message.failedAt
      message.error = { reason: 'manual_retry' }
      const broadcast = this.broadcasts.get(message.broadcastId)
      if (broadcast && ['completed', 'failed'].includes(broadcast.status))
        broadcast.status = 'scheduled'
      retried += 1
    }
    return retried
  }

  async recoverStuckMessages(input: {
    staleBefore: Date
    rescheduleAt: Date
    limit: number
  }): Promise<{ recovered: number; failed: number }> {
    let recovered = 0
    let failed = 0
    const stuck = Array.from(this.messages.values())
      .filter(
        (message) =>
          message.status === 'sending' &&
          message.attemptedAt &&
          message.attemptedAt.getTime() <= input.staleBefore.getTime(),
      )
      .slice(0, input.limit)
    for (const message of stuck) {
      if (message.retryCount >= message.maxAttempts) {
        message.status = 'failed'
        message.failedAt = input.rescheduleAt
        failed += 1
      } else {
        message.status = 'planned'
        message.scheduledAt = input.rescheduleAt
        recovered += 1
      }
      message.error = { reason: 'stuck_sending' }
    }
    return { recovered, failed }
  }

  async finalizeBroadcasts(broadcastIds: string[]): Promise<void> {
    for (const broadcastId of new Set(broadcastIds)) {
      const broadcast = this.broadcasts.get(broadcastId)
      if (!broadcast) continue
      const related = Array.from(this.messages.values()).filter(
        (message) => message.broadcastId === broadcastId,
      )
      if (
        related.length > 0 &&
        related.every(
          (message) => message.status !== 'planned' && message.status !== 'sending',
        )
      ) {
        broadcast.status = 'completed'
      }
    }
  }

  async recordEvent(
    input: Omit<EventRecord, 'id' | 'occurredAt'> & { occurredAt?: Date },
  ): Promise<EventRecord> {
    if (input.idempotencyKey) {
      const existing = this.events.find(
        (event) => event.idempotencyKey === input.idempotencyKey,
      )
      if (existing) return existing
    }
    const event: EventRecord = {
      ...input,
      id: crypto.randomUUID(),
      occurredAt: input.occurredAt ?? new Date(),
    }
    this.events.push(event)
    return event
  }

  async getEngagement(contactIds: string[]) {
    return getMemoryEngagement(this.contacts.values(), this.events, contactIds)
  }

  async recordClickRollup(input: ClickRollupInput): Promise<void> {
    const metadata = linkAnalyticsMetadata(input.link)
    const linkRollup = this.linkRollups.get(input.link.id)
    const firstLinkHuman = !input.isBot && (linkRollup?.uniqueHumanContacts ?? 0) === 0
    const firstLinkBot = input.isBot && (linkRollup?.uniqueBotContacts ?? 0) === 0
    const contactKey = `${input.contactId}:${input.link.id}`
    const contactRollup = this.contactLinkRollups.get(contactKey)
    const firstContactHuman = !input.isBot && (contactRollup?.humanClicks ?? 0) === 0
    const firstContactBot = input.isBot && (contactRollup?.botClicks ?? 0) === 0

    this.linkRollups.set(input.link.id, {
      linkId: input.link.id,
      ...(input.link.broadcastId ? { broadcastId: input.link.broadcastId } : {}),
      ...(input.link.messageId ? { messageId: input.link.messageId } : {}),
      originalUrl: input.link.originalUrl,
      linkIndex: input.link.linkIndex,
      ...metadata,
      humanClicks: (linkRollup?.humanClicks ?? 0) + (input.isBot ? 0 : 1),
      botClicks: (linkRollup?.botClicks ?? 0) + (input.isBot ? 1 : 0),
      uniqueHumanContacts:
        (linkRollup?.uniqueHumanContacts ?? 0) +
        (firstContactHuman || firstLinkHuman ? 1 : 0),
      uniqueBotContacts:
        (linkRollup?.uniqueBotContacts ?? 0) + (firstContactBot || firstLinkBot ? 1 : 0),
      firstClickedAt: linkRollup?.firstClickedAt ?? input.occurredAt,
      lastClickedAt: input.occurredAt,
    })

    this.contactLinkRollups.set(contactKey, {
      contactId: input.contactId,
      linkId: input.link.id,
      ...(input.link.broadcastId ? { broadcastId: input.link.broadcastId } : {}),
      ...(input.link.messageId ? { messageId: input.link.messageId } : {}),
      originalUrl: input.link.originalUrl,
      ...metadata,
      humanClicks: (contactRollup?.humanClicks ?? 0) + (input.isBot ? 0 : 1),
      botClicks: (contactRollup?.botClicks ?? 0) + (input.isBot ? 1 : 0),
      firstClickedAt: contactRollup?.firstClickedAt ?? input.occurredAt,
      lastClickedAt: input.occurredAt,
    })
  }

  async createLink(
    input: Omit<LinkRecord, 'id' | 'metadata'> & {
      id?: string
      metadata?: Record<string, unknown>
    },
  ): Promise<LinkRecord> {
    const record: LinkRecord = {
      ...input,
      id: input.id ?? crypto.randomUUID(),
      metadata: input.metadata ?? {},
    }
    this.links.set(record.tokenHash, record)
    return record
  }
  async findLinkByTokenHash(hash: string): Promise<LinkRecord | undefined> {
    return this.links.get(hash)
  }
}
