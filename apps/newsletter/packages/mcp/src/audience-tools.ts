import type { AudienceFilter, DeliveryPolicyInput } from '@email/core'
import { z } from 'zod'

export const audienceSchema = z.object({
  contactIds: z.array(z.string()).optional(),
  excludeContactIds: z.array(z.string()).optional(),
  contactTags: z.array(z.string()).optional(),
  excludeContactTags: z.array(z.string()).optional(),
  linkTopics: z.array(z.string()).optional(),
  excludeLinkTopics: z.array(z.string()).optional(),
  linkTags: z.array(z.string()).optional(),
  excludeLinkTags: z.array(z.string()).optional(),
  sponsor: z.string().optional(),
  purchasedProductKeys: z.array(z.string()).optional(),
  excludePurchasedProductKeys: z.array(z.string()).optional(),
  minLifetimeValueCents: z.number().int().nonnegative().optional(),
  maxLifetimeValueCents: z.number().int().nonnegative().optional(),
  currency: z.string().optional(),
  limit: z.number().int().positive().max(10_000).optional(),
})

export const deliveryPolicySchema = z.object({
  strategy: z.enum(['steady', 'duration', 'warm_first']).optional(),
  batchSize: z.number().int().positive().optional(),
  batchDurationMinutes: z.number().int().positive().optional(),
  durationHours: z.number().positive().optional(),
  startAt: z.string().datetime().optional(),
})

export function audienceFromTool(input: z.infer<typeof audienceSchema>): AudienceFilter {
  return {
    ...(input.contactIds ? { contactIds: input.contactIds } : {}),
    ...(input.excludeContactIds ? { excludeContactIds: input.excludeContactIds } : {}),
    ...(input.contactTags ? { contactTags: input.contactTags } : {}),
    ...(input.excludeContactTags ? { excludeContactTags: input.excludeContactTags } : {}),
    ...(input.linkTopics ? { linkTopics: input.linkTopics } : {}),
    ...(input.excludeLinkTopics ? { excludeLinkTopics: input.excludeLinkTopics } : {}),
    ...(input.linkTags ? { linkTags: input.linkTags } : {}),
    ...(input.excludeLinkTags ? { excludeLinkTags: input.excludeLinkTags } : {}),
    ...(input.sponsor ? { sponsor: input.sponsor } : {}),
    ...(input.purchasedProductKeys
      ? { purchasedProductKeys: input.purchasedProductKeys }
      : {}),
    ...(input.excludePurchasedProductKeys
      ? { excludePurchasedProductKeys: input.excludePurchasedProductKeys }
      : {}),
    ...(input.minLifetimeValueCents !== undefined
      ? { minLifetimeValueCents: input.minLifetimeValueCents }
      : {}),
    ...(input.maxLifetimeValueCents !== undefined
      ? { maxLifetimeValueCents: input.maxLifetimeValueCents }
      : {}),
    ...(input.currency ? { currency: input.currency } : {}),
    ...(input.limit !== undefined ? { limit: input.limit } : {}),
  }
}

export function deliveryPolicyFromTool(
  input: z.infer<typeof deliveryPolicySchema>,
): DeliveryPolicyInput {
  return {
    ...(input.strategy ? { strategy: input.strategy } : {}),
    ...(input.batchSize ? { batchSize: input.batchSize } : {}),
    ...(input.batchDurationMinutes
      ? { batchDurationMinutes: input.batchDurationMinutes }
      : {}),
    ...(input.durationHours ? { durationHours: input.durationHours } : {}),
    ...(input.startAt ? { startAt: new Date(input.startAt) } : {}),
  }
}
