import type { ContactLinkInsight, EventRecord, LinkRecord } from './store.js'
import {
  type ContactValueRecord,
  normalizeCurrency,
  normalizeKey,
  type PurchaseRecord,
} from './subscriber-intelligence.js'

export function contactTagKey(contactId: string, tagKey: string): string {
  return `${contactId}:${normalizeKey(tagKey, 'contact tag')}`
}

export function externalIdKey(provider: string, externalId: string): string {
  return `${normalizeKey(provider, 'provider')}:${externalId}`
}

export function valueRollupKey(contactId: string, currency: string): string {
  return `${contactId}:${normalizeCurrency(currency)}`
}

export function assertMoney(amountCents: number): void {
  if (!Number.isSafeInteger(amountCents) || amountCents < 0) {
    throw new Error('amountCents must be safe non-negative integer cents')
  }
}

export function findExistingPurchase(
  purchases: Map<string, PurchaseRecord>,
  input: {
    provider: string
    externalId?: string
    idempotencyKey?: string
  },
): PurchaseRecord | undefined {
  return Array.from(purchases.values()).find(
    (purchase) =>
      (input.idempotencyKey && purchase.idempotencyKey === input.idempotencyKey) ||
      (input.externalId &&
        purchase.provider === input.provider &&
        purchase.externalId === input.externalId),
  )
}

export function rebuildMemoryValueRollup(
  purchases: Map<string, PurchaseRecord>,
  valueRollups: Map<string, ContactValueRecord>,
  contactId: string,
  currency: string,
): void {
  const contactPurchases = Array.from(purchases.values()).filter(
    (purchase) => purchase.contactId === contactId && purchase.currency === currency,
  )
  const key = valueRollupKey(contactId, currency)
  if (contactPurchases.length === 0) {
    valueRollups.delete(key)
    return
  }
  const ordered = contactPurchases.toSorted(
    (a, b) => a.purchasedAt.getTime() - b.purchasedAt.getTime(),
  )
  const first = ordered[0]
  const last = ordered.at(-1)
  if (!first || !last) return
  valueRollups.set(key, {
    contactId,
    currency,
    purchaseCount: contactPurchases.length,
    totalAmountCents: contactPurchases.reduce(
      (total, purchase) => total + purchase.amountCents,
      0,
    ),
    firstPurchasedAt: first.purchasedAt,
    lastPurchasedAt: last.purchasedAt,
  })
}

export function includesEvery(values: string[], required?: string[]): boolean {
  return !required?.length || required.every((value) => values.includes(value))
}

export function includesAny(values: string[], required?: string[]): boolean {
  return !required?.length || required.some((value) => values.includes(value))
}

export function rollupsIncludeAny(
  rollups: ContactLinkInsight[],
  key: 'tags' | 'topics',
  required?: string[],
): boolean {
  return !required?.length || rollups.some((rollup) => includesAny(rollup[key], required))
}

export function uniqueContactCount(events: EventRecord[]): number {
  return new Set(events.flatMap((event) => (event.contactId ? [event.contactId] : [])))
    .size
}

export function linkAnalyticsMetadata(link: LinkRecord): {
  urlHost?: string
  tags: string[]
  topics: string[]
  sponsor?: string
} {
  return {
    ...(typeof link.metadata.urlHost === 'string'
      ? { urlHost: link.metadata.urlHost }
      : {}),
    tags: stringArray(link.metadata.tags),
    topics: stringArray(link.metadata.topics),
    ...(typeof link.metadata.sponsor === 'string'
      ? { sponsor: link.metadata.sponsor }
      : {}),
  }
}

export function stringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === 'string')
    : []
}
