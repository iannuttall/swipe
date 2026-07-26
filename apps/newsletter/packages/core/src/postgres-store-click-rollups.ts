import { and, eq, sql } from 'drizzle-orm'
import type { Database } from './db/index.js'
import { contactLinkRollups, linkRollups } from './db/schema.js'
import { linkAnalyticsMetadata } from './postgres-store-mappers.js'
import type { ClickRollupInput } from './store.js'

export async function recordPostgresClickRollup(
  db: Database,
  input: ClickRollupInput,
): Promise<void> {
  const metadata = linkAnalyticsMetadata(input.link)
  await db.transaction(async (transaction) => {
    const [existing] = await transaction
      .select()
      .from(contactLinkRollups)
      .where(
        and(
          eq(contactLinkRollups.contactId, input.contactId),
          eq(contactLinkRollups.linkId, input.link.id),
        ),
      )
      .limit(1)
      .for('update')

    const firstHuman = !input.isBot && !existing?.humanClicks
    const firstBot = input.isBot && !existing?.botClicks

    await transaction
      .insert(contactLinkRollups)
      .values({
        contactId: input.contactId,
        linkId: input.link.id,
        originalUrl: input.link.originalUrl,
        linkIndex: input.link.linkIndex,
        humanClicks: input.isBot ? 0 : 1,
        botClicks: input.isBot ? 1 : 0,
        firstClickedAt: input.occurredAt,
        lastClickedAt: input.occurredAt,
        tags: metadata.tags,
        topics: metadata.topics,
        ...(input.link.broadcastId ? { broadcastId: input.link.broadcastId } : {}),
        ...(input.link.messageId ? { messageId: input.link.messageId } : {}),
        ...(metadata.urlHost ? { urlHost: metadata.urlHost } : {}),
        ...(metadata.sponsor ? { sponsor: metadata.sponsor } : {}),
      })
      .onConflictDoUpdate({
        target: [contactLinkRollups.contactId, contactLinkRollups.linkId],
        set: {
          humanClicks: sql`${contactLinkRollups.humanClicks} + ${input.isBot ? 0 : 1}`,
          botClicks: sql`${contactLinkRollups.botClicks} + ${input.isBot ? 1 : 0}`,
          lastClickedAt: input.occurredAt,
          updatedAt: sql`now()`,
          tags: metadata.tags,
          topics: metadata.topics,
          ...(metadata.urlHost ? { urlHost: metadata.urlHost } : {}),
          ...(metadata.sponsor ? { sponsor: metadata.sponsor } : {}),
        },
      })

    await transaction
      .insert(linkRollups)
      .values({
        linkId: input.link.id,
        originalUrl: input.link.originalUrl,
        linkIndex: input.link.linkIndex,
        humanClicks: input.isBot ? 0 : 1,
        botClicks: input.isBot ? 1 : 0,
        uniqueHumanContacts: firstHuman ? 1 : 0,
        uniqueBotContacts: firstBot ? 1 : 0,
        firstClickedAt: input.occurredAt,
        lastClickedAt: input.occurredAt,
        tags: metadata.tags,
        topics: metadata.topics,
        ...(input.link.broadcastId ? { broadcastId: input.link.broadcastId } : {}),
        ...(input.link.messageId ? { messageId: input.link.messageId } : {}),
        ...(metadata.urlHost ? { urlHost: metadata.urlHost } : {}),
        ...(metadata.sponsor ? { sponsor: metadata.sponsor } : {}),
      })
      .onConflictDoUpdate({
        target: linkRollups.linkId,
        set: {
          humanClicks: sql`${linkRollups.humanClicks} + ${input.isBot ? 0 : 1}`,
          botClicks: sql`${linkRollups.botClicks} + ${input.isBot ? 1 : 0}`,
          uniqueHumanContacts: sql`${linkRollups.uniqueHumanContacts} + ${firstHuman ? 1 : 0}`,
          uniqueBotContacts: sql`${linkRollups.uniqueBotContacts} + ${firstBot ? 1 : 0}`,
          lastClickedAt: input.occurredAt,
          updatedAt: sql`now()`,
          tags: metadata.tags,
          topics: metadata.topics,
          ...(metadata.urlHost ? { urlHost: metadata.urlHost } : {}),
          ...(metadata.sponsor ? { sponsor: metadata.sponsor } : {}),
        },
      })
  })
}
