import type { AppConfig } from './config.js'
import type { DoctorReport } from './readiness.js'

export type OpsChecklistStatus = 'pass' | 'warn' | 'fail' | 'info'

export interface OpsChecklistItem {
  id: string
  title: string
  status: OpsChecklistStatus
  detail: string
  command?: string
}

export interface OpsCommandStep {
  id: string
  title: string
  command: string
  detail: string
}

export interface ProductionOpsChecklist {
  appName: string
  env: string
  provider: string
  baseUrl: string
  ready: boolean
  generatedAt: Date
  settings: {
    trackOpens: boolean
    defaultDurationHours: number
    defaultBatchSize: number
    maxProviderRatePerSecond: number
  }
  checks: OpsChecklistItem[]
  rollout: OpsCommandStep[]
  emergency: OpsCommandStep[]
}

export function buildProductionOpsChecklist(input: {
  config: AppConfig
  doctor: DoctorReport
  now?: Date
}): ProductionOpsChecklist {
  const localBaseUrl = isLocalBaseUrl(input.config.baseUrl)
  const checks: OpsChecklistItem[] = [
    requiredCheck(
      'database',
      'Database configured',
      input.doctor.databaseConfigured,
      'DATABASE_URL is set.',
      'Set DATABASE_URL to the production Postgres database.',
    ),
    requiredCheck(
      'from_email',
      'Sender identity configured',
      input.doctor.fromEmailConfigured,
      'EMAIL_FROM_EMAIL is set.',
      'Set EMAIL_FROM_EMAIL to the verified sender/domain address.',
    ),
    requiredCheck(
      'api_auth',
      'API auth configured',
      input.doctor.apiAuthConfigured,
      'API_TOKEN is set.',
      'Set API_TOKEN before exposing the HTTP API.',
    ),
    requiredCheck(
      'tracking_secret',
      'Tracking secret configured',
      input.doctor.trackingConfigured,
      'TRACKING_SECRET is set.',
      'Set TRACKING_SECRET so click and open tokens are signed.',
    ),
    requiredCheck(
      'unsubscribe_secret',
      'Unsubscribe secret configured',
      input.doctor.unsubscribeConfigured,
      'UNSUBSCRIBE_SECRET is set.',
      'Set UNSUBSCRIBE_SECRET so unsubscribe links are signed.',
    ),
    {
      id: 'base_url',
      title: 'Public base URL',
      status: localBaseUrl
        ? input.config.env === 'production'
          ? 'fail'
          : 'warn'
        : 'pass',
      detail: localBaseUrl
        ? 'BASE_URL points at localhost. Use a public HTTPS URL before production sends.'
        : 'BASE_URL is public-facing.',
    },
    {
      id: 'provider_rate',
      title: 'Provider send throttle',
      status: 'pass',
      detail: `Provider sends are spaced at ${input.config.delivery.maxProviderRatePerSecond}/second maximum.`,
      command: 'EMAIL_SEND_RATE_PER_SECOND=14',
    },
    {
      id: 'open_tracking',
      title: 'Open tracking preference',
      status: input.config.tracking.trackOpens ? 'info' : 'pass',
      detail: input.config.tracking.trackOpens
        ? 'Open pixels are enabled. Disable with EMAIL_TRACK_OPENS=false if privacy matters more than old-app parity.'
        : 'Open pixels are disabled; click tracking remains enabled.',
    },
    ...sesChecks(input.doctor),
  ]

  return {
    appName: input.config.appName,
    env: input.config.env,
    provider: input.config.provider,
    baseUrl: input.config.baseUrl,
    ready: checks.every((check) => check.status !== 'fail'),
    generatedAt: input.now ?? new Date(),
    settings: {
      trackOpens: input.config.tracking.trackOpens,
      defaultDurationHours: input.config.delivery.defaultDurationHours,
      defaultBatchSize: input.config.delivery.batchSize,
      maxProviderRatePerSecond: input.config.delivery.maxProviderRatePerSecond,
    },
    checks,
    rollout: rolloutSteps(),
    emergency: emergencySteps(),
  }
}

function requiredCheck(
  id: string,
  title: string,
  ok: boolean,
  passDetail: string,
  failDetail: string,
): OpsChecklistItem {
  return {
    id,
    title,
    status: ok ? 'pass' : 'fail',
    detail: ok ? passDetail : failDetail,
  }
}

function sesChecks(doctor: DoctorReport): OpsChecklistItem[] {
  if (doctor.provider !== 'ses') return []
  return [
    requiredCheck(
      'ses_sns_webhook',
      'SES SNS webhook secret',
      doctor.snsWebhookConfigured,
      'AWS_SNS_WEBHOOK_SECRET is set.',
      'Set AWS_SNS_WEBHOOK_SECRET before accepting SES SNS webhooks.',
    ),
    requiredCheck(
      'ses_sns_topic_allowlist',
      'SES SNS topic allowlist',
      doctor.snsTopicAllowlistConfigured,
      'AWS_SNS_ALLOWED_TOPICS is set.',
      'Set AWS_SNS_ALLOWED_TOPICS so unexpected SNS topics are rejected.',
    ),
  ]
}

function rolloutSteps(): OpsCommandStep[] {
  return [
    {
      id: 'doctor',
      title: 'Check runtime readiness',
      command: 'email doctor --json',
      detail: 'All required runtime settings should be configured before sending.',
    },
    {
      id: 'migrate',
      title: 'Run migrations',
      command: 'email db migrate --json',
      detail: 'Apply database schema before importing contacts or creating broadcasts.',
    },
    {
      id: 'preview',
      title: 'Preview ranked send plan',
      command: 'email broadcast preview-plan --sample-limit 25 --json',
      detail: 'Check audience size, warm-first order, schedule range, and domain mix.',
    },
    {
      id: 'test',
      title: 'Send a test',
      command: 'email broadcast test --draft-id <draft_id> --to you@example.com --json',
      detail:
        'Verify rendering, links, unsubscribe confirmation, and tracking URL behavior.',
    },
    {
      id: 'canary',
      title: 'Create canary cohorts',
      command: 'email canary create --draft-id <draft_id> --steps 50,500,2000,all --json',
      detail: 'Send progressively larger warm-first cohorts before the full list.',
    },
    {
      id: 'worker',
      title: 'Run sender worker',
      command: 'email worker send --yes --batch-size 100 --interval-ms 10000',
      detail: 'Worker claims due messages; provider sends remain throttled in core.',
    },
  ]
}

function emergencySteps(): OpsCommandStep[] {
  return [
    {
      id: 'pause',
      title: 'Pause a broadcast',
      command: 'email broadcast pause <broadcast_id> --json',
      detail: 'Stops future sends without deleting planned messages.',
    },
    {
      id: 'cancel',
      title: 'Cancel a broadcast',
      command: 'email broadcast cancel <broadcast_id> --json',
      detail: 'Skips remaining planned messages and marks the broadcast cancelled.',
    },
    {
      id: 'recover_stuck',
      title: 'Recover stuck sending messages',
      command: 'email ops recover-stuck --yes --json',
      detail: 'Moves stale sending messages back to planned or failed based on attempts.',
    },
    {
      id: 'retry_failed',
      title: 'Retry failed messages',
      command: 'email message retry-failed --yes --broadcast-id <broadcast_id> --json',
      detail: 'Use only after fixing the provider or content issue that caused failure.',
    },
  ]
}

function isLocalBaseUrl(value: string): boolean {
  const url = new URL(value)
  return url.hostname === 'localhost' || url.hostname === '127.0.0.1'
}
