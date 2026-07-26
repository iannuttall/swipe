import { z } from 'zod'
import { snsMessageSchema } from './sns-verification.js'
import type { EventType } from './types.js'

const bounceSchema = z.object({
  notificationType: z.literal('Bounce'),
  bounce: z.object({
    bounceType: z.enum(['Permanent', 'Transient', 'Undetermined']),
    bounceSubType: z.string().optional().nullable(),
    bouncedRecipients: z.array(
      z.object({
        emailAddress: z.string(),
        action: z.string().optional().nullable(),
        status: z.string().optional().nullable(),
        diagnosticCode: z.string().optional().nullable(),
      }),
    ),
    timestamp: z.string(),
    feedbackId: z.string(),
  }),
  mail: z.object({
    messageId: z.string(),
    destination: z.array(z.string()),
  }),
})

const complaintSchema = z.object({
  notificationType: z.literal('Complaint'),
  complaint: z.object({
    complainedRecipients: z.array(z.object({ emailAddress: z.string() })),
    timestamp: z.string(),
    feedbackId: z.string(),
    complaintFeedbackType: z.string().optional().nullable(),
  }),
  mail: z.object({
    messageId: z.string(),
    destination: z.array(z.string()),
  }),
})

const sesNotificationSchema = z.union([bounceSchema, complaintSchema])

export interface NormalizedProviderEvent {
  provider: 'ses'
  providerEventId: string
  providerMessageId: string
  type: EventType
  email: string
  occurredAt: Date
  permanent: boolean
  metadata: Record<string, unknown>
}

export function normalizeSesSnsWebhook(input: unknown): NormalizedProviderEvent[] {
  const snsResult = snsMessageSchema.safeParse(input)
  if (!snsResult.success) return []
  const sns = snsResult.data
  if (sns.Type !== 'Notification') return []

  const parsedMessage = parseJson(sns.Message)
  const parsedResult = sesNotificationSchema.safeParse(parsedMessage)
  if (!parsedResult.success) return []
  const parsed = parsedResult.data

  if (parsed.notificationType === 'Bounce') {
    const permanent = parsed.bounce.bounceType === 'Permanent'
    const recipients = parsed.bounce.bouncedRecipients.length
      ? parsed.bounce.bouncedRecipients
      : parsed.mail.destination.map((emailAddress) => ({ emailAddress }))

    return recipients.map((recipient) => ({
      provider: 'ses',
      providerEventId: `${sns.MessageId}:${recipient.emailAddress}`,
      providerMessageId: parsed.mail.messageId,
      type: 'message.bounced',
      email: recipient.emailAddress.trim().toLowerCase(),
      occurredAt: new Date(parsed.bounce.timestamp),
      permanent,
      metadata: {
        bounceType: parsed.bounce.bounceType,
        bounceSubType: parsed.bounce.bounceSubType,
        feedbackId: parsed.bounce.feedbackId,
        diagnosticCode:
          'diagnosticCode' in recipient ? recipient.diagnosticCode : undefined,
        status: 'status' in recipient ? recipient.status : undefined,
      },
    }))
  }

  const recipients = parsed.complaint.complainedRecipients.length
    ? parsed.complaint.complainedRecipients
    : parsed.mail.destination.map((emailAddress) => ({ emailAddress }))

  return recipients.map((recipient) => ({
    provider: 'ses',
    providerEventId: `${sns.MessageId}:${recipient.emailAddress}`,
    providerMessageId: parsed.mail.messageId,
    type: 'message.complained',
    email: recipient.emailAddress.trim().toLowerCase(),
    occurredAt: new Date(parsed.complaint.timestamp),
    permanent: true,
    metadata: {
      feedbackId: parsed.complaint.feedbackId,
      complaintFeedbackType: parsed.complaint.complaintFeedbackType,
    },
  }))
}

function parseJson(value: string): unknown {
  try {
    return JSON.parse(value)
  } catch {
    return undefined
  }
}
