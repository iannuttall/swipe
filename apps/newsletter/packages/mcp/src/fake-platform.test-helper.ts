import type {
  CanaryState,
  ContactExternalIdRecord,
  ContactTagRecord,
  DoctorReport,
  EmailPlatform,
  ProductionOpsChecklist,
  PurchaseRecord,
  QueueSummary,
  RecentContacts,
  SendPlanPreview,
} from '@email/core'

export class FakePlatform implements EmailPlatform {
  async unsubscribeContact(input: {
    emailOrId: string
  }): Promise<{ unsubscribed: boolean; contactId: string; email: string }> {
    return { unsubscribed: true, contactId: 'contact_1', email: input.emailOrId }
  }
  subscribedEmail?: string
  recordedPurchase?: { productKey: string; amountCents: number }

  async subscribe(input: { email: string }): Promise<{ id: string }> {
    this.subscribedEmail = input.email
    return { id: 'contact_1' }
  }

  async exportContacts(): Promise<{ contacts: []; suppressions: [] }> {
    return { contacts: [], suppressions: [] }
  }

  async recentContacts(): Promise<RecentContacts> {
    return { since: new Date(0).toISOString(), days: 7, signups: 0, contacts: [] }
  }

  async importContacts(): Promise<{ imported: number; suppressed: number }> {
    return { imported: 0, suppressed: 0 }
  }

  async doctor(): Promise<DoctorReport> {
    return doctorReport()
  }

  async getProductionOpsChecklist(): Promise<ProductionOpsChecklist> {
    return opsChecklist()
  }

  async getQueueSummary(): Promise<QueueSummary> {
    return queueSummary()
  }

  async createDraft(): Promise<{ id: string }> {
    return { id: 'draft_1' }
  }

  async createBroadcast(): Promise<{ id: string; totalPlanned: number }> {
    return { id: 'broadcast_1', totalPlanned: 1 }
  }

  async createCanary(): Promise<CanaryState> {
    return canaryState()
  }

  async promoteCanary(): Promise<CanaryState> {
    return canaryState()
  }

  async getCanary(): Promise<CanaryState> {
    return canaryState()
  }

  async tagContact(): Promise<ContactTagRecord> {
    return {
      contactId: 'contact_1',
      tagKey: 'vip',
      tagName: 'vip',
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

  async previewAudience(): Promise<{
    audience: Record<string, never>
    total: number
    suppressed: number
    sample: []
  }> {
    return { audience: {}, total: 0, suppressed: 0, sample: [] }
  }

  async previewSendPlan(): Promise<SendPlanPreview> {
    return {
      audience: {},
      deliveryPolicy: {},
      total: 0,
      suppressed: 0,
      sample: [],
      domains: [],
    }
  }

  async rebuildAnalyticsRollups(): Promise<{
    linkRollups: number
    contactLinkRollups: number
    valueRollups: number
  }> {
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

  async getLinkSummaryInsights(): Promise<[]> {
    return []
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

function doctorReport() {
  return {
    appName: 'email',
    env: 'test',
    provider: 'test',
    baseUrl: 'http://localhost',
    databaseConfigured: true,
    fromEmailConfigured: true,
    apiAuthConfigured: true,
    trackingConfigured: true,
    unsubscribeConfigured: true,
    snsWebhookConfigured: true,
    snsTopicAllowlistConfigured: true,
    ready: true,
  }
}

function opsChecklist(): ProductionOpsChecklist {
  return {
    appName: 'email',
    env: 'test',
    provider: 'test',
    baseUrl: 'http://localhost',
    ready: true,
    generatedAt: new Date(0),
    settings: {
      trackOpens: true,
      defaultDurationHours: 20,
      defaultBatchSize: 1000,
      maxProviderRatePerSecond: 14,
    },
    checks: [],
    rollout: [],
    emergency: [],
  }
}

function queueSummary(): QueueSummary {
  return {
    generatedAt: new Date(0),
    plannedDue: 0,
    plannedFuture: 0,
    sending: 0,
    staleSending: 0,
    failed: 0,
    bounced: 0,
    complained: 0,
    recentBounces: 0,
    recentComplaints: 0,
  }
}

function canaryState(): CanaryState {
  return {
    campaign: {
      id: 'canary_1',
      draftId: 'draft_1',
      status: 'active',
      audience: {},
      deliveryPolicy: {},
      steps: [50, 'all'],
      createdAt: new Date(0),
    },
    cohorts: [],
    nextStep: 50,
  }
}
