import { sql } from 'drizzle-orm'
import {
  bigint,
  boolean,
  check,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core'

export const contactStatusEnum = pgEnum('contact_status', [
  'active',
  'unsubscribed',
  'suppressed',
])
export const subscriptionStatusEnum = pgEnum('subscription_status', [
  'subscribed',
  'unsubscribed',
])
export const suppressionReasonEnum = pgEnum('suppression_reason', [
  'unsubscribe',
  'hard_bounce',
  'complaint',
  'manual',
  'invalid_email',
  'domain_block',
])
export const draftStatusEnum = pgEnum('draft_status', ['draft', 'ready', 'archived'])
export const broadcastStatusEnum = pgEnum('broadcast_status', [
  'draft',
  'scheduled',
  'sending',
  'paused',
  'completed',
  'cancelled',
  'failed',
])
export const messageStatusEnum = pgEnum('message_status', [
  'planned',
  'queued',
  'sending',
  'sent',
  'failed',
  'bounced',
  'complained',
  'skipped',
])
export const eventTypeEnum = pgEnum('event_type', [
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

const timestamps = {
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => sql`now()`),
}

export const contacts = pgTable(
  'contacts',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    email: text('email').notNull(),
    emailDomain: text('email_domain').notNull(),
    name: text('name'),
    status: contactStatusEnum('status').notNull().default('active'),
    attributes: jsonb('attributes')
      .$type<Record<string, unknown>>()
      .notNull()
      .default({}),
    source: text('source'),
    hardBounceCount: integer('hard_bounce_count').notNull().default(0),
    softBounceCount: integer('soft_bounce_count').notNull().default(0),
    complaintCount: integer('complaint_count').notNull().default(0),
    subscribedAt: timestamp('subscribed_at', { withTimezone: true }),
    unsubscribedAt: timestamp('unsubscribed_at', { withTimezone: true }),
    suppressedAt: timestamp('suppressed_at', { withTimezone: true }),
    ...timestamps,
  },
  (table) => [
    uniqueIndex('contacts_email_unique').on(table.email),
    index('contacts_status_idx').on(table.status),
    index('contacts_domain_idx').on(table.emailDomain),
  ],
)

export const lists = pgTable(
  'lists',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    key: text('key').notNull(),
    name: text('name').notNull(),
    description: text('description'),
    ...timestamps,
  },
  (table) => [uniqueIndex('lists_key_unique').on(table.key)],
)

export const subscriptions = pgTable(
  'subscriptions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    contactId: uuid('contact_id')
      .notNull()
      .references(() => contacts.id, { onDelete: 'cascade' }),
    listId: uuid('list_id')
      .notNull()
      .references(() => lists.id, { onDelete: 'cascade' }),
    status: subscriptionStatusEnum('status').notNull().default('subscribed'),
    subscribedAt: timestamp('subscribed_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    unsubscribedAt: timestamp('unsubscribed_at', { withTimezone: true }),
    source: text('source'),
    metadata: jsonb('metadata').$type<Record<string, unknown>>().notNull().default({}),
    ...timestamps,
  },
  (table) => [
    uniqueIndex('subscriptions_contact_list_unique').on(table.contactId, table.listId),
    index('subscriptions_status_idx').on(table.status),
  ],
)

export const suppressions = pgTable(
  'suppressions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    email: text('email'),
    domain: text('domain'),
    contactId: uuid('contact_id').references(() => contacts.id, { onDelete: 'set null' }),
    reason: suppressionReasonEnum('reason').notNull(),
    description: text('description'),
    source: text('source').notNull().default('system'),
    metadata: jsonb('metadata').$type<Record<string, unknown>>().notNull().default({}),
    active: boolean('active').notNull().default(true),
    suppressedAt: timestamp('suppressed_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    ...timestamps,
  },
  (table) => [
    index('suppressions_email_idx').on(table.email),
    index('suppressions_domain_idx').on(table.domain),
    index('suppressions_active_idx').on(table.active),
    index('suppressions_active_email_idx')
      .on(table.email)
      .where(sql`${table.active} = true and ${table.email} is not null`),
    index('suppressions_active_domain_idx')
      .on(table.domain)
      .where(sql`${table.active} = true and ${table.domain} is not null`),
    check(
      'suppressions_email_domain_exclusive',
      sql`not (${table.email} is not null and ${table.domain} is not null)`,
    ),
  ],
)

