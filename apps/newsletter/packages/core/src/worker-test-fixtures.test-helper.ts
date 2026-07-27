import type { CanaryState, RecentContacts } from './platform-contracts.js'
import type { ProductionOpsChecklist } from './production-ops.js'
import type { DoctorReport } from './readiness.js'
import type { QueueSummary } from './store.js'

export function doctorReport(): DoctorReport {
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
    confirmationConfigured: true,
    snsWebhookConfigured: true,
    snsTopicAllowlistConfigured: true,
    ready: true,
  }
}

export function confirmationReport() {
  return {
    purpose: 'swipe_migration' as const,
    batchKey: 'swipe-migration-2026',
    total: 1,
    pending: 1,
    confirmed: 0,
    expired: 0,
    cancelled: 0,
    activeUnconfirmed: 1,
  }
}

export function recentContacts(): RecentContacts {
  return { since: new Date(0).toISOString(), days: 7, signups: 0, contacts: [] }
}

export function opsChecklist(): ProductionOpsChecklist {
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

export function queueSummary(): QueueSummary {
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

export function canaryState(): CanaryState {
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
