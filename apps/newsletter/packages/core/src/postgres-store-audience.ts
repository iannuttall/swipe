import { and, asc, eq, type SQL, sql } from 'drizzle-orm'
import type { Database } from './db/index.js'
import { contacts } from './db/schema.js'
import { mapContact } from './postgres-store-mappers.js'
import {
  type AudienceFilter,
  type AudienceResolution,
  normalizeAudience,
} from './subscriber-intelligence.js'

export async function resolvePostgresAudience(
  db: Database,
  input: AudienceFilter = {},
): Promise<AudienceResolution> {
  const audience = normalizeAudience(input)
  const filters = audienceFilters(audience)
  const query = db
    .select()
    .from(contacts)
    .where(and(eq(contacts.status, 'active'), notSuppressed(), ...filters))
    .orderBy(asc(contacts.email))
  const [contactRows, total, suppressed] = await Promise.all([
    audience.limit ? query.limit(audience.limit) : query,
    countMatched(db, filters),
    countSuppressed(db),
  ])

  return {
    audience,
    contacts: contactRows.map(mapContact),
    total,
    suppressed,
  }
}

async function countMatched(db: Database, filters: SQL[]): Promise<number> {
  const [row] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(contacts)
    .where(and(eq(contacts.status, 'active'), notSuppressed(), ...filters))
  return Number(row?.count ?? 0)
}

async function countSuppressed(db: Database): Promise<number> {
  const [row] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(contacts)
    .where(and(eq(contacts.status, 'active'), suppressed()))
  return Number(row?.count ?? 0)
}

function audienceFilters(audience: AudienceFilter): SQL[] {
  return [
    ...maybeIn('contacts.id', audience.contactIds),
    ...maybeNotIn('contacts.id', audience.excludeContactIds),
    ...all(audience.contactTags, tagExists),
    ...all(audience.excludeContactTags, (tag) => sql`not ${tagExists(tag)}`),
    ...maybeLinkRollup('topics', audience.linkTopics),
    ...maybeNoLinkRollup('topics', audience.excludeLinkTopics),
    ...maybeLinkRollup('tags', audience.linkTags),
    ...maybeNoLinkRollup('tags', audience.excludeLinkTags),
    ...(audience.sponsor ? [linkRollupExists(sql`sponsor = ${audience.sponsor}`)] : []),
    ...maybePurchase(audience.purchasedProductKeys),
    ...maybeNoPurchase(audience.excludePurchasedProductKeys),
    ...maybeMinValue(audience),
    ...maybeMaxValue(audience),
  ]
}

function suppressed(): SQL {
  return sql`exists (
    select 1 from suppressions
    where suppressions.active = true
      and (
        suppressions.email = ${contacts.email}
        or suppressions.domain = ${contacts.emailDomain}
        or suppressions.contact_id = ${contacts.id}
      )
  )
`
}

function notSuppressed(): SQL {
  return sql`not ${suppressed()}`
}

function tagExists(tag: string): SQL {
  return sql`exists (
    select 1
    from contact_tags
    inner join tags on tags.id = contact_tags.tag_id
    where contact_tags.contact_id = ${contacts.id}
      and tags.key = ${tag}
  )`
}

function maybeLinkRollup(column: 'tags' | 'topics', values?: string[]): SQL[] {
  return values?.length ? [linkRollupExists(jsonAny(column, values))] : []
}

function maybeNoLinkRollup(column: 'tags' | 'topics', values?: string[]): SQL[] {
  return values?.length ? [sql`not ${linkRollupExists(jsonAny(column, values))}`] : []
}

function linkRollupExists(condition: SQL): SQL {
  return sql`exists (
    select 1
    from contact_link_rollups
    where contact_link_rollups.contact_id = ${contacts.id}
      and contact_link_rollups.human_clicks > 0
      and ${condition}
  )`
}

function jsonAny(column: 'tags' | 'topics', values: string[]): SQL {
  return sql`(${sql.join(
    values.map(
      (value) =>
        sql`contact_link_rollups.${sql.raw(column)} @> ${JSON.stringify([value])}::jsonb`,
    ),
    sql` or `,
  )})`
}

function maybePurchase(values?: string[]): SQL[] {
  return values?.length ? [purchaseExists(sql`product_key`, values)] : []
}

function maybeNoPurchase(values?: string[]): SQL[] {
  return values?.length ? [sql`not ${purchaseExists(sql`product_key`, values)}`] : []
}

function purchaseExists(column: SQL, values: string[]): SQL {
  return sql`exists (
    select 1
    from purchases
    where purchases.contact_id = ${contacts.id}
      and ${inValues(column, values)}
  )`
}

function maybeMinValue(audience: AudienceFilter): SQL[] {
  return audience.minLifetimeValueCents === undefined
    ? []
    : [sql`${lifetimeValue(audience.currency)} >= ${audience.minLifetimeValueCents}`]
}

function maybeMaxValue(audience: AudienceFilter): SQL[] {
  return audience.maxLifetimeValueCents === undefined
    ? []
    : [sql`${lifetimeValue(audience.currency)} <= ${audience.maxLifetimeValueCents}`]
}

function lifetimeValue(currency = 'USD'): SQL {
  return sql`coalesce((
    select contact_value_rollups.total_amount_cents
    from contact_value_rollups
    where contact_value_rollups.contact_id = ${contacts.id}
      and contact_value_rollups.currency = ${currency}
  ), 0)`
}

function maybeIn(column: string, values?: string[]): SQL[] {
  return values?.length ? [inValues(sql.raw(column), values)] : []
}

function maybeNotIn(column: string, values?: string[]): SQL[] {
  return values?.length ? [sql`not ${inValues(sql.raw(column), values)}`] : []
}

function inValues(column: SQL, values: string[]): SQL {
  return sql`(${sql.join(
    values.map((value) => sql`${column} = ${value}`),
    sql` or `,
  )})`
}

function all<T>(values: T[] | undefined, build: (value: T) => SQL): SQL[] {
  return values?.map(build) ?? []
}
