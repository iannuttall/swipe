import { pgEnum } from 'drizzle-orm/pg-core'

export const contactStatusEnum = pgEnum('contact_status', [
  'pending',
  'active',
  'unsubscribed',
  'suppressed',
])

export const confirmationPurposeEnum = pgEnum('confirmation_purpose', [
  'double_opt_in',
  'swipe_migration',
])

export const confirmationStatusEnum = pgEnum('confirmation_status', [
  'pending',
  'confirmed',
  'expired',
  'cancelled',
])

export const eventTypeEnum = pgEnum('event_type', [
  'contact.confirmation_requested',
  'contact.confirmed',
  'contact.subscribed',
  'contact.unsubscribed',
  'contact.suppressed',
  'contact.tagged',
  'contact.purchase_recorded',
  'message.planned',
  'message.queued',
  'message.sent',
  'message.failed',
  'message.bounced',
  'message.complained',
  'engagement.opened',
  'engagement.clicked',
  'engagement.opened_by_bot',
  'engagement.clicked_by_bot',
])