export const tags = pgTable(
  'tags',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    key: text('key').notNull(),
    name: text('name').notNull(),
    description: text('description'),
    ...timestamps,
  },
  (table) => [uniqueIndex('tags_key_unique').on(table.key)],
)

export const contactTags = pgTable(
  'contact_tags',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    contactId: uuid('contact_id')
      .notNull()
      .references(() => contacts.id, { onDelete: 'cascade' }),
    tagId: uuid('tag_id')
      .notNull()
      .references(() => tags.id, { onDelete: 'cascade' }),
    source: text('source').notNull().default('manual'),
    metadata: jsonb('metadata').$type<Record<string, unknown>>().notNull().default({}),
    taggedAt: timestamp('tagged_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('contact_tags_contact_tag_unique').on(table.contactId, table.tagId),
    index('contact_tags_tag_contact_idx').on(table.tagId, table.contactId),
  ],
)

export const contactExternalIds = pgTable(
  'contact_external_ids',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    contactId: uuid('contact_id')
      .notNull()
      .references(() => contacts.id, { onDelete: 'cascade' }),
    provider: text('provider').notNull(),
    externalId: text('external_id').notNull(),
    label: text('label'),
    metadata: jsonb('metadata').$type<Record<string, unknown>>().notNull().default({}),
    ...timestamps,
  },
  (table) => [
    uniqueIndex('contact_external_ids_provider_external_unique').on(
      table.provider,
      table.externalId,
    ),
    uniqueIndex('contact_external_ids_contact_provider_external_unique').on(
      table.contactId,
      table.provider,
      table.externalId,
    ),
    index('contact_external_ids_contact_idx').on(table.contactId),
    index('contact_external_ids_provider_idx').on(table.provider),
  ],
)

export const purchases = pgTable(
  'purchases',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    contactId: uuid('contact_id')
      .notNull()
      .references(() => contacts.id, { onDelete: 'cascade' }),
    provider: text('provider').notNull().default('manual'),
    externalId: text('external_id'),
    idempotencyKey: text('idempotency_key'),
    productKey: text('product_key').notNull(),
    productName: text('product_name'),
    amountCents: bigint('amount_cents', { mode: 'number' }).notNull(),
    currency: text('currency').notNull(),
    purchasedAt: timestamp('purchased_at', { withTimezone: true }).notNull(),
    metadata: jsonb('metadata').$type<Record<string, unknown>>().notNull().default({}),
    ...timestamps,
  },
  (table) => [
    uniqueIndex('purchases_provider_external_unique').on(
      table.provider,
      table.externalId,
    ),
    uniqueIndex('purchases_idempotency_key_unique').on(table.idempotencyKey),
    index('purchases_contact_idx').on(table.contactId),
    index('purchases_product_key_idx').on(table.productKey),
    index('purchases_product_contact_idx').on(table.productKey, table.contactId),
    index('purchases_purchased_at_idx').on(table.purchasedAt),
  ],
)

export const contactValueRollups = pgTable(
  'contact_value_rollups',
  {
    contactId: uuid('contact_id')
      .notNull()
      .references(() => contacts.id, { onDelete: 'cascade' }),
    currency: text('currency').notNull(),
    purchaseCount: integer('purchase_count').notNull().default(0),
    totalAmountCents: bigint('total_amount_cents', { mode: 'number' })
      .notNull()
      .default(0),
    firstPurchasedAt: timestamp('first_purchased_at', { withTimezone: true }),
    lastPurchasedAt: timestamp('last_purchased_at', { withTimezone: true }),
    ...timestamps,
  },
  (table) => [
    primaryKey({ columns: [table.contactId, table.currency] }),
    index('contact_value_rollups_currency_total_idx').on(
      table.currency,
      table.totalAmountCents,
    ),
  ],
)

