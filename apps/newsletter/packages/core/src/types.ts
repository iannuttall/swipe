export type ContactStatus = 'active' | 'unsubscribed' | 'suppressed'
export type SubscriptionStatus = 'subscribed' | 'unsubscribed'
export type SuppressionReason =
  | 'unsubscribe'
  | 'hard_bounce'
  | 'complaint'
  | 'manual'
  | 'invalid_email'
  | 'domain_block'

export type DraftStatus = 'draft' | 'ready' | 'archived'
export type BroadcastStatus =
  | 'draft'
  | 'scheduled'
  | 'sending'
  | 'paused'
  | 'completed'
  | 'cancelled'
  | 'failed'

export type MessageStatus =
  | 'planned'
  | 'queued'
  | 'sending'
  | 'sent'
  | 'failed'
  | 'bounced'
  | 'complained'
  | 'skipped'

export type EventType =
  | 'contact.subscribed'
  | 'contact.unsubscribed'
  | 'contact.suppressed'
  | 'contact.tagged'
  | 'contact.purchase_recorded'
  | 'message.planned'
  | 'message.queued'
  | 'message.sent'
  | 'message.failed'
  | 'message.bounced'
  | 'message.complained'
  | 'engagement.opened'
  | 'engagement.clicked'
  | 'engagement.opened_by_bot'
  | 'engagement.clicked_by_bot'

export type DeliveryStrategy = 'steady' | 'duration' | 'warm_first'
export type RecipientStatus = 'new' | 'warm' | 'cold'

export type ProviderId = 'ses' | 'test' | string

export interface ContactInput {
  email: string
  name?: string
  attributes?: Record<string, unknown>
  source?: string
}

export interface DraftInput {
  subject: string
  bodyMarkdown: string
  name?: string
  preview?: string
  fromEmail?: string
  fromName?: string
  replyTo?: string
  template?: string
  metadata?: Record<string, unknown>
}

export interface BroadcastAudienceInput {
  listKey?: string
  tags?: string[]
  excludeTags?: string[]
}

export interface DeliveryPolicyInput {
  strategy?: DeliveryStrategy
  batchSize?: number
  batchDurationMinutes?: number
  durationHours?: number
  startAt?: Date
}

export interface EngagementSummary {
  contactId: string
  totalSends: number
  totalOpens: number
  totalClicks: number
  lastOpenedAt?: Date
  lastClickedAt?: Date
  lastSubscribedAt?: Date
}

export interface PlannedRecipient {
  contactId: string
  email: string
  domain: string
  engagementScore: number
  sendRank: number
  rankReason: string
  status: RecipientStatus
  scheduledAt: Date
}

export interface RenderedEmail {
  subject: string
  html: string
  text: string
  preview?: string
}
