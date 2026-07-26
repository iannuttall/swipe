import { planBroadcastSend } from './broadcast-planning.js'
import type { AppConfig } from './config.js'
import type { CanaryState } from './platform-contracts.js'
import type {
  CanaryCampaignRecord,
  CanaryCohortRecord,
  CanaryStepValue,
  EmailStore,
} from './store.js'
import type { AudienceFilter } from './subscriber-intelligence.js'
import type { DeliveryPolicyInput } from './types.js'

const DEFAULT_STEPS: CanaryStepValue[] = [50, 500, 2000, 'all']

export async function createCanaryCampaign(
  input: CanaryServiceInput & {
    draftId: string
    name?: string
    audience?: AudienceFilter
    deliveryPolicy?: DeliveryPolicyInput
    steps?: CanaryStepValue[]
    scheduledAt?: Date
  },
): Promise<CanaryState> {
  const draft = await input.store.getDraft(input.draftId)
  if (!draft) throw new Error(`Draft not found: ${input.draftId}`)
  const campaign = await input.store.createCanaryCampaign({
    draftId: draft.id,
    ...(input.name ? { name: input.name } : {}),
    ...(input.audience ? { audience: input.audience } : {}),
    ...(input.deliveryPolicy ? { deliveryPolicy: input.deliveryPolicy } : {}),
    steps: normalizeCanarySteps(input.steps),
    ...(input.scheduledAt ? { scheduledAt: input.scheduledAt } : {}),
  })
  await createCohort({ ...input, campaign, stepIndex: 0 })
  return canaryState(input.store, campaign.id)
}

export async function promoteCanaryCampaign(
  input: CanaryServiceInput & {
    id: string
    stepIndex?: number
    scheduledAt?: Date
  },
): Promise<CanaryState> {
  const campaign = await input.store.getCanaryCampaign(input.id)
  if (!campaign) throw new Error(`Canary campaign not found: ${input.id}`)
  if (campaign.status !== 'active') {
    throw new Error(`Canary campaign is ${campaign.status}`)
  }
  const cohorts = await input.store.listCanaryCohorts(campaign.id)
  const stepIndex = input.stepIndex ?? (cohorts.at(-1)?.stepIndex ?? -1) + 1
  if (stepIndex < 0 || stepIndex >= campaign.steps.length) {
    throw new Error('No canary step available to promote')
  }
  if (cohorts.some((cohort) => cohort.stepIndex === stepIndex)) {
    throw new Error(`Canary step ${stepIndex} already exists`)
  }
  await createCohort({ ...input, campaign, stepIndex })
  return canaryState(input.store, campaign.id)
}

export async function getCanaryState(
  store: EmailStore,
  id: string,
): Promise<CanaryState | undefined> {
  const campaign = await store.getCanaryCampaign(id)
  if (!campaign) return undefined
  const cohorts = await store.listCanaryCohorts(id)
  return stateFrom(campaign, cohorts)
}

function normalizeCanarySteps(steps = DEFAULT_STEPS): CanaryStepValue[] {
  if (steps.length === 0) throw new Error('Canary steps are required')
  let previous = 0
  return steps.map((step, index) => {
    if (step === 'all') {
      if (index !== steps.length - 1) throw new Error('all must be the final canary step')
      return step
    }
    if (!Number.isSafeInteger(step) || step < 1) {
      throw new Error('Canary step counts must be positive integers')
    }
    if (step <= previous) {
      throw new Error('Canary step counts must increase')
    }
    previous = step
    return step
  })
}

async function createCohort(
  input: CanaryServiceInput & {
    campaign: CanaryCampaignRecord
    stepIndex: number
    scheduledAt?: Date
  },
): Promise<CanaryCohortRecord> {
  const draft = await input.store.getDraft(input.campaign.draftId)
  if (!draft) throw new Error(`Draft not found: ${input.campaign.draftId}`)
  const existing = await input.store.listCanaryCohorts(input.campaign.id)
  const fullPlan = await planBroadcastSend({
    store: input.store,
    config: input.config,
    audience: input.campaign.audience as AudienceFilter,
    deliveryPolicy: input.campaign.deliveryPolicy as DeliveryPolicyInput,
    ...scheduledAt(input),
  })
  const target = input.campaign.steps[input.stepIndex]
  if (target === undefined) throw new Error('Canary step does not exist')
  const targetTotal = target === 'all' ? fullPlan.total : Math.min(target, fullPlan.total)
  const previous = new Set(existing.flatMap((cohort) => cohort.contactIds))
  const contactIds = fullPlan.planned
    .slice(0, targetTotal)
    .map((recipient) => recipient.contactId)
    .filter((contactId) => !previous.has(contactId))
  if (contactIds.length === 0)
    throw new Error('No new contacts available for canary step')

  const cohortPlan = await planBroadcastSend({
    store: input.store,
    config: input.config,
    audience: { contactIds },
    deliveryPolicy: input.campaign.deliveryPolicy as DeliveryPolicyInput,
    ...scheduledAt(input),
  })
  const broadcast = await input.store.createBroadcast({
    draftId: draft.id,
    name: `${input.campaign.name ?? draft.name ?? draft.subject} canary ${input.stepIndex + 1}`,
    subject: draft.subject,
    audience: cohortPlan.audience,
    deliveryPolicy: cohortPlan.deliveryPolicy,
    ...(input.scheduledAt ? { scheduledAt: input.scheduledAt } : {}),
  })
  await input.store.createMessages(broadcast.id, cohortPlan.planned)
  const cohort = await input.store.createCanaryCohort({
    campaignId: input.campaign.id,
    stepIndex: input.stepIndex,
    target,
    targetTotal,
    addedCount: cohortPlan.total,
    broadcastId: broadcast.id,
    contactIds,
  })
  if (target === 'all' || targetTotal >= fullPlan.total) {
    await input.store.updateCanaryCampaignStatus(input.campaign.id, 'completed')
  }
  return cohort
}

async function canaryState(store: EmailStore, id: string): Promise<CanaryState> {
  const state = await getCanaryState(store, id)
  if (!state) throw new Error(`Canary campaign not found: ${id}`)
  return state
}

function stateFrom(
  campaign: CanaryCampaignRecord,
  cohorts: CanaryCohortRecord[],
): CanaryState {
  const nextIndex = (cohorts.at(-1)?.stepIndex ?? -1) + 1
  const nextStep = campaign.status === 'active' ? campaign.steps[nextIndex] : undefined
  return {
    campaign,
    cohorts,
    ...(nextStep !== undefined ? { nextStep } : {}),
  }
}

interface CanaryServiceInput {
  store: EmailStore
  config: AppConfig
}

function scheduledAt(input: { scheduledAt?: Date; campaign: CanaryCampaignRecord }): {
  scheduledAt?: Date
} {
  const value = input.scheduledAt ?? input.campaign.scheduledAt
  return value ? { scheduledAt: value } : {}
}