export const drafts = pgTable(
  'drafts',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    name: text('name'),
    subject: text('subject').notNull(),
    preview: text('preview'),
    bodyMarkdown: text('body_markdown').notNull(),
    template: text('template').notNull().default('default'),
    fromEmail: text('from_email'),
    fromName: text('from_name'),
    replyTo: text('reply_to'),
    status: draftStatusEnum('status').notNull().default('draft'),
    metadata: jsonb('metadata').$type<Record<string, unknown>>().notNull().default({}),
    ...timestamps,
  },
  (table) => [index('drafts_status_idx').on(table.status)],
)

export const broadcasts = pgTable(
  'broadcasts',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    draftId: uuid('draft_id').references(() => drafts.id, { onDelete: 'set null' }),
    name: text('name').notNull(),
    subject: text('subject').notNull(),
    status: broadcastStatusEnum('status').notNull().default('draft'),
    audience: jsonb('audience').$type<Record<string, unknown>>().notNull().default({}),
    deliveryPolicy: jsonb('delivery_policy')
      .$type<Record<string, unknown>>()
      .notNull()
      .default({}),
    totalPlanned: integer('total_planned').notNull().default(0),
    totalSent: integer('total_sent').notNull().default(0),
    totalBounced: integer('total_bounced').notNull().default(0),
    totalComplained: integer('total_complained').notNull().default(0),
    totalUnsubscribed: integer('total_unsubscribed').notNull().default(0),
    totalOpened: integer('total_opened').notNull().default(0),
    totalClicked: integer('total_clicked').notNull().default(0),
    scheduledAt: timestamp('scheduled_at', { withTimezone: true }),
    startedAt: timestamp('started_at', { withTimezone: true }),
    completedAt: timestamp('completed_at', { withTimezone: true }),
    ...timestamps,
  },
  (table) => [
    index('broadcasts_status_idx').on(table.status),
    index('broadcasts_scheduled_at_idx').on(table.scheduledAt),
  ],
)

export const canaryCampaigns = pgTable(
  'canary_campaigns',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    draftId: uuid('draft_id')
      .notNull()
      .references(() => drafts.id, { onDelete: 'cascade' }),
    name: text('name'),
    status: text('status').notNull().default('active'),
    audience: jsonb('audience').$type<Record<string, unknown>>().notNull().default({}),
    deliveryPolicy: jsonb('delivery_policy')
      .$type<Record<string, unknown>>()
      .notNull()
      .default({}),
    steps: jsonb('steps').$type<Array<number | 'all'>>().notNull(),
    scheduledAt: timestamp('scheduled_at', { withTimezone: true }),
    completedAt: timestamp('completed_at', { withTimezone: true }),
    ...timestamps,
  },
  (table) => [
    index('canary_campaigns_status_idx').on(table.status),
    index('canary_campaigns_draft_idx').on(table.draftId),
  ],
)

export const canaryCohorts = pgTable(
  'canary_cohorts',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    campaignId: uuid('campaign_id')
      .notNull()
      .references(() => canaryCampaigns.id, { onDelete: 'cascade' }),
    stepIndex: integer('step_index').notNull(),
    target: jsonb('target').$type<number | 'all'>().notNull(),
    targetTotal: integer('target_total').notNull(),
    addedCount: integer('added_count').notNull(),
    broadcastId: uuid('broadcast_id')
      .notNull()
      .references(() => broadcasts.id, { onDelete: 'cascade' }),
    contactIds: jsonb('contact_ids').$type<string[]>().notNull().default([]),
    ...timestamps,
  },
  (table) => [
    uniqueIndex('canary_cohorts_campaign_step_unique').on(
      table.campaignId,
      table.stepIndex,
    ),
    index('canary_cohorts_broadcast_idx').on(table.broadcastId),
  ],
)

