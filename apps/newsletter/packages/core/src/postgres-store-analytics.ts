import { and, desc, eq, inArray, sql } from 'drizzle-orm'
import type { Database } from './db/index.js'
import {
  broadcasts,
  contactLinkRollups,
  contacts,
  events,
  linkRollups,
} from './db/schema.js'
import {
  dateValue,
  mapContactLinkInsight,
  mapLinkInsight,
  mapLinkSummaryInsight,
} from './postgres-store-mappers.js'
import type {
  BroadcastStats,
  ContactLinkInsight,
  ContactTopicInsight,
  LinkInsight,
  LinkStats,
  LinkSummaryInsight,
} from './store.js'
import type { EngagementSummary } from './types.js'

export { rebuildPostgresAnalyticsRollups } from './postgres-store-rollup-rebuild.js'

export async function getPostgresBroadcastStats(
  db: Database,
  id: string,
): Promise<BroadcastStats | undefined> {
  const [broadcast] = await db
    .select({ id: broadcasts.id })
    .from(broadcasts)
    .where(eq(broadcasts.id, id))
    .limit(1)
  if (!broadcast) return undefined

  const [row] = await db.execute(sql`
    select
      count(*) filter (where status = 'planned')::int as planned,
      count(*) filter (where status = 'sending')::int as sending,
      count(*) filter (where status = 'sent')::int as sent,
      count(*) filter (where status = 'failed')::int as failed,
      count(*) filter (where status = 'bounced')::int as bounced,
      count(*) filter (where status = 'complained')::int as complained,
      count(*) filter (where status = 'skipped')::int as skipped
    from messages
    where broadcast_id = ${id}
  `)
  const [eventRow] = await db.execute(sql`
    select
      count(*) filter (where type = 'engagement.opened')::int as opened,
      count(*) filter (where type = 'engagement.clicked')::int as clicked,
      count(*) filter (where type = 'engagement.opened_by_bot')::int as "openedByBot",
      count(*) filter (where type = 'engagement.clicked_by_bot')::int as "clickedByBot",
      count(distinct events.contact_id) filter (
        where type = 'contact.unsubscribed'
      )::int as unsubscribed
    from events
    left join messages on messages.id = events.message_id
    where events.broadcast_id = ${id} or messages.broadcast_id = ${id}
  `)
  const counts = row as Record<string, number>
  const eventCounts = eventRow as Record<string, number>
  return {
    broadcastId: id,
    planned: counts.planned ?? 0,
    sending: counts.sending ?? 0,
    sent: counts.sent ?? 0,
    failed: counts.failed ?? 0,
    bounced: counts.bounced ?? 0,
    complained: counts.complained ?? 0,
    unsubscribed: eventCounts.unsubscribed ?? 0,
    skipped: counts.skipped ?? 0,
    opened: eventCounts.opened ?? 0,
    clicked: eventCounts.clicked ?? 0,
    openedByBot: eventCounts.openedByBot ?? 0,
    clickedByBot: eventCounts.clickedByBot ?? 0,
  }
}

export async function getPostgresBroadcastLinkStats(
  db: Database,
  id: string,
): Promise<LinkStats[]> {
  const rows = await db.execute(sql`
    select
      links.id as "linkId",
      links.broadcast_id as "broadcastId",
      links.message_id as "messageId",
      links.original_url as "originalUrl",
      links.link_index as "linkIndex",
      count(events.id) filter (where events.type = 'engagement.clicked')::int as "humanClicks",
      count(events.id) filter (where events.type = 'engagement.clicked_by_bot')::int as "botClicks",
      count(distinct events.contact_id) filter (where events.type = 'engagement.clicked')::int as "uniqueHumanContacts",
      count(distinct events.contact_id) filter (where events.type = 'engagement.clicked_by_bot')::int as "uniqueBotContacts",
      max(events.occurred_at) filter (
        where events.type in ('engagement.clicked', 'engagement.clicked_by_bot')
      ) as "lastClickedAt"
    from links
    left join events on events.link_id = links.id
    where links.broadcast_id = ${id}
    group by links.id, links.broadcast_id, links.message_id, links.original_url, links.link_index
    order by links.link_index asc
  `)
  return rows.map((row) => {
    const stats = row as Record<string, unknown>
    return {
      linkId: stats.linkId as string,
      ...(stats.broadcastId ? { broadcastId: stats.broadcastId as string } : {}),
      ...(stats.messageId ? { messageId: stats.messageId as string } : {}),
      originalUrl: stats.originalUrl as string,
      linkIndex: stats.linkIndex as number,
      humanClicks: stats.humanClicks as number,
      botClicks: stats.botClicks as number,
      uniqueHumanContacts: stats.uniqueHumanContacts as number,
      uniqueBotContacts: stats.uniqueBotContacts as number,
      ...(stats.lastClickedAt ? { lastClickedAt: stats.lastClickedAt as Date } : {}),
    }
  })
}

export async function getPostgresLinkInsights(
  db: Database,
  input: LinkInsightInput = {},
): Promise<LinkInsight[]> {
  const filters = [
    ...(input.broadcastId ? [eq(linkRollups.broadcastId, input.broadcastId)] : []),
    ...(input.sponsor ? [eq(linkRollups.sponsor, input.sponsor)] : []),
    ...(input.topic
      ? [sql`${linkRollups.topics} @> ${JSON.stringify([input.topic])}::jsonb`]
      : []),
    ...(input.tag
      ? [sql`${linkRollups.tags} @> ${JSON.stringify([input.tag])}::jsonb`]
      : []),
  ]
  const query = db.select().from(linkRollups)
  const rows = filters.length
    ? await query
        .where(and(...filters))
        .orderBy(desc(linkRollups.humanClicks))
        .limit(input.limit ?? 100)
    : await query.orderBy(desc(linkRollups.humanClicks)).limit(input.limit ?? 100)
  return rows.map(mapLinkInsight)
}

