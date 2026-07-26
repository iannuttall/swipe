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

export const sendPlanSchema = z.object({
  audience: audienceSchema.optional(),
  deliveryPolicy: deliveryPolicySchema.optional(),
  scheduledAt: z.string().datetime().optional(),
  sampleLimit: z.number().int().positive().max(500).optional(),
})

export function deliveryPolicyFromBody(
  body: z.infer<typeof deliveryPolicySchema>,
): DeliveryPolicyInput {
  return {
    ...(body.strategy ? { strategy: body.strategy } : {}),
    ...(body.batchSize ? { batchSize: body.batchSize } : {}),
    ...(body.batchDurationMinutes
      ? { batchDurationMinutes: body.batchDurationMinutes }
      : {}),
    ...(body.durationHours ? { durationHours: body.durationHours } : {}),
    ...(body.startAt ? { startAt: new Date(body.startAt) } : {}),
  }
}

export function sendPlanFromBody(body: z.infer<typeof sendPlanSchema>) {
  return {
    ...(body.audience ? { audience: audienceFromBody(body.audience) } : {}),
    ...(body.deliveryPolicy
      ? { deliveryPolicy: deliveryPolicyFromBody(body.deliveryPolicy) }
      : {}),
    ...(body.scheduledAt ? { scheduledAt: new Date(body.scheduledAt) } : {}),
    ...(body.sampleLimit !== undefined ? { sampleLimit: body.sampleLimit } : {}),
  }
}

export function audienceFromBody(body: z.infer<typeof audienceSchema>): AudienceFilter {
  return {
    ...(body.contactIds ? { contactIds: body.contactIds } : {}),
    ...(body.excludeContactIds ? { excludeContactIds: body.excludeContactIds } : {}),
    ...(body.contactTags ? { contactTags: body.contactTags } : {}),
    ...(body.excludeContactTags ? { excludeContactTags: body.excludeContactTags } : {}),
    ...(body.linkTopics ? { linkTopics: body.linkTopics } : {}),
    ...(body.excludeLinkTopics ? { excludeLinkTopics: body.excludeLinkTopics } : {}),
    ...(body.linkTags ? { linkTags: body.linkTags } : {}),
    ...(body.excludeLinkTags ? { excludeLinkTags: body.excludeLinkTags } : {}),
    ...(body.sponsor ? { sponsor: body.sponsor } : {}),
    ...(body.purchasedProductKeys
      ? { purchasedProductKeys: body.purchasedProductKeys }
      : {}),
    ...(body.excludePurchasedProductKeys
      ? { excludePurchasedProductKeys: body.excludePurchasedProductKeys }
      : {}),
    ...(body.minLifetimeValueCents !== undefined
      ? { minLifetimeValueCents: body.minLifetimeValueCents }
      : {}),
    ...(body.maxLifetimeValueCents !== undefined
      ? { maxLifetimeValueCents: body.maxLifetimeValueCents }
      : {}),
    ...(body.currency ? { currency: body.currency } : {}),
    ...(body.limit !== undefined ? { limit: body.limit } : {}),
  }
}
