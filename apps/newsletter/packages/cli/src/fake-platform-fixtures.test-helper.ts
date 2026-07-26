import type {
  CanaryState,
  DoctorReport,
  ProductionOpsChecklist,
  QueueSummary,
} from '@email/core'

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
    snsWebhookConfigured: true,
    snsTopicAllowlistConfigured: true,
    ready: true,
  }
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
