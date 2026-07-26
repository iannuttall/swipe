import type { ContactLinkInsight, LinkSummaryInsight } from './store.js'

export interface LinkInsightFilter {
  broadcastId?: string
  topic?: string
  tag?: string
  sponsor?: string
  limit?: number
}

export function getMemoryLinkSummaryInsights(
  rollups: Iterable<ContactLinkInsight>,
  input: LinkInsightFilter = {},
): LinkSummaryInsight[] {
  const summaries = new Map<
    string,
    LinkSummaryInsight & {
      broadcastIds: Set<string>
      botContactIds: Set<string>
      humanContactIds: Set<string>
      linkIds: Set<string>
    }
  >()

  for (const rollup of rollups) {
    if (input.broadcastId && rollup.broadcastId !== input.broadcastId) continue
    if (input.topic && !rollup.topics.includes(input.topic)) continue
    if (input.tag && !rollup.tags.includes(input.tag)) continue
    if (input.sponsor && rollup.sponsor !== input.sponsor) continue

    const key = JSON.stringify({
      originalUrl: rollup.originalUrl,
      sponsor: rollup.sponsor ?? null,
      tags: rollup.tags,
      topics: rollup.topics,
    })
    const current =
      summaries.get(key) ??
      ({
        originalUrl: rollup.originalUrl,
        ...(rollup.urlHost ? { urlHost: rollup.urlHost } : {}),
        tags: rollup.tags,
        topics: rollup.topics,
        ...(rollup.sponsor ? { sponsor: rollup.sponsor } : {}),
        humanClicks: 0,
        botClicks: 0,
        uniqueHumanContacts: 0,
        uniqueBotContacts: 0,
        linkCount: 0,
        broadcastCount: 0,
        broadcastIds: new Set<string>(),
        botContactIds: new Set<string>(),
        humanContactIds: new Set<string>(),
        linkIds: new Set<string>(),
      } satisfies LinkSummaryInsight & {
        broadcastIds: Set<string>
        botContactIds: Set<string>
        humanContactIds: Set<string>
        linkIds: Set<string>
      })

    current.humanClicks += rollup.humanClicks
    current.botClicks += rollup.botClicks
    if (rollup.humanClicks > 0) current.humanContactIds.add(rollup.contactId)
    if (rollup.botClicks > 0) current.botContactIds.add(rollup.contactId)
    current.linkIds.add(rollup.linkId)
    if (rollup.broadcastId) current.broadcastIds.add(rollup.broadcastId)
    if (
      rollup.firstClickedAt &&
      (!current.firstClickedAt ||
        current.firstClickedAt.getTime() > rollup.firstClickedAt.getTime())
    ) {
      current.firstClickedAt = rollup.firstClickedAt
    }
    if (
      rollup.lastClickedAt &&
      (!current.lastClickedAt ||
        current.lastClickedAt.getTime() < rollup.lastClickedAt.getTime())
    ) {
      current.lastClickedAt = rollup.lastClickedAt
    }
    current.uniqueHumanContacts = current.humanContactIds.size
    current.uniqueBotContacts = current.botContactIds.size
    current.linkCount = current.linkIds.size
    current.broadcastCount = current.broadcastIds.size
    summaries.set(key, current)
  }

  return Array.from(summaries.values())
    .map(
      ({ broadcastIds, botContactIds, humanContactIds, linkIds, ...summary }) => summary,
    )
    .toSorted((a, b) => b.humanClicks - a.humanClicks)
    .slice(0, input.limit ?? 100)
}
