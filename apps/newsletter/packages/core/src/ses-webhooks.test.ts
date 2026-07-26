import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { normalizeSesSnsWebhook } from './ses-webhooks.js'

describe('SES SNS webhook normalization', () => {
  it('normalizes hard bounces', () => {
    const events = normalizeSesSnsWebhook({
      Type: 'Notification',
      MessageId: 'sns-1',
      Timestamp: '2026-06-20T00:00:00.000Z',
      Message: JSON.stringify({
        notificationType: 'Bounce',
        bounce: {
          bounceType: 'Permanent',
          bounceSubType: 'General',
          bouncedRecipients: [{ emailAddress: 'User@Example.com', status: '5.1.1' }],
          timestamp: '2026-06-20T00:00:00.000Z',
          feedbackId: 'feedback-1',
        },
        mail: {
          messageId: 'provider-1',
          destination: ['user@example.com'],
        },
      }),
    })

    assert.equal(events.length, 1)
    assert.equal(events[0]?.type, 'message.bounced')
    assert.equal(events[0]?.email, 'user@example.com')
    assert.equal(events[0]?.permanent, true)
  })

  it('normalizes complaints', () => {
    const events = normalizeSesSnsWebhook({
      Type: 'Notification',
      MessageId: 'sns-2',
      Timestamp: '2026-06-20T00:00:00.000Z',
      Message: JSON.stringify({
        notificationType: 'Complaint',
        complaint: {
          complainedRecipients: [{ emailAddress: 'User@Example.com' }],
          timestamp: '2026-06-20T00:00:00.000Z',
          feedbackId: 'feedback-2',
          complaintFeedbackType: 'abuse',
        },
        mail: {
          messageId: 'provider-2',
          destination: ['user@example.com'],
        },
      }),
    })

    assert.equal(events[0]?.type, 'message.complained')
    assert.equal(events[0]?.permanent, true)
  })

  it('ignores unsupported SES notification types', () => {
    const events = normalizeSesSnsWebhook({
      Type: 'Notification',
      MessageId: 'sns-3',
      Timestamp: '2026-06-20T00:00:00.000Z',
      Message: JSON.stringify({
        notificationType: 'Delivery',
        mail: {
          messageId: 'provider-3',
          destination: ['user@example.com'],
        },
      }),
    })

    assert.deepEqual(events, [])
    assert.deepEqual(
      normalizeSesSnsWebhook({
        Type: 'Notification',
        MessageId: 'sns-4',
        Timestamp: '2026-06-20T00:00:00.000Z',
        Message: 'not json',
      }),
      [],
    )
  })
})
