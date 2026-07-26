import assert from 'node:assert/strict'
import {
  CoreEmailPlatform,
  loadConfig,
  MemoryEmailStore,
  type SnsMessage,
  TestEmailProvider,
} from '@email/core'
import { createApp } from './index.js'

export function makeTestApp() {
  const config = loadConfig({
    NODE_ENV: 'test',
    APP_NAME: 'Acme Mail',
    API_TOKEN: 'api-token',
    BASE_URL: 'http://localhost',
    EMAIL_PROVIDER: 'test',
    EMAIL_FROM_EMAIL: 'from@example.com',
    AWS_SNS_WEBHOOK_SECRET: 'sns-secret',
    AWS_SNS_ALLOWED_TOPICS: 'arn:aws:sns:us-east-1:123456789012:email',
  })
  const store = new MemoryEmailStore()
  const provider = new TestEmailProvider()
  const platform = new CoreEmailPlatform({ store, provider, config })
  return {
    app: createApp({
      config,
      platform,
      verifySnsSignature: async () => true,
      confirmSnsSubscription: async () => true,
    }),
    store,
    provider,
  }
}

export function makeSubscriptionTestApp(input: {
  confirmSnsSubscription: (message: SnsMessage) => Promise<boolean>
}) {
  const config = loadConfig({
    NODE_ENV: 'test',
    API_TOKEN: 'api-token',
    BASE_URL: 'http://localhost',
    EMAIL_PROVIDER: 'test',
    EMAIL_FROM_EMAIL: 'from@example.com',
    AWS_SNS_WEBHOOK_SECRET: 'sns-secret',
    AWS_SNS_ALLOWED_TOPICS: 'arn:aws:sns:us-east-1:123456789012:email',
  })
  return createApp({
    config,
    platform: new CoreEmailPlatform({
      store: new MemoryEmailStore(),
      provider: new TestEmailProvider(),
      config,
    }),
    verifySnsSignature: async () => true,
    confirmSnsSubscription: input.confirmSnsSubscription,
  })
}

export async function authorized(
  app: ReturnType<typeof createApp>,
  path: string,
  body: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  const response = await app.request(path, {
    method: 'POST',
    headers: { 'x-api-token': 'api-token' },
    body: JSON.stringify(body),
  })
  assert.ok(response.ok, `${path} returned ${response.status}`)
  return (await response.json()) as Record<string, unknown>
}

export function snsBounce(testMessageNumber: string) {
  return {
    Type: 'Notification',
    MessageId: 'sns-message',
    TopicArn: 'arn:aws:sns:us-east-1:123456789012:email',
    Message: JSON.stringify({
      notificationType: 'Bounce',
      bounce: {
        bounceType: 'Permanent',
        bounceSubType: 'General',
        bouncedRecipients: [{ emailAddress: 'bounce@example.com' }],
        timestamp: '2026-06-20T00:00:00.000Z',
        feedbackId: 'feedback-id',
      },
      mail: {
        messageId: `test_${testMessageNumber}`,
        destination: ['bounce@example.com'],
      },
    }),
    Timestamp: '2026-06-20T00:00:00.000Z',
  }
}

export function snsDelivery() {
  return {
    Type: 'Notification',
    MessageId: 'sns-delivery',
    TopicArn: 'arn:aws:sns:us-east-1:123456789012:email',
    Message: JSON.stringify({
      notificationType: 'Delivery',
      mail: {
        messageId: 'provider-delivery',
        destination: ['delivered@example.com'],
      },
    }),
    Timestamp: '2026-06-20T00:00:00.000Z',
  }
}
