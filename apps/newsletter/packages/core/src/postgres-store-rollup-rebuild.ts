import { sql } from 'drizzle-orm'
import type { Database } from './db/index.js'
import { contactLinkRollups, contactValueRollups, linkRollups } from './db/schema.js'
import type { RollupRebuildResult } from './subscriber-intelligence.js'

type RollupExecutor = Pick<Database, 'execute'>

export async function rebuildPostgresAnalyticsRollups(
  db: Database,
): Promise<RollupRebuildResult> {
  return db.transaction(async (transaction) => {
    await transaction.delete(contactLinkRollups)
    await transaction.delete(linkRollups)
    await transaction.delete(contactValueRollups)

    const contactRows = await rebuildContactLinkRollups(transaction)
    const linkRows = await rebuildLinkRollups(transaction)
    const valueRows = await rebuildValueRollups(transaction)

    return {
      linkRollups: linkRows.length,
      contactLinkRollups: contactRows.length,
      valueRollups: valueRows.length,
    }
  })
}

function rebuildContactLinkRollups(db: RollupExecutor) {
  return db.execute(sql`
    insert into contact_link_rollups (
      contact_id,
      link_id,
      broadcast_id,
      message_id,
      original_url,
      link_index,
      url_host,
      tags,
      topics,
      sponsor,
      human_clicks,
      bot_clicks,
      first_clicked_at,
      last_clicked_at
    )
    select
      events.contact_id,
      links.id,
      links.broadcast_id,
      links.message_id,
      links.original_url,
      links.link_index,
      links.metadata->>'urlHost',
      coalesce(links.metadata->'tags', '[]'::jsonb),
      coalesce(links.metadata->'topics', '[]'::jsonb),
      links.metadata->>'sponsor',
      count(*) filter (where events.type = 'engagement.clicked')::int,
      count(*) filter (where events.type = 'engagement.clicked_by_bot')::int,
      min(events.occurred_at),
      max(events.occurred_at)
    from events
    inner join links on links.id = events.link_id
    where events.contact_id is not null
      and events.type in ('engagement.clicked', 'engagement.clicked_by_bot')
    group by
      events.contact_id,
      links.id,
      links.broadcast_id,
      links.message_id,
      links.original_url,
      links.link_index,
      links.metadata
    returning contact_id
  `)
}

function rebuildLinkRollups(db: RollupExecutor) {
  return db.execute(sql`
    insert into link_rollups (
      link_id,
      broadcast_id,
      message_id,
      original_url,
      link_index,
      url_host,
      tags,
      topics,
      sponsor,
      human_clicks,
      bot_clicks,
      unique_human_contacts,
      unique_bot_contacts,
      first_clicked_at,
      last_clicked_at
    )
    select
      links.id,
      links.broadcast_id,
      links.message_id,
      links.original_url,
      links.link_index,
      links.metadata->>'urlHost',
      coalesce(links.metadata->'tags', '[]'::jsonb),
      coalesce(links.metadata->'topics', '[]'::jsonb),
      links.metadata->>'sponsor',
      count(*) filter (where events.type = 'engagement.clicked')::int,
      count(*) filter (where events.type = 'engagement.clicked_by_bot')::int,
      count(distinct events.contact_id) filter (
        where events.type = 'engagement.clicked'
      )::int,
      count(distinct events.contact_id) filter (
        where events.type = 'engagement.clicked_by_bot'
      )::int,
      min(events.occurred_at),
      max(events.occurred_at)
    from events
    inner join links on links.id = events.link_id
    where events.contact_id is not null
      and events.type in ('engagement.clicked', 'engagement.clicked_by_bot')
    group by
      links.id,
      links.broadcast_id,
      links.message_id,
      links.original_url,
      links.link_index,
      links.metadata
    returning link_id
  `)
}

function rebuildValueRollups(db: RollupExecutor) {
  return db.execute(sql`
    insert into contact_value_rollups (
      contact_id,
      currency,
      purchase_count,
      total_amount_cents,
      first_purchased_at,
      last_purchased_at
    )
    select
      contact_id,
      currency,
      count(*)::int,
      sum(amount_cents)::bigint,
      min(purchased_at),
      max(purchased_at)
    from purchases
    group by contact_id, currency
    returning contact_id
  `)
}