export async function getPostgresLinkSummaryInsights(
  db: Database,
  input: LinkInsightInput = {},
): Promise<LinkSummaryInsight[]> {
  const filters = [
    ...(input.broadcastId
      ? [sql`contact_link_rollups.broadcast_id = ${input.broadcastId}`]
      : []),
    ...(input.sponsor ? [sql`contact_link_rollups.sponsor = ${input.sponsor}`] : []),
    ...(input.topic
      ? [sql`contact_link_rollups.topics @> ${JSON.stringify([input.topic])}::jsonb`]
      : []),
    ...(input.tag
      ? [sql`contact_link_rollups.tags @> ${JSON.stringify([input.tag])}::jsonb`]
      : []),
  ]
  const where = filters.length ? sql`where ${sql.join(filters, sql` and `)}` : sql``
  const rows = await db.execute(sql`
    select
      original_url as "originalUrl",
      url_host as "urlHost",
      tags,
      topics,
      sponsor,
      sum(human_clicks)::int as "humanClicks",
      sum(bot_clicks)::int as "botClicks",
      count(distinct contact_id) filter (where human_clicks > 0)::int as "uniqueHumanContacts",
      count(distinct contact_id) filter (where bot_clicks > 0)::int as "uniqueBotContacts",
      count(distinct link_id)::int as "linkCount",
      count(distinct broadcast_id)::int as "broadcastCount",
      min(first_clicked_at) as "firstClickedAt",
      max(last_clicked_at) as "lastClickedAt"
    from contact_link_rollups
    ${where}
    group by original_url, url_host, tags, topics, sponsor
    order by "humanClicks" desc, "uniqueHumanContacts" desc, "originalUrl" asc
    limit ${input.limit ?? 100}
  `)
  return rows.map(mapLinkSummaryInsight)
}

export async function getPostgresContactLinkInsights(
  db: Database,
  contactId: string,
  limit = 100,
): Promise<ContactLinkInsight[]> {
  const rows = await db
    .select()
    .from(contactLinkRollups)
    .where(eq(contactLinkRollups.contactId, contactId))
    .orderBy(desc(contactLinkRollups.humanClicks))
    .limit(limit)
  return rows.map(mapContactLinkInsight)
}

export async function getPostgresContactTopicInsights(
  db: Database,
  contactId: string,
  limit = 100,
): Promise<ContactTopicInsight[]> {
  const rows = await db.execute(sql`
    select
      topic.value::text as topic,
      sum(contact_link_rollups.human_clicks)::int as "humanClicks",
      count(distinct contact_link_rollups.link_id)::int as "linkCount",
      max(contact_link_rollups.last_clicked_at) as "lastClickedAt"
    from contact_link_rollups,
    jsonb_array_elements_text(contact_link_rollups.topics) as topic(value)
    where contact_link_rollups.contact_id = ${contactId}
    group by topic.value
    order by "humanClicks" desc
    limit ${limit}
  `)
  return rows.map((row) => {
    const value = row as Record<string, unknown>
    return {
      contactId,
      topic: value.topic as string,
      humanClicks: value.humanClicks as number,
      linkCount: value.linkCount as number,
      ...(value.lastClickedAt ? { lastClickedAt: value.lastClickedAt as Date } : {}),
    }
  })
}

export async function getPostgresEngagement(
  db: Database,
  contactIds: string[],
): Promise<Map<string, EngagementSummary>> {
  const engagement = new Map<string, EngagementSummary>()
  if (contactIds.length === 0) return engagement

  const contactRows = await db
    .select({
      id: contacts.id,
      subscribedAt: contacts.subscribedAt,
    })
    .from(contacts)
    .where(inArray(contacts.id, contactIds))
  for (const contact of contactRows) {
    engagement.set(contact.id, {
      contactId: contact.id,
      totalSends: 0,
      totalOpens: 0,
      totalClicks: 0,
      ...(contact.subscribedAt ? { lastSubscribedAt: contact.subscribedAt } : {}),
    })
  }

  const rows = await db
    .select({
      contactId: events.contactId,
      totalSends: sql<number>`count(distinct ${events.messageId}) filter (where ${events.type} = 'message.sent')::int`,
      totalOpens: sql<number>`count(*) filter (where ${events.type} = 'engagement.opened')::int`,
      totalClicks: sql<number>`count(*) filter (where ${events.type} = 'engagement.clicked')::int`,
      lastOpenedAt: sql<Date | null>`max(${events.occurredAt}) filter (where ${events.type} = 'engagement.opened')`,
      lastClickedAt: sql<Date | null>`max(${events.occurredAt}) filter (where ${events.type} = 'engagement.clicked')`,
    })
    .from(events)
    .where(
      and(
        inArray(events.contactId, contactIds),
        inArray(events.type, ['message.sent', 'engagement.opened', 'engagement.clicked']),
      ),
    )
    .groupBy(events.contactId)

  for (const row of rows) {
    if (!row.contactId) continue
    const current = engagement.get(row.contactId)
    if (!current) continue
    current.totalSends = row.totalSends
    current.totalOpens = row.totalOpens
    current.totalClicks = row.totalClicks
    const lastOpenedAt = dateValue(row.lastOpenedAt)
    const lastClickedAt = dateValue(row.lastClickedAt)
    if (lastOpenedAt) current.lastOpenedAt = lastOpenedAt
    if (lastClickedAt) current.lastClickedAt = lastClickedAt
  }
  return engagement
}

interface LinkInsightInput {
  broadcastId?: string
  topic?: string
  tag?: string
  sponsor?: string
  limit?: number
}
