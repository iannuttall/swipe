import type {
  AudienceFilter,
  AudienceResolution,
  ContactExternalIdRecord,
  ContactTagRecord,
  ContactValueRecord,
  PurchaseRecord,
  RollupRebuildResult,
} from './subscriber-intelligence.js'
import type {
  BroadcastStatus,
  ContactInput,
  ContactStatus,
  DeliveryPolicyInput,
  DraftInput,
  EngagementSummary,
  EventType,
  MessageStatus,
  PlannedRecipient,
  SuppressionReason,
} from './types.js'

export interface ContactRecord {
  id: string
  email: string
  emailDomain: string
  name?: string
  status: ContactStatus
  attributes: Record<string, unknown>
  source?: string
  hardBounceCount: number
  softBounceCount: number
  complaintCount: number
  subscribedAt?: Date
  unsubscribedAt?: Date
  suppressedAt?: Date
}

export interface DraftRecord extends DraftInput {
  id: string
  status: 'draft' | 'ready' | 'archived'
  createdAt: Date
}

export interface BroadcastRecord {
  id: string
  draftId: string
  name: string
  subject: string
  status: BroadcastStatus
  audience: Record<string, unknown>
  deliveryPolicy: Record<string, unknown>
  totalPlanned: number
  scheduledAt?: Date
  startedAt?: Date
}

export type CanaryStepValue = number | 'all'

export interface CanaryCampaignRecord {
  id: string
  draftId: string
  name?: string
  status: 'active' | 'completed' | 'cancelled'
  audience: Record<string, unknown>
  deliveryPolicy: Record<string, unknown>
  steps: CanaryStepValue[]
  scheduledAt?: Date
  createdAt: Date
  completedAt?: Date
}

export interface CanaryCohortRecord {
  id: string
  campaignId: string
  stepIndex: number
  target: CanaryStepValue
  targetTotal: number
  addedCount: number
  broadcastId: string
  contactIds: string[]
  createdAt: Date
}

export interface SuppressionRecord {
  id: string
  email?: string
  domain?: string
  contactId?: string
  reason: SuppressionReason
  description?: string
  source: string
  active: boolean
  suppressedAt: Date
}

export interface BroadcastStats {
  broadcastId: string
  planned: number
  sending: number
  sent: number
  failed: number
  bounced: number
  complained: number
  unsubscribed: number
  skipped: number
  opened: number
  clicked: number
  openedByBot: number
  clickedByBot: number
}

export interface LinkStats {
  linkId: string
  broadcastId?: string
  messageId?: string
  originalUrl: string
  linkIndex: number
  humanClicks: number
  botClicks: number
  uniqueHumanContacts: number
  uniqueBotContacts: number
  firstClickedAt?: Date
  lastClickedAt?: Date
}

export interface LinkInsight extends LinkStats {
  urlHost?: string
  tags: string[]
  topics: string[]
  sponsor?: string
}

export interface LinkSummaryInsight {
  originalUrl: string
  urlHost?: string
  tags: string[]
  topics: string[]
  sponsor?: string
  humanClicks: number
  botClicks: number
  uniqueHumanContacts: number
  uniqueBotContacts: number
  linkCount: number
  broadcastCount: number
  firstClickedAt?: Date
  lastClickedAt?: Date
}

export interface ContactLinkInsight {
  contactId: string
  linkId: string
  broadcastId?: string
  messageId?: string
  originalUrl: string
  urlHost?: string
  tags: string[]
  topics: string[]
  sponsor?: string
  humanClicks: number
  botClicks: number
  firstClickedAt?: Date
  lastClickedAt?: Date
}

export interface ContactTopicInsight {
  contactId: string
  topic: string
  humanClicks: number
  linkCount: number
  lastClickedAt?: Date
}