export const messages = pgTable(
  'messages',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    broadcastId: uuid('broadcast_id').references(() => broadcasts.id, {
      onDelete: 'cascade',
    }),
    contactId: uuid('contact_id').references(() => contacts.id, { onDelete: 'set null' }),
    provider: text('provider').notNull().default('ses'),
    providerMessageId: text('provider_message_id'),
    toEmail: text('to_email').notNull(),
    subject: text('subject').notNull(),
    status: messageStatusEnum('status').notNull().default('planned'),
    sendRank: integer('send_rank').notNull().default(0),
    rankReason: text('rank_reason').notNull().default('default'),
    engagementScore: integer('engagement_score').notNull().default(0),
    scheduledAt: timestamp('scheduled_at', { withTimezone: true }).notNull(),
    attemptedAt: timestamp('attempted_at', { withTimezone: true }),
    sentAt: timestamp('sent_at', { withTimezone: true }),
    failedAt: timestamp('failed_at', { withTimezone: true }),
    retryCount: integer('retry_count').notNull().default(0),
    maxAttempts: integer('max_attempts').notNull().default(3),
    error: jsonb('error').$type<Record<string, unknown>>(),
    metadata: jsonb('metadata').$type<Record<string, unknown>>().notNull().default({}),
    ...timestamps,
  },
  (table) => [
    index('messages_broadcast_idx').on(table.broadcastId),
    index('messages_contact_idx').on(table.contactId),
    index('messages_status_scheduled_idx').on(table.status, table.scheduledAt),
    index('messages_planned_schedule_rank_idx')
      .on(table.scheduledAt, table.sendRank)
      .where(sql`${table.status} = 'planned'`),
    index('messages_provider_message_idx').on(table.providerMessageId),
  ],
)

export const links = pgTable(
  'links',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    messageId: uuid('message_id').references(() => messages.id, { onDelete: 'cascade' }),
    broadcastId: uuid('broadcast_id').references(() => broadcasts.id, {
      onDelete: 'cascade',
    }),
    originalUrl: text('original_url').notNull(),
    linkIndex: integer('link_index').notNull(),
    linkText: text('link_text'),
    tokenHash: text('token_hash').notNull(),
    metadata: jsonb('metadata').$type<Record<string, unknown>>().notNull().default({}),
    ...timestamps,
  },
  (table) => [
    uniqueIndex('links_token_hash_unique').on(table.tokenHash),
    index('links_message_idx').on(table.messageId),
    index('links_broadcast_idx').on(table.broadcastId),
  ],
)

export const linkRollups = pgTable(
  'link_rollups',
  {
    linkId: uuid('link_id')
      .primaryKey()
      .references(() => links.id, { onDelete: 'cascade' }),
    broadcastId: uuid('broadcast_id').references(() => broadcasts.id, {
      onDelete: 'cascade',
    }),
    messageId: uuid('message_id').references(() => messages.id, { onDelete: 'cascade' }),
    originalUrl: text('original_url').notNull(),
    linkIndex: integer('link_index').notNull().default(0),
    urlHost: text('url_host'),
    tags: jsonb('tags').$type<string[]>().notNull().default([]),
    topics: jsonb('topics').$type<string[]>().notNull().default([]),
    sponsor: text('sponsor'),
    humanClicks: integer('human_clicks').notNull().default(0),
    botClicks: integer('bot_clicks').notNull().default(0),
    uniqueHumanContacts: integer('unique_human_contacts').notNull().default(0),
    uniqueBotContacts: integer('unique_bot_contacts').notNull().default(0),
    firstClickedAt: timestamp('first_clicked_at', { withTimezone: true }),
    lastClickedAt: timestamp('last_clicked_at', { withTimezone: true }),
    ...timestamps,
  },
  (table) => [
    index('link_rollups_broadcast_idx').on(table.broadcastId),
    index('link_rollups_url_host_idx').on(table.urlHost),
    index('link_rollups_human_clicks_idx').on(table.humanClicks),
    index('link_rollups_tags_gin_idx').using('gin', table.tags),
    index('link_rollups_topics_gin_idx').using('gin', table.topics),
  ],
)

