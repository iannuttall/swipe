import { asc, eq, sql } from 'drizzle-orm'
import type { Database } from './db/index.js'
import { canaryCampaigns, canaryCohorts } from './db/schema.js'
import type {
  CanaryCampaignRecord,
  CanaryCohortRecord,
  CanaryStepValue,
} from './store.js'
import type { AudienceFilter } from './subscriber-intelligence.js'
import type { DeliveryPolicyInput } from './types.js'

type CanaryCampaignRow = typeof canaryCampaigns.$inferSelect
type CanaryCohortRow = typeof canaryCohorts.$inferSelect

export async function createPostgresCanaryCampaign(
  db: Database,
  input: {
    draftId: string
    name?: string
    audience?: AudienceFilter
    deliveryPolicy?: DeliveryPolicyInput
    steps: CanaryStepValue[]
    scheduledAt?: Date
  },
): Promise<CanaryCampaignRecord> {
  const [row] = await db
    .insert(canaryCampaigns)
    .values({
      draftId: input.draftId,
      audience: (input.audience ?? {}) as Record<string, unknown>,
      deliveryPolicy: (input.deliveryPolicy ?? {}) as Record<string, unknown>,
      steps: input.steps,
      ...(input.name ? { name: input.name } : {}),
      ...(input.scheduledAt ? { scheduledAt: input.scheduledAt } : {}),
    })
    .returning()
  if (!row) throw new Error('Failed to create canary campaign')
  return mapCanaryCampaign(row)
}

export async function getPostgresCanaryCampaign(
  db: Database,
  id: string,
): Promise<CanaryCampaignRecord | undefined> {
  const [row] = await db
    .select()
    .from(canaryCampaigns)
    .where(eq(canaryCampaigns.id, id))
    .limit(1)
  return row ? mapCanaryCampaign(row) : undefined
}

export async function updatePostgresCanaryCampaignStatus(
  db: Database,
  id: string,
  status: CanaryCampaignRecord['status'],
): Promise<void> {
  await db
    .update(canaryCampaigns)
    .set({
      status,
      updatedAt: sql`now()`,
      ...(status === 'completed' ? { completedAt: new Date() } : {}),
    })
    .where(eq(canaryCampaigns.id, id))
}

export async function createPostgresCanaryCohort(
  db: Database,
  input: {
    campaignId: string
    stepIndex: number
    target: CanaryStepValue
    targetTotal: number
    addedCount: number
    broadcastId: string
    contactIds: string[]
  },
): Promise<CanaryCohortRecord> {
  const [row] = await db.insert(canaryCohorts).values(input).returning()
  if (!row) throw new Error('Failed to create canary cohort')
  return mapCanaryCohort(row)
}

export async function listPostgresCanaryCohorts(
  db: Database,
  campaignId: string,
): Promise<CanaryCohortRecord[]> {
  const rows = await db
    .select()
    .from(canaryCohorts)
    .where(eq(canaryCohorts.campaignId, campaignId))
    .orderBy(asc(canaryCohorts.stepIndex))
  return rows.map(mapCanaryCohort)
}

function mapCanaryCampaign(row: CanaryCampaignRow): CanaryCampaignRecord {
  return {
    id: row.id,
    draftId: row.draftId,
    status: canaryStatus(row.status),
    audience: row.audience,
    deliveryPolicy: row.deliveryPolicy,
    steps: row.steps,
    createdAt: row.createdAt,
    ...(row.name ? { name: row.name } : {}),
    ...(row.scheduledAt ? { scheduledAt: row.scheduledAt } : {}),
    ...(row.completedAt ? { completedAt: row.completedAt } : {}),
  }
}

function mapCanaryCohort(row: CanaryCohortRow): CanaryCohortRecord {
  return {
    id: row.id,
    campaignId: row.campaignId,
    stepIndex: row.stepIndex,
    target: row.target,
    targetTotal: row.targetTotal,
    addedCount: row.addedCount,
    broadcastId: row.broadcastId,
    contactIds: row.contactIds,
    createdAt: row.createdAt,
  }
}

function canaryStatus(value: string): CanaryCampaignRecord['status'] {
  if (value === 'completed' || value === 'cancelled') return value
  return 'active'
}
