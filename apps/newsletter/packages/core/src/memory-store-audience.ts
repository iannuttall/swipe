import {
  includesAny,
  includesEvery,
  rollupsIncludeAny,
  valueRollupKey,
} from './memory-store-helpers.js'
import type { ContactLinkInsight, ContactRecord } from './store.js'
import type {
  AudienceFilter,
  ContactTagRecord,
  PurchaseRecord,
} from './subscriber-intelligence.js'

export function matchesMemoryAudience(input: {
  contact: ContactRecord
  audience: AudienceFilter
  contactTags: Iterable<ContactTagRecord>
  contactLinkRollups: Iterable<ContactLinkInsight>
  purchases: Iterable<PurchaseRecord>
  valueRollups: Map<string, { totalAmountCents: number }>
}): boolean {
  const { audience, contact } = input
  if (audience.contactIds?.length && !audience.contactIds.includes(contact.id)) {
    return false
  }
  if (audience.excludeContactIds?.includes(contact.id)) return false

  const contactTags = Array.from(input.contactTags)
    .filter((tag) => tag.contactId === contact.id)
    .map((tag) => tag.tagKey)
  if (!includesEvery(contactTags, audience.contactTags)) return false
  if (
    audience.excludeContactTags?.length &&
    includesAny(contactTags, audience.excludeContactTags)
  ) {
    return false
  }

  const linkRollups = Array.from(input.contactLinkRollups).filter(
    (rollup) => rollup.contactId === contact.id && rollup.humanClicks > 0,
  )
  if (!rollupsIncludeAny(linkRollups, 'topics', audience.linkTopics)) return false
  if (
    audience.excludeLinkTopics?.length &&
    rollupsIncludeAny(linkRollups, 'topics', audience.excludeLinkTopics)
  ) {
    return false
  }
  if (!rollupsIncludeAny(linkRollups, 'tags', audience.linkTags)) return false
  if (
    audience.excludeLinkTags?.length &&
    rollupsIncludeAny(linkRollups, 'tags', audience.excludeLinkTags)
  ) {
    return false
  }
  if (
    audience.sponsor &&
    !linkRollups.some((rollup) => rollup.sponsor === audience.sponsor)
  ) {
    return false
  }

  const purchases = Array.from(input.purchases).filter(
    (purchase) => purchase.contactId === contact.id,
  )
  const productKeys = purchases.map((purchase) => purchase.productKey)
  if (!includesAny(productKeys, audience.purchasedProductKeys)) return false
  if (
    audience.excludePurchasedProductKeys?.length &&
    includesAny(productKeys, audience.excludePurchasedProductKeys)
  ) {
    return false
  }

  if (
    audience.minLifetimeValueCents !== undefined ||
    audience.maxLifetimeValueCents !== undefined
  ) {
    const currency = audience.currency ?? 'USD'
    const value =
      input.valueRollups.get(valueRollupKey(contact.id, currency))?.totalAmountCents ?? 0
    if (
      audience.minLifetimeValueCents !== undefined &&
      value < audience.minLifetimeValueCents
    ) {
      return false
    }
    if (
      audience.maxLifetimeValueCents !== undefined &&
      value > audience.maxLifetimeValueCents
    ) {
      return false
    }
  }

  return true
}
