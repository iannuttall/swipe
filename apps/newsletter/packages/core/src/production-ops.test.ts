import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { loadConfig } from './config.js'
import { buildProductionOpsChecklist } from './production-ops.js'

describe('production ops checklist', () => {
  it('flags production localhost URLs and SES webhook gaps', () => {
    const config = loadConfig({
      NODE_ENV: 'production',
      BASE_URL: 'http://localhost:3000',
      DATABASE_URL: 'postgresql://email:email@localhost:5432/email',
      API_TOKEN: 'token',
      TRACKING_SECRET: 'tracking',
      UNSUBSCRIBE_SECRET: 'unsubscribe',
      EMAIL_PROVIDER: 'ses',
      EMAIL_FROM_EMAIL: 'newsletter@example.com',
    })
    const checklist = buildProductionOpsChecklist({
      config,
      doctor: {
        appName: 'email',
        env: 'production',
        provider: 'ses',
        baseUrl: config.baseUrl,
        databaseConfigured: true,
        fromEmailConfigured: true,
        apiAuthConfigured: true,
        trackingConfigured: true,
        unsubscribeConfigured: true,
        snsWebhookConfigured: false,
        snsTopicAllowlistConfigured: false,
        ready: false,
      },
      now: new Date(0),
    })

    assert.equal(checklist.ready, false)
    assert.equal(
      checklist.checks.find((check) => check.id === 'base_url')?.status,
      'fail',
    )
    assert.equal(
      checklist.checks.find((check) => check.id === 'ses_sns_webhook')?.status,
      'fail',
    )
    assert.ok(checklist.rollout.some((step) => step.command.includes('canary create')))
    assert.ok(checklist.emergency.some((step) => step.command.includes('recover-stuck')))
  })
})
