import type {
  broadcasts,
  contactExternalIds,
  contactLinkRollups,
  contacts,
  contactValueRollups,
  drafts,
  events,
  linkRollups,
  links,
  messages,
  purchases,
  suppressions,
} from './db/schema.js'
import type {
  BroadcastRecord,
  ContactLinkInsight,
  ContactRecord,
  DraftRecord,
  EventRecord,
  LinkInsight,
  LinkRecord,
  LinkSummaryInsight,
  MessageRecord,
  SuppressionRecord,
} from './store.js'
import type {
  ContactExternalIdRecord,
  ContactValueRecord,
  PurchaseRecord,
} from './subscriber-intelligence.js'

export type ContactRow = typeof contacts.$inferSelect
export type DraftRow = typeof drafts.$inferSelect
export type BroadcastRow = typeof broadcasts.$inferSelect
export type MessageRow = typeof messages.$inferSelect
export type EventRow = typeof events.$inferSelect
export type LinkRow = typeof links.$inferSelect
export type LinkRollupRow = typeof linkRollups.$inferSelect
export type ContactLinkRollupRow = typeof contactLinkRollups.$inferSelect
export type ContactExternalIdRow = typeof contactExternalIds.$inferSelect
export type PurchaseRow = typeof purchases.$inferSelect
export type ContactValueRollupRow = typeof contactValueRollups.$inferSelect
export type SuppressionRow = typeof suppressions.$inferSelect

export function mapContact(row: ContactRow): ContactRecord {
  return {
    id: row.id,
    email: row.email,
    emailDomain: row.emailDomain,
    status: row.status,
    attributes: row.attributes,
    hardBounceCount: row.hardBounceCount,
    softBounceCount: row.softBounceCount,
    complaintCount: row.complaintCount,
    ...(row.name ? { name: row.name } : {}),
    ...(row.source ? { source: row.source } : {}),
    ...(row.subscribedAt ? { subscribedAt: row.subscribedAt } : {}),
    ...(row.unsubscribedAt ? { unsubscribedAt: row.unsubscribedAt } : {}),
    ...(row.suppressedAt ? { suppressedAt: row.suppressedAt } : {}),
  }
}

export function mapDraft(row: DraftRow): DraftRecord {
  return {
    id: row.id,
    subject: row.subject,
    bodyMarkdown: row.bodyMarkdown,
    status: row.status,
    createdAt: row.createdAt,
    template: row.template,
    metadata: row.metadata,
    ...(row.name ? { name: row.name } : {}),
    ...(row.preview ? { preview: row.preview } : {}),
    ...(row.fromEmail ? { fromEmail: row.fromEmail } : {}),
    ...(row.fromName ? { fromName: row.fromName } : {}),
    ...(row.replyTo ? { replyTo: row.replyTo } : {}),
  }
}

export function mapSuppression(row: SuppressionRow): SuppressionRecord {
  return {
    id: row.id,
    reason: row.reason,
    source: row.source,
    active: row.active,
    suppressedAt: row.suppressedAt,
    ...(row.email ? { email: row.email } : {}),
    ...(row.domain ? { domain: row.domain } : {}),
    ...(row.contactId ? { contactId: row.contactId } : {}),
    ...(row.description ? { description: row.description } : {}),
  }
}

export function mapBroadcast(row: BroadcastRow): BroadcastRecord {
  if (!row.draftId) throw new Error(`Broadcast missing draft: ${row.id}`)
  return {
    id: row.id,
    draftId: row.draftId,
    name: row.name,
    subject: row.subject,
    status: row.status,
    audience: row.audience,
    deliveryPolicy: row.deliveryPolicy,
    totalPlanned: row.totalPlanned,
    ...(row.scheduledAt ? { scheduledAt: row.scheduledAt } : {}),
    ...(row.startedAt ? { startedAt: row.startedAt } : {}),
  }
}

export function mapContactExternalId(row: ContactExternalIdRow): ContactExternalIdRecord {
  return {
    id: row.id,
    contactId: row.contactId,
    provider: row.provider,
    externalId: row.externalId,
    metadata: row.metadata,
    createdAt: row.createdAt,
    ...(row.label ? { label: row.label } : {}),
  }
}

export function mapPurchase(row: PurchaseRow): PurchaseRecord {
  return {
    id: row.id,
    contactId: row.contactId,
    provider: row.provider,
    productKey: row.productKey,
    amountCents: row.amountCents,
    currency: row.currency,
    purchasedAt: row.purchasedAt,
    metadata: row.metadata,
    ...(row.externalId ? { externalId: row.externalId } : {}),
    ...(row.idempotencyKey ? { idempotencyKey: row.idempotencyKey } : {}),
    ...(row.productName ? { productName: row.productName } : {}),
  }
}

export function mapContactValue(row: ContactValueRollupRow): ContactValueRecord {
  return {
    contactId: row.contactId,
    currency: row.currency,
    purchaseCount: row.purchaseCount,
    totalAmountCents: row.totalAmountCents,
    ...(row.firstPurchasedAt ? { firstPurchasedAt: row.firstPurchasedAt } : {}),
    ...(row.lastPurchasedAt ? { lastPurchasedAt: row.lastPurchasedAt } : {}),
  }
}

