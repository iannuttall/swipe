import type { AppConfig } from './config.js'
import { planRecipients } from './delivery-planner.js'
import type { ContactRecord, EmailStore } from './store.js'
import type { AudienceFilter } from './subscriber-intelligence.js'
import type { DeliveryPolicyInput, PlannedRecipient } from './types.js'

export interface BroadcastSendPlan {
  audience: AudienceFilter
  deliveryPolicy: DeliveryPolicyInput
  total: number
  suppressed: number
  planned: PlannedRecipient[]
}

export interface SendPlanPreview {
  audience: AudienceFilter
  deliveryPolicy: DeliveryPolicyInput
  total: number
  suppressed: number
  startsAt?: Date
  endsAt?: Date
  sample: PlannedRecipient[]
  domains: Array<{ domain: string; count: number }>
}

export async function planBroadcastSend(input: {
  store: Pick<EmailStore, 'resolveAudience' | 'getEngagement'>
  config: AppConfig
  audience?: AudienceFilter
  deliveryPolicy?: DeliveryPolicyInput
  scheduledAt?: Date
}): Promise<BroadcastSendPlan> {
  const resolution = await input.store.resolveAudience(input.audience ?? {})
  const engagement = await input.store.getEngagement(
    resolution.contacts.map((contact) => contact.id),
  )
  const deliveryPolicy = {
    ...(input.deliveryPolicy ?? {}),
    ...(input.scheduledAt ? { startAt: input.scheduledAt } : {}),
  }
  const planned = planRecipients({
    defaults: input.config.delivery,
    recipients: recipientsFromContacts(resolution.contacts, engagement),
    policy: deliveryPolicy,
  })
  return {
    audience: resolution.audience,
    deliveryPolicy,
    total: planned.length,
    suppressed: resolution.suppressed,
    planned,
  }
}

export function previewBroadcastSendPlan(
  plan: BroadcastSendPlan,
  sampleLimit = 25,
): SendPlanPreview {
  const startsAt = plan.planned[0]?.scheduledAt
  const endsAt = plan.planned.at(-1)?.scheduledAt
  return {
    audience: plan.audience,
    deliveryPolicy: plan.deliveryPolicy,
    total: plan.total,
    suppressed: plan.suppressed,
    ...(startsAt ? { startsAt } : {}),
    ...(endsAt ? { endsAt } : {}),
    sample: plan.planned.slice(0, sampleLimit),
    domains: domainBreakdown(plan.planned),
  }
}

function recipientsFromContacts(
  contacts: ContactRecord[],
  engagement: Awaited<ReturnType<EmailStore['getEngagement']>>,
) {
  return contacts.map((contact) => {
    const summary = engagement.get(contact.id)
    return {
      contactId: contact.id,
      email: contact.email,
      ...(contact.subscribedAt ? { subscribedAt: contact.subscribedAt } : {}),
      ...(summary ? { engagement: summary } : {}),
    }
  })
}

function domainBreakdown(planned: PlannedRecipient[]) {
  const counts = new Map<string, number>()
  for (const recipient of planned) {
    counts.set(recipient.domain, (counts.get(recipient.domain) ?? 0) + 1)
  }
  return Array.from(counts, ([domain, count]) => ({ domain, count })).toSorted(
    (a, b) => b.count - a.count || a.domain.localeCompare(b.domain),
  )
}