export const contactLinkRollups = pgTable(
  'contact_link_rollups',
  {
    contactId: uuid('contact_id')
      .notNull()
      .references(() => contacts.id, { onDelete: 'cascade' }),
    linkId: uuid('link_id')
      .notNull()
      .references(() => links.id, { onDelete: 'cascade' }),
    broadcastId: uuid('broadcast_id').references(() => broadcasts.id, {
      onDelete: 'cascade',
    }),
    messageId: uuid('message_id').references(() => messages.id, { onDelete: 'cascade' }),
    originalUrl: text('original_url').notNull(),
    linkIndex: integer('link_index').notNull().default(0),
    urlHost: text('url_host'),
    tags: jsonb('tags').$type<string[]>().notNull().default([]),
    topics: jsonb('topics').$type<string[]>().notNull().default([]),
    sponsor: text('sponsor'),
    humanClicks: integer('human_clicks').notNull().default(0),
    botClicks: integer('bot_clicks').notNull().default(0),
    firstClickedAt: timestamp('first_clicked_at', { withTimezone: true }),
    lastClickedAt: timestamp('last_clicked_at', { withTimezone: true }),
    ...timestamps,
  },
  (table) => [
    primaryKey({ columns: [table.contactId, table.linkId] }),
    index('contact_link_rollups_contact_idx').on(table.contactId),
    index('contact_link_rollups_link_idx').on(table.linkId),
    index('contact_link_rollups_broadcast_idx').on(table.broadcastId),
    index('contact_link_rollups_url_host_idx').on(table.urlHost),
    index('contact_link_rollups_tags_gin_idx').using('gin', table.tags),
    index('contact_link_rollups_topics_gin_idx').using('gin', table.topics),
  ],
)

export const events = pgTable(
  'events',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    type: eventTypeEnum('type').notNull(),
    contactId: uuid('contact_id').references(() => contacts.id, { onDelete: 'set null' }),
    broadcastId: uuid('broadcast_id').references(() => broadcasts.id, {
      onDelete: 'set null',
    }),
    messageId: uuid('message_id').references(() => messages.id, { onDelete: 'set null' }),
    linkId: uuid('link_id').references(() => links.id, { onDelete: 'set null' }),
    occurredAt: timestamp('occurred_at', { withTimezone: true }).notNull().defaultNow(),
    source: text('source').notNull().default('system'),
    idempotencyKey: text('idempotency_key'),
    userAgent: text('user_agent'),
    ipHash: text('ip_hash'),
    metadata: jsonb('metadata').$type<Record<string, unknown>>().notNull().default({}),
    ...timestamps,
  },
  (table) => [
    uniqueIndex('events_idempotency_key_unique').on(table.idempotencyKey),
    index('events_type_idx').on(table.type),
    index('events_contact_idx').on(table.contactId),
    index('events_broadcast_idx').on(table.broadcastId),
    index('events_message_idx').on(table.messageId),
    index('events_occurred_at_idx').on(table.occurredAt),
    index('events_contact_type_occurred_idx').on(
      table.contactId,
      table.type,
      table.occurredAt,
    ),
    index('events_broadcast_type_idx').on(table.broadcastId, table.type),
    index('events_link_type_idx').on(table.linkId, table.type),
  ],
)

export const webhookEvents = pgTable(
  'webhook_events',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    provider: text('provider').notNull(),
    providerEventId: text('provider_event_id').notNull(),
    eventType: text('event_type').notNull(),
    rawPayload: jsonb('raw_payload').notNull(),
    processed: boolean('processed').notNull().default(false),
    processedAt: timestamp('processed_at', { withTimezone: true }),
    ...timestamps,
  },
  (table) => [
    uniqueIndex('webhook_events_provider_event_unique').on(
      table.provider,
      table.providerEventId,
    ),
    index('webhook_events_processed_idx').on(table.processed),
  ],
)

export const sequences = pgTable('sequences', {
  id: uuid('id').primaryKey().defaultRandom(),
  key: text('key').notNull(),
  name: text('name').notNull(),
  active: boolean('active').notNull().default(false),
  metadata: jsonb('metadata').$type<Record<string, unknown>>().notNull().default({}),
  ...timestamps,
})

export const sequenceSteps = pgTable(
  'sequence_steps',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    sequenceId: uuid('sequence_id')
      .notNull()
      .references(() => sequences.id, { onDelete: 'cascade' }),
    draftId: uuid('draft_id').references(() => drafts.id, { onDelete: 'set null' }),
    position: integer('position').notNull(),
    delayMinutes: integer('delay_minutes').notNull(),
    active: boolean('active').notNull().default(true),
    metadata: jsonb('metadata').$type<Record<string, unknown>>().notNull().default({}),
    ...timestamps,
  },
  (table) => [
    uniqueIndex('sequence_steps_position_unique').on(table.sequenceId, table.position),
  ],
)
