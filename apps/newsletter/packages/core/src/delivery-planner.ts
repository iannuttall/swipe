import { getEmailDomain, normalizeEmail } from './email-address.js'
import type {
  DeliveryPolicyInput,
  EngagementSummary,
  PlannedRecipient,
  RecipientStatus,
} from './types.js'

export interface RecipientCandidate {
  contactId: string
  email: string
  subscribedAt?: Date
  engagement?: EngagementSummary
}

export interface DeliveryPlannerDefaults {
  batchSize: number
  batchDurationMinutes: number
  defaultDurationHours: number
}

export interface PlanRecipientsInput {
  recipients: RecipientCandidate[]
  policy?: DeliveryPolicyInput
  defaults: DeliveryPlannerDefaults
  now?: Date
}

type ScoredRecipient = RecipientCandidate & {
  normalizedEmail: string
  domain: string
  engagementScore: number
  rankReason: string
  status: RecipientStatus
  lastWarmSignalAt?: Date
}

// A zero-click subscriber gets one full run of nine issues before being
// considered cold. Opens do not affect this status because open tracking is
// routinely blocked or proxied by email clients.
export const coldAfterSends = 9

export function planRecipients(input: PlanRecipientsInput): PlannedRecipient[] {
  const now = input.now ?? new Date()
  const startAt = input.policy?.startAt ?? now
  const strategy = input.policy?.strategy ?? 'warm_first'
  const scored = input.recipients.map((recipient) => scoreRecipient(recipient, now))
  const ordered = strategy === 'steady' ? scored : scored.toSorted(compareWarmth)
  const intervalInput = {
    count: ordered.length,
    defaults: input.defaults,
    ...(input.policy ? { policy: input.policy } : {}),
  }
  const intervalMs = calculateIntervalMs(intervalInput)

  return ordered.map((recipient, index) => ({
    contactId: recipient.contactId,
    email: recipient.normalizedEmail,
    domain: recipient.domain,
    engagementScore: recipient.engagementScore,
    sendRank: index + 1,
    rankReason: recipient.rankReason,
    status: recipient.status,
    scheduledAt: new Date(startAt.getTime() + index * intervalMs),
  }))
}

export function calculateIntervalMs(input: {
  count: number
  policy?: DeliveryPolicyInput
  defaults: DeliveryPlannerDefaults
}): number {
  if (input.count <= 1) return 0

  const strategy = input.policy?.strategy ?? 'warm_first'
  if (strategy === 'duration' || input.policy?.durationHours) {
    const durationHours =
      input.policy?.durationHours ?? input.defaults.defaultDurationHours
    return Math.max(1, Math.floor((durationHours * 60 * 60 * 1000) / input.count))
  }

  const batchSize = input.policy?.batchSize ?? input.defaults.batchSize
  const batchDurationMinutes =
    input.policy?.batchDurationMinutes ?? input.defaults.batchDurationMinutes

  return Math.max(1, Math.floor((batchDurationMinutes * 60 * 1000) / batchSize))
}

function scoreRecipient(recipient: RecipientCandidate, now: Date): ScoredRecipient {
  const engagement = recipient.engagement
  const totalClicks = engagement?.totalClicks ?? 0
  const totalSends = engagement?.totalSends ?? 0
  const totalOpens = engagement?.totalOpens ?? 0
  const clickScore = Math.min(totalClicks, 20) * 100
  const openScore = Math.min(totalOpens, 50) * 10
  const recencyScore = scoreRecency(
    engagement?.lastClickedAt ?? engagement?.lastOpenedAt ?? recipient.subscribedAt,
    now,
  )
  const engagementScore = clickScore + openScore + recencyScore
  const normalizedEmail = normalizeEmail(recipient.email)
  const lastWarmSignalAt = engagement?.lastClickedAt ?? engagement?.lastOpenedAt

  const scored: ScoredRecipient = {
    ...recipient,
    normalizedEmail,
    domain: getEmailDomain(normalizedEmail),
    engagementScore,
    rankReason: getRankReason(totalClicks, totalOpens, recencyScore),
    status: recipientStatus(totalClicks, totalSends),
  }
  if (lastWarmSignalAt) {
    scored.lastWarmSignalAt = lastWarmSignalAt
  }
  return scored
}

function recipientStatus(totalClicks: number, totalSends: number): RecipientStatus {
  if (totalClicks > 0) return 'warm'
  if (totalSends >= coldAfterSends) return 'cold'
  return 'new'
}

function compareWarmth(a: ScoredRecipient, b: ScoredRecipient): number {
  if (b.engagementScore !== a.engagementScore) {
    return b.engagementScore - a.engagementScore
  }

  const bWarm = b.lastWarmSignalAt?.getTime() ?? 0
  const aWarm = a.lastWarmSignalAt?.getTime() ?? 0
  if (bWarm !== aWarm) return bWarm - aWarm

  const bSubscribed = b.subscribedAt?.getTime() ?? 0
  const aSubscribed = a.subscribedAt?.getTime() ?? 0
  if (bSubscribed !== aSubscribed) return bSubscribed - aSubscribed

  return a.normalizedEmail.localeCompare(b.normalizedEmail)
}

function scoreRecency(date: Date | undefined, now: Date): number {
  if (!date) return 0
  const ageDays = Math.max(0, (now.getTime() - date.getTime()) / 86_400_000)
  if (ageDays <= 7) return 50
  if (ageDays <= 30) return 25
  if (ageDays <= 90) return 10
  return 1
}

function getRankReason(
  totalClicks: number,
  totalOpens: number,
  recencyScore: number,
): string {
  if (totalClicks > 0) return 'prior_click'
  if (totalOpens > 0) return 'prior_open'
  if (recencyScore > 0) return 'recent_subscription'
  return 'default'
}
