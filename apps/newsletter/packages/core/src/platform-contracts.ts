import type { SendPlanPreview } from './broadcast-planning.js'
import type { ProductionOpsChecklist } from './production-ops.js'
import type { DoctorReport } from './readiness.js'
import type { NormalizedProviderEvent } from './ses-webhooks.js'
import type {
  BroadcastRecord,
  BroadcastStats,
  CanaryCampaignRecord,
  CanaryCohortRecord,
  ContactLinkInsight,
  ContactRecord,
  ContactTopicInsight,
  EventRecord,
  LinkInsight,
  LinkStats,
  LinkSummaryInsight,
  QueueSummary,
} from './store.js'
import type {
  AudienceFilter,
  AudiencePreview,
  ContactExternalIdRecord,
  ContactTagRecord,
  ContactValueRecord,
  PurchaseRecord,
  RollupRebuildResult,
} from './subscriber-intelligence.js'
import type {
  DeliveryPolicyInput,
  DraftInput,
  EngagementSummary,
  RecipientStatus,
} from './types.js'

export interface EmailPlatform {
  subscribe(input: {
    email: string
    name?: string
    source?: string
  }): Promise<{ id: string }>
  unsubscribeContact(input: {
    emailOrId: string
    broadcastId?: string
    source?: string
  }): Promise<{ unsubscribed: boolean; contactId: string; email: string }>
  exportContacts(input?: { limit?: number }): Promise<ContactExport>
  recentContacts(input?: { days?: number; limit?: number }): Promise<RecentContacts>
  importContacts(input: ContactImport): Promise<{ imported: number; suppressed: number }>
  doctor(): Promise<DoctorReport>
  getProductionOpsChecklist(): Promise<ProductionOpsChecklist>
  getQueueSummary(input?: QueueSummaryRequest): Promise<QueueSummary>
  createDraft(input: DraftInput): Promise<{ id: string }>
  createBroadcast(input: {
    draftId: string
    name?: string
    audience?: AudienceFilter
    deliveryPolicy?: DeliveryPolicyInput
    scheduledAt?: Date
  }): Promise<{ id: string; totalPlanned: number }>
  createCanary(input: {
    draftId: string
    name?: string
    audience?: AudienceFilter
    deliveryPolicy?: DeliveryPolicyInput
    steps?: Array<number | 'all'>
    scheduledAt?: Date
  }): Promise<CanaryState>
  promoteCanary(input: {
    id: string
    stepIndex?: number
    scheduledAt?: Date
  }): Promise<CanaryState>
  getCanary(id: string): Promise<CanaryState | undefined>
  tagContact(input: {
    emailOrId: string
    tagKey: string
    name?: string
    source?: string
    metadata?: Record<string, unknown>
  }): Promise<ContactTagRecord>
  untagContact(input: {
    emailOrId: string
    tagKey: string
  }): Promise<{ removed: boolean }>
  listContactTags(input: { emailOrId: string }): Promise<ContactTagRecord[] | undefined>
  upsertContactExternalId(input: {
    emailOrId: string
    provider: string
    externalId: string
    label?: string
    metadata?: Record<string, unknown>
  }): Promise<ContactExternalIdRecord>
  findContactByExternalId(input: {
    provider: string
    externalId: string
  }): Promise<ContactRecord | undefined>
  recordPurchase(input: {
    email?: string
    contactId?: string
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
  getContactValue(input: { emailOrId: string }): Promise<ContactValueRecord[] | undefined>
  previewAudience(input?: AudienceFilter): Promise<AudiencePreview>
  previewSendPlan(input?: {
    audience?: AudienceFilter
    deliveryPolicy?: DeliveryPolicyInput
    scheduledAt?: Date
    sampleLimit?: number
  }): Promise<SendPlanPreview>
  rebuildAnalyticsRollups(): Promise<RollupRebuildResult>
  listBroadcasts(input?: { limit?: number }): Promise<BroadcastRecord[]>
  getBroadcast(id: string): Promise<BroadcastRecord | undefined>
  getBroadcastStats(id: string): Promise<BroadcastStats | undefined>
  getBroadcastLinkStats(id: string): Promise<LinkStats[] | undefined>
  listBroadcastEvents(input: {
    broadcastId: string
    limit?: number
  }): Promise<EventRecord[] | undefined>
  getContactAnalytics(input: {
    emailOrId: string
    limit?: number
  }): Promise<ContactAnalytics | undefined>
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
  getContactLinkInsights(input: {
    emailOrId: string
    limit?: number
  }): Promise<ContactLinkInsight[] | undefined>
  getContactTopicInsights(input: {
    emailOrId: string
    limit?: number
  }): Promise<ContactTopicInsight[] | undefined>
  pauseBroadcast(id: string): Promise<{ paused: boolean }>
  resumeBroadcast(id: string): Promise<{ resumed: boolean }>
  cancelBroadcast(id: string): Promise<{ cancelled: boolean; skipped: number }>
  sendTest(input: {
    draftId: string
    to: string
    status?: RecipientStatus
  }): Promise<{ providerMessageId: string }>
  sendSesSimulator(input: {
    draftId: string
    type: SesSimulatorType
  }): Promise<{ providerMessageId: string; to: string }>
  retryFailedMessages(input?: {
    broadcastId?: string
    limit?: number
    scheduledAt?: Date
  }): Promise<{ retried: number }>
  sendDue(now?: Date, limit?: number): Promise<SendDueResult>
  recoverStuckMessages(input?: RecoverStuckInput): Promise<{
    recovered: number
    failed: number
  }>
  trackOpen(input: TrackingRequest): Promise<{ recorded: boolean }>
  trackClick(input: TrackingRequest): Promise<{ recorded: boolean; url?: string }>
  unsubscribe(input: {
    token: string
    source?: string
  }): Promise<{ unsubscribed: boolean }>
  handleProviderEvents(events: NormalizedProviderEvent[]): Promise<{ processed: number }>
}

export interface TrackingRequest {
  token: string
  ip?: string
  userAgent?: string
}

export interface SendDueResult {
  sent: number
  skipped: number
  retried?: number
  failed?: number
}

export interface RecoverStuckInput {
  now?: Date
  staleAfterMs?: number
  limit?: number
}

export interface QueueSummaryRequest {
  now?: Date
  staleAfterMs?: number
  since?: Date
}

export interface ContactAnalytics {
  contact: ContactRecord
  engagement: EngagementSummary
  events: EventRecord[]
  links: ContactLinkInsight[]
  topics: ContactTopicInsight[]
}

export interface CanaryState {
  campaign: CanaryCampaignRecord
  cohorts: CanaryCohortRecord[]
  nextStep?: number | 'all'
}

export interface ContactExport {
  contacts: ContactRecord[]
  suppressions: Array<{
    email?: string
    domain?: string
    reason: string
    description?: string
    source: string
  }>
}

export interface RecentContacts {
  since: string
  days: number
  signups: number
  contacts: Array<{
    email: string
    name?: string
    source?: string
    status: ContactRecord['status']
    subscribedAt?: string
  }>
}

export interface ContactImport {
  contacts: Array<{
    email: string
    name?: string | undefined
    attributes?: Record<string, unknown> | undefined
    source?: string | undefined
  }>
  suppressions?:
    | Array<{
        email?: string | undefined
        domain?: string | undefined
        reason?: string | undefined
        description?: string | undefined
        source?: string | undefined
      }>
    | undefined
}

export type SesSimulatorType = 'success' | 'bounce' | 'complaint' | 'ooto' | 'suppression'
