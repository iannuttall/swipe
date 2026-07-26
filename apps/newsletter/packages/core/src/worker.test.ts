import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import type { SendPlanPreview } from './broadcast-planning.js'
import type { EmailPlatform } from './platform.js'
import type { CanaryState, RecentContacts } from './platform-contracts.js'
import type { ProductionOpsChecklist } from './production-ops.js'
import type { DoctorReport } from './readiness.js'
import type { QueueSummary } from './store.js'
import type {
  ContactExternalIdRecord,
  ContactTagRecord,
  PurchaseRecord,
} from './subscriber-intelligence.js'
import { runSendWorker, runSendWorkerOnce } from './worker.js'

describe('send worker', () => {
  it('runs one send batch', async () => {
    const platform = new FakePlatform()
    const result = await runSendWorkerOnce({ platform, batchSize: 50 })

    assert.equal(result.sent, 2)
    assert.equal(platform.calls, 1)
    assert.equal(platform.recoveryCalls, 0)
    assert.equal(platform.lastLimit, 50)
  })

  it('recovers stuck messages only when explicitly requested', async () => {
    const platform = new FakePlatform()
    await runSendWorkerOnce({ platform, recoverStuck: true })

    assert.equal(platform.recoveryCalls, 1)
  })

  it('loops with a bounded iteration count', async () => {
    const platform = new FakePlatform()
    const result = await runSendWorker({
      platform,
      batchSize: 25,
      intervalMs: 0,
      maxIterations: 3,
    })

    assert.deepEqual(result, { iterations: 3, sent: 6, skipped: 3 })
    assert.equal(platform.calls, 3)
    assert.equal(platform.recoveryCalls, 0)
    assert.equal(platform.lastLimit, 25)
  })
})

class FakePlatform implements EmailPlatform {
  async unsubscribeContact(input: {
    emailOrId: string
  }): Promise<{ unsubscribed: boolean; contactId: string; email: string }> {
    return { unsubscribed: true, contactId: 'contact_1', email: input.emailOrId }
  }
  calls = 0
  recoveryCalls = 0
  lastLimit: number | undefined

  async sendDue(_now?: Date, limit?: number): Promise<{ sent: number; skipped: number }> {
    this.calls += 1
    this.lastLimit = limit
    return { sent: 2, skipped: 1 }
  }

  async recoverStuckMessages(): Promise<{ recovered: number; failed: number }> {
    this.recoveryCalls += 1
    return { recovered: 0, failed: 0 }
  }

  async subscribe(): Promise<{ id: string }> {
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

  async recordPurchase(): Promise<PurchaseRecord> {
    return {
      id: 'purchase_1',
      contactId: 'contact_1',
      provider: 'stripe',
      productKey: 'product',
      amountCents: 1000,
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