export interface MessageRecord {
  id: string
  broadcastId: string
  contactId: string
  toEmail: string
  subject: string
  status: MessageStatus
  sendRank: number
  rankReason: string
  engagementScore: number
  scheduledAt: Date
  provider: string
  providerMessageId?: string
  retryCount: number
  maxAttempts: number
  attemptedAt?: Date
  failedAt?: Date
  error?: Record<string, unknown>
  metadata: Record<string, unknown>
}

export interface EventRecord {
  id: string
  type: EventType
  contactId?: string
  broadcastId?: string
  messageId?: string
  linkId?: string
  source: string
  occurredAt: Date
  idempotencyKey?: string
  userAgent?: string
  ipHash?: string
  metadata: Record<string, unknown>
}

export interface LinkRecord {
  id: string
  messageId?: string
  broadcastId?: string
  originalUrl: string
  linkIndex: number
  tokenHash: string
  metadata: Record<string, unknown>
}

export interface ClickRollupInput {
  link: LinkRecord
  contactId: string
  isBot: boolean
  occurredAt: Date
}

export interface EventListInput {
  contactId?: string
  broadcastId?: string
  messageId?: string
  linkId?: string
  types?: EventType[]
  limit: number
}

export interface QueueSummaryInput {
  now: Date
  staleBefore: Date
  since: Date
}

export interface QueueSummary {
  generatedAt: Date
  plannedDue: number
  plannedFuture: number
  sending: number
  staleSending: number
  failed: number
  bounced: number
  complained: number
  recentBounces: number
  recentComplaints: number
  oldestDueAt?: Date
  nextScheduledAt?: Date
}

