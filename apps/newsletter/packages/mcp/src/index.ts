import {
  type AppConfig,
  createEmailPlatform,
  type DraftInput,
  type EmailPlatform,
  loadConfig,
} from '@email/core'
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js'
import { z } from 'zod'
import {
  audienceFromTool,
  audienceSchema,
  deliveryPolicyFromTool,
  deliveryPolicySchema,
} from './audience-tools.js'
import { registerTemplateTools } from './template-tools.js'

export const version = '0.1.0'

export interface McpInput {
  config?: AppConfig
  platform?: EmailPlatform
}

export function createMcpServer(input: McpInput = {}) {
  const config = input.config ?? loadConfig()
  const platform = input.platform ?? createEmailPlatform({ config })
  const server = new McpServer({
    name: config.appName,
    version,
  })

  server.registerTool(
    'email_subscribe',
    {
      title: 'Subscribe Contact',
      description: 'Subscribe an email address unless it is suppressed.',
      inputSchema: {
        email: z.string().email(),
        name: z.string().optional(),
        source: z.string().optional(),
      },
    },
    async (input) =>
      result(
        await platform.subscribe({
          email: input.email,
          ...(input.name ? { name: input.name } : {}),
          ...(input.source ? { source: input.source } : {}),
        }),
      ),
  )

  server.registerTool(
    'email_doctor',
    {
      title: 'Doctor',
      description: 'Return runtime configuration readiness checks.',
      inputSchema: {},
    },
    async () => result(await platform.doctor()),
  )

  server.registerTool(
    'email_get_ops_checklist',
    {
      title: 'Get Ops Checklist',
      description: 'Return production readiness checks and rollout/emergency commands.',
      inputSchema: {},
    },
    async () => result(await platform.getProductionOpsChecklist()),
  )

  server.registerTool(
    'email_recover_stuck_messages',
    {
      title: 'Recover Stuck Messages',
      description: 'Recover stale messages stuck in sending status.',
      inputSchema: {
        confirm: z.boolean(),
        staleAfterMs: z.number().int().positive().optional(),
        limit: z.number().int().positive().max(10_000).optional(),
      },
    },
    async (input) => {
      if (!input.confirm) return result({ error: 'confirm must be true' }, true)
      return result(
        await platform.recoverStuckMessages({
          ...(input.staleAfterMs !== undefined
            ? { staleAfterMs: input.staleAfterMs }
            : {}),
          limit: input.limit ?? 100,
        }),
      )
    },
  )

  registerTemplateTools(server, result)

  server.registerTool(
    'email_create_draft',
    {
      title: 'Create Draft',
      description: 'Create a newsletter draft from markdown.',
      inputSchema: {
        subject: z.string().min(1),
        bodyMarkdown: z.string().min(1),
        name: z.string().optional(),
        preview: z.string().optional(),
        fromEmail: z.string().email().optional(),
        fromName: z.string().optional(),
        replyTo: z.string().email().optional(),
        template: z.string().optional(),
      },
    },
    async (input) => result(await platform.createDraft(draftFromTool(input))),
  )

  server.registerTool(
    'email_export_contacts',
    {
      title: 'Export Contacts',
      description: 'Export contacts and suppressions for backup or migration.',
      inputSchema: {
        limit: z.number().int().positive().max(10_000).optional(),
      },
    },
    async (input) =>
      result(await platform.exportContacts({ limit: input.limit ?? 10_000 })),
  )

  server.registerTool(
    'email_import_contacts',
    {
      title: 'Import Contacts',
      description: 'Import contacts and optional suppressions from structured data.',
      inputSchema: {
        contacts: z.array(
          z.object({
            email: z.string().email(),
            name: z.string().optional(),
            attributes: z.record(z.string(), z.unknown()).optional(),
            source: z.string().optional(),
          }),
        ),
        suppressions: z
          .array(
            z.object({
              email: z.string().email().optional(),
              domain: z.string().optional(),
              reason: z.string().optional(),
              description: z.string().optional(),
              source: z.string().optional(),
            }),
          )
          .optional(),
      },
    },
    async (input) => result(await platform.importContacts(input)),
  )

  server.registerTool(
    'email_preview_send_plan',
    {
      title: 'Preview Send Plan',
      description:
        'Preview ranked recipients, schedule range, and domain mix before creating a broadcast.',
      inputSchema: {
        audience: audienceSchema.optional(),
        deliveryPolicy: deliveryPolicySchema.optional(),
        scheduledAt: z.string().datetime().optional(),
        sampleLimit: z.number().int().positive().max(500).optional(),
      },
    },
    async (input) =>
      result(
        await platform.previewSendPlan({
          ...(input.audience ? { audience: audienceFromTool(input.audience) } : {}),
          ...(input.deliveryPolicy
            ? { deliveryPolicy: deliveryPolicyFromTool(input.deliveryPolicy) }
            : {}),
          ...(input.scheduledAt ? { scheduledAt: new Date(input.scheduledAt) } : {}),
          ...(input.sampleLimit !== undefined ? { sampleLimit: input.sampleLimit } : {}),
        }),
      ),
  )

  server.registerTool(
    'email_prepare_broadcast',
    {
      title: 'Prepare Broadcast',
      description: 'Plan a broadcast using warm-first delivery ordering and cadence.',
      inputSchema: {
        draftId: z.string().min(1),
        name: z.string().optional(),
        audience: audienceSchema.optional(),
        deliveryPolicy: deliveryPolicySchema.optional(),
        scheduledAt: z.string().datetime().optional(),
      },
    },
    async (input) =>
      result(
        await platform.createBroadcast({
          draftId: input.draftId,
          ...(input.name ? { name: input.name } : {}),
          ...(input.audience ? { audience: audienceFromTool(input.audience) } : {}),
          ...(input.deliveryPolicy
            ? { deliveryPolicy: deliveryPolicyFromTool(input.deliveryPolicy) }
            : {}),
          ...(input.scheduledAt ? { scheduledAt: new Date(input.scheduledAt) } : {}),
        }),
      ),
  )

  server.registerTool(
    'email_create_canary',
    {
      title: 'Create Canary',
      description:
        'Create the first warm-first canary cohort for a draft, using cumulative promotion steps.',
      inputSchema: {
        draftId: z.string().min(1),
        name: z.string().optional(),
        audience: audienceSchema.optional(),
        deliveryPolicy: deliveryPolicySchema.optional(),
        steps: z
          .array(z.union([z.number().int().positive(), z.literal('all')]))
          .optional(),
        scheduledAt: z.string().datetime().optional(),
      },
    },
    async (input) =>
      result(
        await platform.createCanary({
          draftId: input.draftId,
          ...(input.name ? { name: input.name } : {}),
          ...(input.audience ? { audience: audienceFromTool(input.audience) } : {}),
          ...(input.deliveryPolicy
            ? { deliveryPolicy: deliveryPolicyFromTool(input.deliveryPolicy) }
            : {}),
          ...(input.steps ? { steps: input.steps } : {}),
          ...(input.scheduledAt ? { scheduledAt: new Date(input.scheduledAt) } : {}),
        }),
      ),
  )

  server.registerTool(
    'email_promote_canary',
    {
      title: 'Promote Canary',
      description:
        'Promote a canary to the next cumulative cohort, such as 50 to 500 to 2000 to all.',
      inputSchema: {
        id: z.string().min(1),
        stepIndex: z.number().int().nonnegative().optional(),
        scheduledAt: z.string().datetime().optional(),
      },
    },
    async (input) =>
      result(
        await platform.promoteCanary({
          id: input.id,
          ...(input.stepIndex !== undefined ? { stepIndex: input.stepIndex } : {}),
          ...(input.scheduledAt ? { scheduledAt: new Date(input.scheduledAt) } : {}),
        }),
      ),
  )

  server.registerTool(
    'email_get_canary',
    {
      title: 'Get Canary',
      description: 'Return a canary campaign with its cohorts and next promotion step.',
      inputSchema: {
        id: z.string().min(1),
      },
    },
    async (input) =>
      result((await platform.getCanary(input.id)) ?? { error: 'not_found' }),
  )

  server.registerTool(
    'email_send_test',
    {
      title: 'Send Test Email',
      description: 'Send a test email for a draft to a single address.',
      inputSchema: {
        confirm: z.boolean(),
        draftId: z.string().min(1),
        to: z.string().email(),
      },
    },
    async (input) => {
      if (!input.confirm) return result({ error: 'confirm must be true' }, true)
      return result(await platform.sendTest({ draftId: input.draftId, to: input.to }))
    },
  )

  server.registerTool(
    'email_send_ses_simulator',
    {
      title: 'Send SES Simulator Test',
      description: 'Send a draft to an Amazon SES mailbox simulator address.',
      inputSchema: {
        confirm: z.boolean(),
        draftId: z.string().min(1),
        type: z.enum(['success', 'bounce', 'complaint', 'ooto', 'suppression']),
      },
    },
    async (input) => {
      if (!input.confirm) return result({ error: 'confirm must be true' }, true)
      return result(
        await platform.sendSesSimulator({ draftId: input.draftId, type: input.type }),
      )
    },
  )

  server.registerTool(
    'email_retry_failed_messages',
    {
      title: 'Retry Failed Messages',
      description: 'Move failed messages back to the planned queue.',
      inputSchema: {
        confirm: z.boolean(),
        broadcastId: z.string().optional(),
        scheduledAt: z.string().datetime().optional(),
        limit: z.number().int().positive().max(10_000).optional(),
      },
    },
    async (input) => {
      if (!input.confirm) return result({ error: 'confirm must be true' }, true)
      return result(
        await platform.retryFailedMessages({
          ...(input.broadcastId ? { broadcastId: input.broadcastId } : {}),
          ...(input.scheduledAt ? { scheduledAt: new Date(input.scheduledAt) } : {}),
          limit: input.limit ?? 100,
        }),
      )
    },
  )

  server.registerTool(
    'email_get_broadcast_stats',
    {
      title: 'Get Broadcast Stats',
      description: 'Return delivery and engagement stats for a broadcast.',
      inputSchema: {
        broadcastId: z.string().min(1),
      },
    },
    async (input) => {
      const stats = await platform.getBroadcastStats(input.broadcastId)
      return result(stats ?? { error: 'broadcast_not_found' }, !stats)
    },
  )

  server.registerTool(
    'email_get_broadcast_links',
    {
      title: 'Get Broadcast Link Stats',
      description: 'Return per-link human and scanner click stats for a broadcast.',
      inputSchema: {
        broadcastId: z.string().min(1),
      },
    },
    async (input) => {
      const links = await platform.getBroadcastLinkStats(input.broadcastId)
      return result(links ? { links } : { error: 'broadcast_not_found' }, !links)
    },
  )

  server.registerTool(
    'email_get_contact_analytics',
    {
      title: 'Get Contact Analytics',
      description: 'Return a contact, engagement summary, and recent event history.',
      inputSchema: {
        emailOrId: z.string().min(1),
        limit: z.number().int().positive().max(500).optional(),
      },
    },
    async (input) => {
      const analytics = await platform.getContactAnalytics({
        emailOrId: input.emailOrId,
        limit: input.limit ?? 100,
      })
      return result(analytics ?? { error: 'contact_not_found' }, !analytics)
    },
  )

  server.registerTool(
    'email_tag_contact',
    {
      title: 'Tag Contact',
      description: 'Attach a first-class contact tag for segmentation and reporting.',
      inputSchema: {
        emailOrId: z.string().min(1),
        tagKey: z.string().min(1),
        name: z.string().optional(),
        source: z.string().optional(),
        metadata: z.record(z.string(), z.unknown()).optional(),
      },
    },
    async (input) =>
      result(
        await platform.tagContact({
          emailOrId: input.emailOrId,
          tagKey: input.tagKey,
          ...(input.name ? { name: input.name } : {}),
          ...(input.source ? { source: input.source } : {}),
          ...(input.metadata ? { metadata: input.metadata } : {}),
        }),
      ),
  )

  server.registerTool(
    'email_untag_contact',
    {
      title: 'Untag Contact',
      description: 'Remove a contact tag.',
      inputSchema: {
        emailOrId: z.string().min(1),
        tagKey: z.string().min(1),
      },
    },
    async (input) =>
      result(
        await platform.untagContact({
          emailOrId: input.emailOrId,
          tagKey: input.tagKey,
        }),
      ),
  )

  server.registerTool(
    'email_list_contact_tags',
    {
      title: 'List Contact Tags',
      description: 'List first-class tags for a contact.',
      inputSchema: {
        emailOrId: z.string().min(1),
      },
    },
    async (input) => {
      const tags = await platform.listContactTags({ emailOrId: input.emailOrId })
      return result(tags ? { tags } : { error: 'contact_not_found' }, !tags)
    },
  )

  server.registerTool(
    'email_upsert_contact_external_id',
    {
      title: 'Upsert Contact External ID',
      description:
        'Attach or update a provider-scoped external customer ID such as Stripe customer IDs or product user IDs.',
      inputSchema: {
        emailOrId: z.string().min(1),
        provider: z.string().min(1),
        externalId: z.string().min(1),
        label: z.string().optional(),
        metadata: z.record(z.string(), z.unknown()).optional(),
      },
    },
    async (input) =>
      result(
        await platform.upsertContactExternalId({
          emailOrId: input.emailOrId,
          provider: input.provider,
          externalId: input.externalId,
          ...(input.label ? { label: input.label } : {}),
          ...(input.metadata ? { metadata: input.metadata } : {}),
        }),
      ),
  )

  server.registerTool(
    'email_find_contact_by_external_id',
    {
      title: 'Find Contact By External ID',
      description: 'Look up a contact by provider-scoped external customer ID.',
      inputSchema: {
        provider: z.string().min(1),
        externalId: z.string().min(1),
      },
    },
    async (input) => {
      const contact = await platform.findContactByExternalId({
        provider: input.provider,
        externalId: input.externalId,
      })
      return result(contact ?? { error: 'contact_not_found' }, !contact)
    },
  )

  server.registerTool(
    'email_record_purchase',
    {
      title: 'Record Purchase',
      description:
        'Record an idempotent purchase ledger event and update contact lifetime value rollups.',
      inputSchema: {
        email: z.string().email().optional(),
        contactId: z.string().optional(),
        provider: z.string().optional(),
        externalId: z.string().optional(),
        idempotencyKey: z.string().optional(),
        productKey: z.string().min(1),
        productName: z.string().optional(),
        amountCents: z.number().int().nonnegative(),
        currency: z.string().min(3).max(3),
        purchasedAt: z.string().datetime().optional(),
        metadata: z.record(z.string(), z.unknown()).optional(),
      },
    },
    async (input) =>
      result(
        await platform.recordPurchase({
          ...(input.email ? { email: input.email } : {}),
          ...(input.contactId ? { contactId: input.contactId } : {}),
          ...(input.provider ? { provider: input.provider } : {}),
          ...(input.externalId ? { externalId: input.externalId } : {}),
          ...(input.idempotencyKey ? { idempotencyKey: input.idempotencyKey } : {}),
          productKey: input.productKey,
          ...(input.productName ? { productName: input.productName } : {}),
          amountCents: input.amountCents,
          currency: input.currency,
          ...(input.purchasedAt ? { purchasedAt: new Date(input.purchasedAt) } : {}),
          ...(input.metadata ? { metadata: input.metadata } : {}),
        }),
      ),
  )

  server.registerTool(
    'email_get_contact_value',
    {
      title: 'Get Contact Value',
      description: 'Return per-currency purchase count and lifetime value for a contact.',
      inputSchema: {
        emailOrId: z.string().min(1),
      },
    },
    async (input) => {
      const value = await platform.getContactValue({ emailOrId: input.emailOrId })
      return result(value ? { value } : { error: 'contact_not_found' }, !value)
    },
  )

  server.registerTool(
    'email_preview_audience',
    {
      title: 'Preview Audience',
      description:
        'Preview matching contacts for a segmentation rule before creating a broadcast.',
      inputSchema: {
        audience: audienceSchema.optional(),
      },
    },
    async (input) =>
      result(await platform.previewAudience(audienceFromTool(input.audience ?? {}))),
  )

  server.registerTool(
    'email_rebuild_analytics_rollups',
    {
      title: 'Rebuild Analytics Rollups',
      description:
        'Rebuild link/contact/value rollups from raw events and purchase ledgers. Requires confirm true.',
      inputSchema: {
        confirm: z.boolean(),
      },
    },
    async (input) => {
      if (!input.confirm) return result({ error: 'confirm must be true' }, true)
      return result(await platform.rebuildAnalyticsRollups())
    },
  )

  server.registerTool(
    'email_get_link_insights',
    {
      title: 'Get Link Insights',
      description:
        'Return detailed per-message/per-recipient link rollups by human clicks, optionally filtered by broadcast, topic, tag, or sponsor. Use email_get_link_summary for aggregate advertiser or campaign reports.',
      inputSchema: {
        broadcastId: z.string().optional(),
        topic: z.string().optional(),
        tag: z.string().optional(),
        sponsor: z.string().optional(),
        limit: z.number().int().positive().max(500).optional(),
      },
    },
    async (input) =>
      result(
        await platform.getLinkInsights({
          ...(input.broadcastId ? { broadcastId: input.broadcastId } : {}),
          ...(input.topic ? { topic: input.topic } : {}),
          ...(input.tag ? { tag: input.tag } : {}),
          ...(input.sponsor ? { sponsor: input.sponsor } : {}),
          limit: input.limit ?? 100,
        }),
      ),
  )

  server.registerTool(
    'email_get_link_summary',
    {
      title: 'Get Link Summary',
      description:
        'Return aggregate link performance by URL, topic, tag, and sponsor. Use this for questions like how many clicks an advertiser link received, which topics performed best, or which links had the most unique human clickers.',
      inputSchema: {
        broadcastId: z.string().optional(),
        topic: z.string().optional(),
        tag: z.string().optional(),
        sponsor: z.string().optional(),
        limit: z.number().int().positive().max(500).optional(),
      },
    },
    async (input) =>
      result(
        await platform.getLinkSummaryInsights({
          ...(input.broadcastId ? { broadcastId: input.broadcastId } : {}),
          ...(input.topic ? { topic: input.topic } : {}),
          ...(input.tag ? { tag: input.tag } : {}),
          ...(input.sponsor ? { sponsor: input.sponsor } : {}),
          limit: input.limit ?? 100,
        }),
      ),
  )

  server.registerTool(
    'email_get_contact_links',
    {
      title: 'Get Contact Link Interests',
      description:
        'Return links a contact repeatedly clicked, including topics and tags.',
      inputSchema: {
        emailOrId: z.string().min(1),
        limit: z.number().int().positive().max(500).optional(),
      },
    },
    async (input) => {
      const links = await platform.getContactLinkInsights({
        emailOrId: input.emailOrId,
        limit: input.limit ?? 100,
      })
      return result(links ? { links } : { error: 'contact_not_found' }, !links)
    },
  )

  server.registerTool(
    'email_get_contact_topics',
    {
      title: 'Get Contact Topic Interests',
      description: 'Return topics a contact clicks most often.',
      inputSchema: {
        emailOrId: z.string().min(1),
        limit: z.number().int().positive().max(500).optional(),
      },
    },
    async (input) => {
      const topics = await platform.getContactTopicInsights({
        emailOrId: input.emailOrId,
        limit: input.limit ?? 100,
      })
      return result(topics ? { topics } : { error: 'contact_not_found' }, !topics)
    },
  )

  server.registerTool(
    'email_send_due',
    {
      title: 'Send Due Messages',
      description: 'Send planned messages whose scheduled time has arrived.',
      inputSchema: {
        confirm: z.boolean(),
        now: z.string().datetime().optional(),
        limit: z.number().int().positive().max(10_000).optional(),
      },
    },
    async (input) => {
      if (!input.confirm) {
        return result({ sent: 0, skipped: 0, error: 'confirm must be true' }, true)
      }
      return result(
        await platform.sendDue(
          input.now ? new Date(input.now) : new Date(),
          input.limit ?? 100,
        ),
      )
    },
  )

  return server
}

export async function startMcpStdio(input: McpInput = {}) {
  const server = createMcpServer(input)
  await server.connect(new StdioServerTransport())
  return server
}

function draftFromTool(input: {
  subject: string
  bodyMarkdown: string
  name?: string | undefined
  preview?: string | undefined
  fromEmail?: string | undefined
  fromName?: string | undefined
  replyTo?: string | undefined
  template?: string | undefined
}): DraftInput {
  return {
    subject: input.subject,
    bodyMarkdown: input.bodyMarkdown,
    ...(input.name ? { name: input.name } : {}),
    ...(input.preview ? { preview: input.preview } : {}),
    ...(input.fromEmail ? { fromEmail: input.fromEmail } : {}),
    ...(input.fromName ? { fromName: input.fromName } : {}),
    ...(input.replyTo ? { replyTo: input.replyTo } : {}),
    ...(input.template ? { template: input.template } : {}),
  }
}

function result(data: object, isError = false): CallToolResult {
  const structuredContent = data as Record<string, unknown>
  return {
    isError,
    structuredContent,
    content: [
      {
        type: 'text' as const,
        text: JSON.stringify(data),
      },
    ],
  }
}
