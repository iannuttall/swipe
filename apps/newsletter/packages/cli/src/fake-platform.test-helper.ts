import type {
  AudienceFilter,
  CanaryState,
  ContactExternalIdRecord,
  ContactTagRecord,
  DeliveryPolicyInput,
  DoctorReport,
  EmailPlatform,
  ProductionOpsChecklist,
  PurchaseRecord,
  QueueSummary,
  QueueSummaryRequest,
  RecentContacts,
  SendPlanPreview,
} from '@email/core'
import {
  canaryState,
  doctorReport,
  opsChecklist,
  queueSummary,
} from './fake-platform-fixtures.test-helper.js'

export class FakePlatform implements EmailPlatform {
  subscribedEmail?: string
  unsubscribedContact?: { emailOrId: string; broadcastId?: string; source?: string }
  draftSubject?: string
  draftTemplate: string | undefined
  draftPreview: string | undefined
  importedEmails: string[] = []
  taggedContact?: { emailOrId: string; tagKey: string }
  recordedPurchase?: { productKey: string; amountCents: number }
  previewedAudience: AudienceFilter | undefined = undefined
  previewedPlan:
    | {
        audience?: AudienceFilter
        deliveryPolicy?: DeliveryPolicyInput
        sampleLimit?: number
      }
    | undefined = undefined
  createdBroadcast:
    | {
        audience?: AudienceFilter
        deliveryPolicy?: DeliveryPolicyInput
      }
    | undefined = undefined
  createdCanary:
    | {
        audience?: AudienceFilter
        deliveryPolicy?: DeliveryPolicyInput
        steps?: Array<number | 'all'>
      }
    | undefined = undefined
  queueSummaryRequest: QueueSummaryRequest | undefined = undefined

  async subscribe(input: { email: string }): Promise<{ id: string }> {
    this.subscribedEmail = input.email
    return { id: 'contact_1' }
  }

  async unsubscribeContact(input: {
    emailOrId: string
    broadcastId?: string
    source?: string
  }): Promise<{ unsubscribed: boolean; contactId: string; email: string }> {
    this.unsubscribedContact = input
    return { unsubscribed: true, contactId: 'contact_1', email: input.emailOrId }
  }

  async exportContacts(): Promise<{ contacts: []; suppressions: [] }> {
    return { contacts: [], suppressions: [] }
  }

  recentContactsInput: { days?: number; limit?: number } | undefined = undefined

  async recentContacts(input?: {
    days?: number
    limit?: number
  }): Promise<RecentContacts> {
    this.recentContactsInput = input
    return {
      since: '2026-07-12T00:00:00.000Z',
      days: input?.days ?? 7,
      signups: 1,
      contacts: [
        {
          email: 'new@example.com',
          source: 'ian.is',
          status: 'active',
          subscribedAt: '2026-07-18T12:00:00.000Z',
        },
      ],
    }
  }

  async importContacts(input?: {
    contacts?: Array<{ email: string }>
  }): Promise<{ imported: number; suppressed: number }> {
    this.importedEmails = input?.contacts?.map((contact) => contact.email) ?? []
    return { imported: this.importedEmails.length, suppressed: 0 }
  }

  async doctor(): Promise<DoctorReport> {
    return doctorReport()
  }

  async getProductionOpsChecklist(): Promise<ProductionOpsChecklist> {
    return opsChecklist()
  }

  async getQueueSummary(input?: QueueSummaryRequest): Promise<QueueSummary> {
    this.queueSummaryRequest = input
    return queueSummary()
  }

  async createDraft(input: {
    subject: string
    template?: string
    preview?: string
  }): Promise<{ id: string }> {
    this.draftSubject = input.subject
    this.draftTemplate = input.template
    this.draftPreview = input.preview
    return { id: 'draft_1' }
  }

  async createBroadcast(input: {
    draftId: string
    audience?: AudienceFilter
    deliveryPolicy?: DeliveryPolicyInput
  }): Promise<{ id: string; totalPlanned: number }> {
    this.createdBroadcast = input
    return { id: 'broadcast_1', totalPlanned: 1 }
  }

  async createCanary(input: {
    audience?: AudienceFilter
    deliveryPolicy?: DeliveryPolicyInput
    steps?: Array<number | 'all'>
  }): Promise<CanaryState> {
    this.createdCanary = input
    return canaryState()
  }

  async promoteCanary(): Promise<CanaryState> {
    return canaryState()
  }

  async getCanary(): Promise<CanaryState> {
    return canaryState()
  }