export interface EmailStore {
  upsertContact(input: ContactInput): Promise<ContactRecord>
  getContact(id: string): Promise<ContactRecord | undefined>
  findContactByEmail(email: string): Promise<ContactRecord | undefined>
  listContacts(input?: {
    limit?: number
    status?: ContactStatus
  }): Promise<ContactRecord[]>
  listRecentContacts(input: { since: Date; limit?: number }): Promise<ContactRecord[]>
  listActiveContacts(): Promise<ContactRecord[]>
  tagContact(input: {
    contactId: string
    tagKey: string
    name?: string
    source?: string
    metadata?: Record<string, unknown>
  }): Promise<ContactTagRecord>
  untagContact(input: { contactId: string; tagKey: string }): Promise<void>
  listContactTags(contactId: string): Promise<ContactTagRecord[]>
  upsertContactExternalId(input: {
    contactId: string
    provider: string
    externalId: string
    label?: string
    metadata?: Record<string, unknown>
  }): Promise<ContactExternalIdRecord>
  findContactByExternalId(input: {
    provider: string
    externalId: string
  }): Promise<ContactRecord | undefined>
  listContactExternalIds(contactId: string): Promise<ContactExternalIdRecord[]>
  recordPurchase(input: {
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
  }): Promise<PurchaseRecord>
  listContactPurchases(contactId: string, limit?: number): Promise<PurchaseRecord[]>
  getContactValue(contactId: string): Promise<ContactValueRecord[]>
  resolveAudience(input?: AudienceFilter): Promise<AudienceResolution>
  rebuildAnalyticsRollups(): Promise<RollupRebuildResult>
  unsubscribeContact(input: {
    contactId?: string
    email?: string
    source?: string
  }): Promise<void>
  reactivateContact(input: { contactId?: string; email?: string }): Promise<void>
  addSuppression(input: {
    email?: string
    domain?: string
    contactId?: string
    reason: SuppressionReason
    description?: string
    source?: string
  }): Promise<void>
  listActiveSuppressionsForEmail(email: string): Promise<SuppressionRecord[]>
  isSuppressed(email: string): Promise<boolean>
  listSuppressions(input?: { limit?: number }): Promise<SuppressionRecord[]>
  createDraft(input: DraftInput): Promise<DraftRecord>
  getDraft(id: string): Promise<DraftRecord | undefined>
  createBroadcast(input: {
    draftId: string
    name: string
    subject: string
    audience?: AudienceFilter
    deliveryPolicy?: DeliveryPolicyInput
    scheduledAt?: Date
  }): Promise<BroadcastRecord>
  createCanaryCampaign(input: {
    draftId: string
    name?: string
    audience?: AudienceFilter
    deliveryPolicy?: DeliveryPolicyInput
    steps: CanaryStepValue[]
    scheduledAt?: Date
  }): Promise<CanaryCampaignRecord>
  getCanaryCampaign(id: string): Promise<CanaryCampaignRecord | undefined>
  updateCanaryCampaignStatus(
    id: string,
    status: CanaryCampaignRecord['status'],
  ): Promise<void>
  createCanaryCohort(input: {
    campaignId: string
    stepIndex: number
    target: CanaryStepValue
    targetTotal: number
    addedCount: number
    broadcastId: string
    contactIds: string[]
  }): Promise<CanaryCohortRecord>
  listCanaryCohorts(campaignId: string): Promise<CanaryCohortRecord[]>
  getBroadcast(id: string): Promise<BroadcastRecord | undefined>
  listBroadcasts(limit: number): Promise<BroadcastRecord[]>
  getBroadcastStats(id: string): Promise<BroadcastStats | undefined>
  getBroadcastLinkStats(id: string): Promise<LinkStats[]>
  getLinkInsights(input?: {
    broadcastId?: string
    topic?: string
    tag?: string
    sponsor?: string
    limit?: number
  }): Promise<LinkInsight[]>
  getLinkSummaryInsights(input?: {
    broadcastId?: string
    topic?: string
    tag?: string
    sponsor?: string
    limit?: number
  }): Promise<LinkSummaryInsight[]>
  getContactLinkInsights(contactId: string, limit?: number): Promise<ContactLinkInsight[]>
  getContactTopicInsights(
    contactId: string,
    limit?: number,
  ): Promise<ContactTopicInsight[]>
  listEvents(input: EventListInput): Promise<EventRecord[]>
  updateBroadcastStatus(id: string, status: BroadcastStatus): Promise<void>
  cancelBroadcastMessages(id: string): Promise<number>
  createMessages(
    broadcastId: string,
    recipients: PlannedRecipient[],
  ): Promise<MessageRecord[]>
  getMessage(id: string): Promise<MessageRecord | undefined>
  findMessageByProviderId(providerMessageId: string): Promise<MessageRecord | undefined>
  listDueMessages(now: Date, limit: number): Promise<MessageRecord[]>
  getQueueSummary(input: QueueSummaryInput): Promise<QueueSummary>
  claimDueMessages(now: Date, limit: number): Promise<MessageRecord[]>
  updateMessage(input: {
    id: string
    status: MessageStatus
    providerMessageId?: string
    provider?: string
    scheduledAt?: Date
    error?: Record<string, unknown>
  }): Promise<void>
  retryFailedMessages(input: {
    broadcastId?: string
    scheduledAt: Date
    limit: number
  }): Promise<number>
  recoverStuckMessages(input: {
    staleBefore: Date
    rescheduleAt: Date
    limit: number
  }): Promise<{ recovered: number; failed: number }>
  finalizeBroadcasts(broadcastIds: string[]): Promise<void>
  recordEvent(
    input: Omit<EventRecord, 'id' | 'occurredAt'> & { occurredAt?: Date },
  ): Promise<EventRecord>
  recordClickRollup(input: ClickRollupInput): Promise<void>
  getEngagement(contactIds: string[]): Promise<Map<string, EngagementSummary>>
  createLink(
    input: Omit<LinkRecord, 'id' | 'metadata'> & {
      id?: string
      metadata?: Record<string, unknown>
    },
  ): Promise<LinkRecord>
  findLinkByTokenHash(tokenHash: string): Promise<LinkRecord | undefined>
}

export { MemoryEmailStore } from './memory-store.js'
