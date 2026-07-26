import type { ContactRecord } from './store.js'

export interface ContactTagRecord {
  contactId: string
  tagKey: string
  tagName: string
  source: string
  metadata: Record<string, unknown>
  taggedAt: Date
}

export interface ContactExternalIdRecord {
  id: string
  contactId: string
  provider: string
  externalId: string
  label?: string
  metadata: Record<string, unknown>
  createdAt: Date
}

export interface PurchaseRecord {
  id: string
  contactId: string
  provider: string
  externalId?: string
  idempotencyKey?: string
  productKey: string
  productName?: string
  amountCents: number
  currency: string
  purchasedAt: Date
  metadata: Record<string, unknown>
}

export interface ContactValueRecord {
  contactId: string
  currency: string
  purchaseCount: number
  totalAmountCents: number
  firstPurchasedAt?: Date
  lastPurchasedAt?: Date
}

export interface AudienceFilter {
  contactIds?: string[]
  excludeContactIds?: string[]
  contactTags?: string[]
  excludeContactTags?: string[]
  linkTopics?: string[]
  excludeLinkTopics?: string[]
  linkTags?: string[]
  excludeLinkTags?: string[]
  sponsor?: string
  purchasedProductKeys?: string[]
  excludePurchasedProductKeys?: string[]
  minLifetimeValueCents?: number
  maxLifetimeValueCents?: number
  currency?: string
  limit?: number
}

export interface AudienceResolution {
  audience: AudienceFilter
  contacts: ContactRecord[]
  total: number
  suppressed: number
}

export interface AudiencePreview {
  audience: AudienceFilter
  total: number
  suppressed: number
  sample: ContactRecord[]
}

export interface RollupRebuildResult {
  linkRollups: number
  contactLinkRollups: number
  valueRollups: number
}

export function normalizeKey(value: string, name = 'key'): string {
  const normalized = value.trim().toLowerCase()
  if (!/^[a-z0-9][a-z0-9._:-]{0,127}$/.test(normalized)) {
    throw new Error(
      `${name} must use lowercase letters, numbers, dots, colons, dashes, or underscores`,
    )
  }
  return normalized
}

export function normalizeCurrency(value: string): string {
  const normalized = value.trim().toUpperCase()
  if (!/^[A-Z]{3}$/.test(normalized)) {
    throw new Error('currency must be a 3-letter ISO code')
  }
  return normalized
}

export function normalizeAudience(input: AudienceFilter = {}): AudienceFilter {
  return {
    ...normalizedStringField(input.contactIds, 'contactIds'),
    ...normalizedStringField(input.excludeContactIds, 'excludeContactIds'),
    ...normalizedArrayField(input.contactTags, 'contact tag', 'contactTags'),
    ...normalizedArrayField(
      input.excludeContactTags,
      'excluded contact tag',
      'excludeContactTags',
    ),
    ...normalizedArrayField(input.linkTopics, 'link topic', 'linkTopics'),
    ...normalizedArrayField(
      input.excludeLinkTopics,
      'excluded link topic',
      'excludeLinkTopics',
    ),
    ...normalizedArrayField(input.linkTags, 'link tag', 'linkTags'),
    ...normalizedArrayField(
      input.excludeLinkTags,
      'excluded link tag',
      'excludeLinkTags',
    ),
    ...(input.sponsor ? { sponsor: normalizeKey(input.sponsor, 'sponsor') } : {}),
    ...normalizedArrayField(
      input.purchasedProductKeys,
      'purchased product key',
      'purchasedProductKeys',
    ),
    ...normalizedArrayField(
      input.excludePurchasedProductKeys,
      'excluded product key',
      'excludePurchasedProductKeys',
    ),
    ...(input.minLifetimeValueCents !== undefined
      ? { minLifetimeValueCents: assertNonNegative(input.minLifetimeValueCents) }
      : {}),
    ...(input.maxLifetimeValueCents !== undefined
      ? { maxLifetimeValueCents: assertNonNegative(input.maxLifetimeValueCents) }
      : {}),
    ...(input.currency ? { currency: normalizeCurrency(input.currency) } : {}),
    ...(input.limit !== undefined
      ? { limit: positiveInteger(input.limit, 'limit') }
      : {}),
  }
}

function normalizedStringField<K extends keyof AudienceFilter>(
  value: string[] | undefined,
  key: K,
): Pick<AudienceFilter, K> {
  if (!value?.length) return {} as Pick<AudienceFilter, K>
  const normalized = [...new Set(value.map((item) => item.trim()).filter(Boolean))]
  return normalized.length
    ? ({ [key]: normalized } as Pick<AudienceFilter, K>)
    : ({} as Pick<AudienceFilter, K>)
}

function normalizedArrayField<K extends keyof AudienceFilter>(
  value: string[] | undefined,
  itemName: string,
  key: K,
): Pick<AudienceFilter, K> {
  if (!value?.length) return {} as Pick<AudienceFilter, K>
  return {
    [key]: [...new Set(value.map((item) => normalizeKey(item, itemName)))],
  } as Pick<AudienceFilter, K>
}

function assertNonNegative(value: number): number {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new Error('money amounts must be safe non-negative integer cents')
  }
  return value
}

function positiveInteger(value: number, name: string): number {
  if (!Number.isSafeInteger(value) || value < 1) {
    throw new Error(`${name} must be a positive integer`)
  }
  return value
}