  async tagContact(input: {
    emailOrId: string
    tagKey: string
  }): Promise<ContactTagRecord> {
    this.taggedContact = input
    return {
      contactId: 'contact_1',
      tagKey: input.tagKey,
      tagName: input.tagKey,
      source: 'test',
      metadata: {},
      taggedAt: new Date(0),
    }
  }

  async untagContact(): Promise<{ removed: boolean }> {
    return { removed: true }
  }

  async listContactTags(): Promise<[]> {
    return []
  }

  async upsertContactExternalId(): Promise<ContactExternalIdRecord> {
    return {
      id: 'external_1',
      contactId: 'contact_1',
      provider: 'stripe',
      externalId: 'cus_1',
      metadata: {},
      createdAt: new Date(0),
    }
  }

  async findContactByExternalId(): Promise<undefined> {
    return undefined
  }

  async recordPurchase(input: {
    productKey: string
    amountCents: number
  }): Promise<PurchaseRecord> {
    this.recordedPurchase = input
    return {
      id: 'purchase_1',
      contactId: 'contact_1',
      provider: 'stripe',
      productKey: input.productKey,
      amountCents: input.amountCents,
      currency: 'USD',
      purchasedAt: new Date(0),
      metadata: {},
    }
  }

  async getContactValue(): Promise<[]> {
    return []
  }

  async previewAudience(input?: AudienceFilter) {
    this.previewedAudience = input
    return { audience: {}, total: 0, suppressed: 0, sample: [] }
  }

  async previewSendPlan(input?: {
    audience?: AudienceFilter
    deliveryPolicy?: DeliveryPolicyInput
    sampleLimit?: number
  }): Promise<SendPlanPreview> {
    this.previewedPlan = input
    return {
      audience: input?.audience ?? {},
      deliveryPolicy: input?.deliveryPolicy ?? {},
      total: 0,
      suppressed: 0,
      sample: [],
      domains: [],
    }
  }

  async rebuildAnalyticsRollups() {
    return { linkRollups: 0, contactLinkRollups: 0, valueRollups: 0 }
  }

  async listBroadcasts(): Promise<[]> {
    return []
  }

  async getBroadcast(): Promise<undefined> {
    return undefined
  }

  async getBroadcastStats(): Promise<undefined> {
    return undefined
  }

  async getBroadcastLinkStats(): Promise<[]> {
    return []
  }

  async listBroadcastEvents(): Promise<[]> {
    return []
  }

  async getContactAnalytics(): Promise<undefined> {
    return undefined
  }

  async getLinkInsights(): Promise<[]> {
    return []
  }

  async getLinkSummaryInsights() {
    return [
      {
        originalUrl: 'https://example.com',
        tags: [],
        topics: ['ai-agents'],
        humanClicks: 2,
        botClicks: 0,
        uniqueHumanContacts: 2,
        uniqueBotContacts: 0,
        linkCount: 2,
        broadcastCount: 1,
      },
    ]
  }

  async getContactLinkInsights(): Promise<[]> {
    return []
  }

  async getContactTopicInsights(): Promise<[]> {
    return []
  }

  async pauseBroadcast(): Promise<{ paused: boolean }> {
    return { paused: true }
  }

  async resumeBroadcast(): Promise<{ resumed: boolean }> {
    return { resumed: true }
  }

  async cancelBroadcast(): Promise<{ cancelled: boolean; skipped: number }> {
    return { cancelled: true, skipped: 1 }
  }

  async sendTest(): Promise<{ providerMessageId: string }> {
    return { providerMessageId: 'test_1' }
  }

  async sendSesSimulator(): Promise<{ providerMessageId: string; to: string }> {
    return { providerMessageId: 'test_1', to: 'success@simulator.amazonses.com' }
  }

  async retryFailedMessages(): Promise<{ retried: number }> {
    return { retried: 1 }
  }

  async sendDue(): Promise<{ sent: number; skipped: number }> {
    return { sent: 1, skipped: 0 }
  }

  async recoverStuckMessages(): Promise<{ recovered: number; failed: number }> {
    return { recovered: 0, failed: 0 }
  }

  async trackOpen(): Promise<{ recorded: boolean }> {
    return { recorded: true }
  }

  async trackClick(): Promise<{ recorded: boolean; url?: string }> {
    return { recorded: true, url: 'https://example.com' }
  }

  async unsubscribe(): Promise<{ unsubscribed: boolean }> {
    return { unsubscribed: true }
  }

  async handleProviderEvents(): Promise<{ processed: number }> {
    return { processed: 1 }
  }
}