export function mapMessage(row: MessageRow): MessageRecord {
  if (!row.broadcastId || !row.contactId) {
    throw new Error(`Message missing broadcast or contact: ${row.id}`)
  }
  return {
    id: row.id,
    broadcastId: row.broadcastId,
    contactId: row.contactId,
    toEmail: row.toEmail,
    subject: row.subject,
    status: row.status,
    sendRank: row.sendRank,
    rankReason: row.rankReason,
    engagementScore: row.engagementScore,
    scheduledAt: row.scheduledAt,
    provider: row.provider,
    retryCount: row.retryCount,
    maxAttempts: row.maxAttempts,
    metadata: row.metadata,
    ...(row.providerMessageId ? { providerMessageId: row.providerMessageId } : {}),
    ...(row.attemptedAt ? { attemptedAt: row.attemptedAt } : {}),
    ...(row.failedAt ? { failedAt: row.failedAt } : {}),
    ...(row.error ? { error: row.error } : {}),
  }
}

export function mapEvent(row: EventRow): EventRecord {
  return {
    id: row.id,
    type: row.type,
    source: row.source,
    occurredAt: row.occurredAt,
    metadata: row.metadata,
    ...(row.contactId ? { contactId: row.contactId } : {}),
    ...(row.broadcastId ? { broadcastId: row.broadcastId } : {}),
    ...(row.messageId ? { messageId: row.messageId } : {}),
    ...(row.linkId ? { linkId: row.linkId } : {}),
    ...(row.idempotencyKey ? { idempotencyKey: row.idempotencyKey } : {}),
    ...(row.userAgent ? { userAgent: row.userAgent } : {}),
    ...(row.ipHash ? { ipHash: row.ipHash } : {}),
  }
}

export function mapLink(row: LinkRow): LinkRecord {
  return {
    id: row.id,
    originalUrl: row.originalUrl,
    linkIndex: row.linkIndex,
    tokenHash: row.tokenHash,
    metadata: row.metadata,
    ...(row.messageId ? { messageId: row.messageId } : {}),
    ...(row.broadcastId ? { broadcastId: row.broadcastId } : {}),
  }
}

export function mapLinkInsight(row: LinkRollupRow): LinkInsight {
  return {
    linkId: row.linkId,
    originalUrl: row.originalUrl,
    linkIndex: row.linkIndex,
    tags: row.tags,
    topics: row.topics,
    humanClicks: row.humanClicks,
    botClicks: row.botClicks,
    uniqueHumanContacts: row.uniqueHumanContacts,
    uniqueBotContacts: row.uniqueBotContacts,
    ...(row.broadcastId ? { broadcastId: row.broadcastId } : {}),
    ...(row.messageId ? { messageId: row.messageId } : {}),
    ...(row.urlHost ? { urlHost: row.urlHost } : {}),
    ...(row.sponsor ? { sponsor: row.sponsor } : {}),
    ...(row.firstClickedAt ? { firstClickedAt: row.firstClickedAt } : {}),
    ...(row.lastClickedAt ? { lastClickedAt: row.lastClickedAt } : {}),
  }
}

export function mapLinkSummaryInsight(row: Record<string, unknown>): LinkSummaryInsight {
  const firstClickedAt = dateValue(row.firstClickedAt)
  const lastClickedAt = dateValue(row.lastClickedAt)
  return {
    originalUrl: row.originalUrl as string,
    tags: stringArray(row.tags),
    topics: stringArray(row.topics),
    humanClicks: row.humanClicks as number,
    botClicks: row.botClicks as number,
    uniqueHumanContacts: row.uniqueHumanContacts as number,
    uniqueBotContacts: row.uniqueBotContacts as number,
    linkCount: row.linkCount as number,
    broadcastCount: row.broadcastCount as number,
    ...(row.urlHost ? { urlHost: row.urlHost as string } : {}),
    ...(row.sponsor ? { sponsor: row.sponsor as string } : {}),
    ...(firstClickedAt ? { firstClickedAt } : {}),
    ...(lastClickedAt ? { lastClickedAt } : {}),
  }
}

export function mapContactLinkInsight(row: ContactLinkRollupRow): ContactLinkInsight {
  return {
    contactId: row.contactId,
    linkId: row.linkId,
    originalUrl: row.originalUrl,
    tags: row.tags,
    topics: row.topics,
    humanClicks: row.humanClicks,
    botClicks: row.botClicks,
    ...(row.broadcastId ? { broadcastId: row.broadcastId } : {}),
    ...(row.messageId ? { messageId: row.messageId } : {}),
    ...(row.urlHost ? { urlHost: row.urlHost } : {}),
    ...(row.sponsor ? { sponsor: row.sponsor } : {}),
    ...(row.firstClickedAt ? { firstClickedAt: row.firstClickedAt } : {}),
    ...(row.lastClickedAt ? { lastClickedAt: row.lastClickedAt } : {}),
  }
}

export function assertMoney(amountCents: number): void {
  if (!Number.isSafeInteger(amountCents) || amountCents < 0) {
    throw new Error('amountCents must be safe non-negative integer cents')
  }
}

export function linkAnalyticsMetadata(link: LinkRecord): {
  urlHost?: string
  tags: string[]
  topics: string[]
  sponsor?: string
} {
  return {
    ...(typeof link.metadata.urlHost === 'string'
      ? { urlHost: link.metadata.urlHost }
      : {}),
    tags: stringArray(link.metadata.tags),
    topics: stringArray(link.metadata.topics),
    ...(typeof link.metadata.sponsor === 'string'
      ? { sponsor: link.metadata.sponsor }
      : {}),
  }
}

export function stringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === 'string')
    : []
}

export function dateValue(value: unknown): Date | undefined {
  if (value instanceof Date) return value
  if (typeof value !== 'string') return undefined
  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? undefined : parsed
}
