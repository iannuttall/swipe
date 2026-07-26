import {
  type AppConfig,
  confirmSnsSubscription,
  createEmailPlatform,
  type EmailPlatform,
  isAllowedSnsTopic,
  loadConfig,
  normalizeSesSnsWebhook,
  parseSnsMessage,
  type SnsMessage,
  verifySnsSignature,
} from '@email/core'
import { serve } from '@hono/node-server'
import type { Context } from 'hono'
import { Hono } from 'hono'
import { z } from 'zod'
import {
  audienceFromBody,
  audienceSchema,
  deliveryPolicyFromBody,
  deliveryPolicySchema,
  sendPlanFromBody,
  sendPlanSchema,
} from './audience-input.js'
import { isAuthorized, safeEqual } from './auth.js'
import { transparentGif } from './responses.js'
import { registerTemplateRoutes } from './template-routes.js'
import { unsubscribePage } from './unsubscribe-page.js'

export const version = '0.1.0'

const subscribeSchema = z.object({
  email: z.string().email(),
  name: z.string().optional(),
  source: z.string().optional(),
})

const contactImportSchema = z.object({
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
})

const draftSchema = z.object({
  subject: z.string().min(1),
  bodyMarkdown: z.string().min(1),
  name: z.string().optional(),
  preview: z.string().optional(),
  fromEmail: z.string().email().optional(),
  fromName: z.string().optional(),
  replyTo: z.string().email().optional(),
  template: z.string().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
})

const broadcastSchema = z.object({
  draftId: z.string().min(1),
  name: z.string().optional(),
  audience: audienceSchema.optional(),
  deliveryPolicy: deliveryPolicySchema.optional(),
  scheduledAt: z.string().datetime().optional(),
})

const canarySchema = broadcastSchema.extend({
  steps: z.array(z.union([z.number().int().positive(), z.literal('all')])).optional(),
})

const canaryPromoteSchema = z.object({
  stepIndex: z.number().int().nonnegative().optional(),
  scheduledAt: z.string().datetime().optional(),
})

const contactTagSchema = z.object({
  tagKey: z.string().min(1),
  name: z.string().optional(),
  source: z.string().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
})

const externalIdSchema = z.object({
  provider: z.string().min(1),
  externalId: z.string().min(1),
  label: z.string().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
})

const purchaseSchema = z.object({
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
})

const rollupRebuildSchema = z.object({
  confirm: z.literal(true),
})

const recoverStuckSchema = z.object({
  confirm: z.literal(true),
  staleAfterMs: z.number().int().positive().optional(),
  limit: z.number().int().positive().max(10_000).optional(),
})

const testSchema = z.object({
  confirm: z.literal(true),
  draftId: z.string().min(1),
  to: z.string().email(),
  status: z.enum(['new', 'warm', 'cold']).optional(),
})

const sesSimulatorSchema = z.object({
  confirm: z.literal(true),
  draftId: z.string().min(1),
  type: z.enum(['success', 'bounce', 'complaint', 'ooto', 'suppression']),
})

const retryFailedSchema = z.object({
  confirm: z.literal(true),
  broadcastId: z.string().optional(),
  scheduledAt: z.string().datetime().optional(),
  limit: z.number().int().positive().max(10_000).optional(),
})

const sendDueSchema = z.object({
  confirm: z.literal(true),
  now: z.string().datetime().optional(),
  limit: z.number().int().positive().max(10_000).optional(),
})

const listSchema = z.object({
  limit: z.coerce.number().int().positive().max(500).optional(),
})

const linkInsightSchema = z.object({
  limit: z.coerce.number().int().positive().max(500).optional(),
  broadcastId: z.string().optional(),
  topic: z.string().optional(),
  tag: z.string().optional(),
  sponsor: z.string().optional(),
})

export interface ApiInput {
  config?: AppConfig
  platform?: EmailPlatform
  verifySnsSignature?: (message: SnsMessage) => Promise<boolean>
  confirmSnsSubscription?: (message: SnsMessage) => Promise<boolean>
}

export function createApp(input: ApiInput = {}) {
  const config = input.config ?? loadConfig()
  const platform = input.platform ?? createEmailPlatform({ config })
  const app = new Hono()

  const health = (c: { json: (body: unknown) => Response }) =>
    c.json({
      ok: true,
      name: config.appName,
      version,
      env: config.env,
      provider: config.provider,
    })

  app.get('/health', health)
  app.get('/healthz', health)
  app.get('/readyz', health)

  const handleSesWebhook = async (c: Context) => {
    const secret = c.req.param('secret')
    if (!secret || !safeEqual(secret, config.aws.snsWebhookSecret ?? '')) {
      return c.json({ error: 'unauthorized' }, 401)
    }
    const body = await c.req.json()
    const message = parseSnsMessage(body)

    if (!isAllowedSnsTopic(message.TopicArn, config.aws.snsAllowedTopics)) {
      return c.json({ error: 'unauthorized_topic' }, 403)
    }

    const verified = await (input.verifySnsSignature ?? defaultSnsVerifier(config))(
      message,
    )
    if (!verified) return c.json({ error: 'invalid_signature' }, 401)

    if (message.Type === 'SubscriptionConfirmation') {
      const confirmed = await (
        input.confirmSnsSubscription ?? defaultSnsSubscriptionConfirmer(config)
      )(message)
      return c.json(
        { status: confirmed ? 'subscription_confirmed' : 'subscription_rejected' },
        confirmed ? 202 : 400,
      )
    }

    if (message.Type !== 'Notification') {
      return c.json({ status: 'ignored' }, 202)
    }

    const events = normalizeSesSnsWebhook(body)
    return c.json(await platform.handleProviderEvents(events), 202)
  }

  app.post('/api/webhooks/:secret/ses', handleSesWebhook)
  app.post('/webhooks/ses/:secret', handleSesWebhook)

  app.use('/api/*', async (c, next) => {
    if (
      !isAuthorized(c.req.header('authorization'), c.req.header('x-api-token'), config)
    ) {
      return c.json({ error: 'unauthorized' }, 401)
    }
    await next()
  })

  app.post('/api/subscribe', async (c) => {
    const body = subscribeSchema.parse(await c.req.json())
    return c.json(
      await platform.subscribe({
        email: body.email,
        ...(body.name ? { name: body.name } : {}),
        ...(body.source ? { source: body.source } : {}),
      }),
      201,
    )
  })

  app.get('/api/doctor', async (c) => c.json(await platform.doctor()))

  app.get('/api/ops/checklist', async (c) =>
    c.json(await platform.getProductionOpsChecklist()),
  )

  app.post('/api/ops/recover-stuck', async (c) => {
    const body = recoverStuckSchema.parse(await c.req.json().catch(() => ({})))
    return c.json(
      await platform.recoverStuckMessages({
        ...(body.staleAfterMs !== undefined ? { staleAfterMs: body.staleAfterMs } : {}),
        limit: body.limit ?? 100,
      }),
      202,
    )
  })

  app.get('/api/contacts/export', async (c) => {
    const query = listSchema.parse(c.req.query())
    return c.json(await platform.exportContacts({ limit: query.limit ?? 10_000 }))
  })

  app.post('/api/contacts/import', async (c) => {
    const body = contactImportSchema.parse(await c.req.json())
    return c.json(await platform.importContacts(body), 202)
  })

  app.post('/api/drafts', async (c) => {
    const body = draftSchema.parse(await c.req.json())
    return c.json(
      await platform.createDraft({
        subject: body.subject,
        bodyMarkdown: body.bodyMarkdown,
        ...(body.name ? { name: body.name } : {}),
        ...(body.preview ? { preview: body.preview } : {}),
        ...(body.fromEmail ? { fromEmail: body.fromEmail } : {}),
        ...(body.fromName ? { fromName: body.fromName } : {}),
        ...(body.replyTo ? { replyTo: body.replyTo } : {}),
        ...(body.template ? { template: body.template } : {}),
        ...(body.metadata ? { metadata: body.metadata } : {}),
      }),
      201,
    )
  })

  registerTemplateRoutes(app)

  app.post('/api/broadcasts', async (c) => {
    const body = broadcastSchema.parse(await c.req.json())
    return c.json(
      await platform.createBroadcast({
        draftId: body.draftId,
        ...(body.name ? { name: body.name } : {}),
        ...(body.audience ? { audience: audienceFromBody(body.audience) } : {}),
        ...(body.deliveryPolicy
          ? { deliveryPolicy: deliveryPolicyFromBody(body.deliveryPolicy) }
          : {}),
        ...(body.scheduledAt ? { scheduledAt: new Date(body.scheduledAt) } : {}),
      }),
      201,
    )
  })

  app.post('/api/broadcasts/preview-plan', async (c) => {
    const body = sendPlanSchema.parse(await c.req.json().catch(() => ({})))
    return c.json(await platform.previewSendPlan(sendPlanFromBody(body)))
  })

  app.post('/api/canaries', async (c) => {
    const body = canarySchema.parse(await c.req.json())
    return c.json(
      await platform.createCanary({
        draftId: body.draftId,
        ...(body.name ? { name: body.name } : {}),
        ...(body.audience ? { audience: audienceFromBody(body.audience) } : {}),
        ...(body.deliveryPolicy
          ? { deliveryPolicy: deliveryPolicyFromBody(body.deliveryPolicy) }
          : {}),
        ...(body.steps ? { steps: body.steps } : {}),
        ...(body.scheduledAt ? { scheduledAt: new Date(body.scheduledAt) } : {}),
      }),
      201,
    )
  })

  app.get('/api/canaries/:id', async (c) => {
    const canary = await platform.getCanary(c.req.param('id'))
    if (!canary) return c.json({ error: 'not_found' }, 404)
    return c.json(canary)
  })

  app.post('/api/canaries/:id/promote', async (c) => {
    const body = canaryPromoteSchema.parse(await c.req.json())
    return c.json(
      await platform.promoteCanary({
        id: c.req.param('id'),
        ...(body.stepIndex !== undefined ? { stepIndex: body.stepIndex } : {}),
        ...(body.scheduledAt ? { scheduledAt: new Date(body.scheduledAt) } : {}),
      }),
    )
  })

  app.get('/api/broadcasts', async (c) => {
    const query = listSchema.parse(c.req.query())
    return c.json(await platform.listBroadcasts({ limit: query.limit ?? 50 }))
  })

  app.get('/api/broadcasts/:id', async (c) => {
    const broadcast = await platform.getBroadcast(c.req.param('id'))
    if (!broadcast) return c.json({ error: 'not_found' }, 404)
    return c.json(broadcast)
  })

  app.get('/api/broadcasts/:id/stats', async (c) => {
    const stats = await platform.getBroadcastStats(c.req.param('id'))
    if (!stats) return c.json({ error: 'not_found' }, 404)
    return c.json(stats)
  })

  app.get('/api/broadcasts/:id/links', async (c) => {
    const links = await platform.getBroadcastLinkStats(c.req.param('id'))
    if (!links) return c.json({ error: 'not_found' }, 404)
    return c.json(links)
  })

  app.get('/api/broadcasts/:id/events', async (c) => {
    const query = listSchema.parse(c.req.query())
    const events = await platform.listBroadcastEvents({
      broadcastId: c.req.param('id'),
      limit: query.limit ?? 100,
    })
    if (!events) return c.json({ error: 'not_found' }, 404)
    return c.json(events)
  })

  app.post('/api/broadcasts/:id/pause', async (c) => {
    const result = await platform.pauseBroadcast(c.req.param('id'))
    if (!result.paused) return c.json({ error: 'not_found' }, 404)
    return c.json(result)
  })

  app.post('/api/broadcasts/:id/resume', async (c) => {
    const result = await platform.resumeBroadcast(c.req.param('id'))
    if (!result.resumed) return c.json({ error: 'not_found' }, 404)
    return c.json(result)
  })

  app.post('/api/broadcasts/:id/cancel', async (c) => {
    const result = await platform.cancelBroadcast(c.req.param('id'))
    if (!result.cancelled) return c.json({ error: 'not_found' }, 404)
    return c.json(result)
  })

  app.post('/api/tests', async (c) => {
    const body = testSchema.parse(await c.req.json())
    return c.json(
      await platform.sendTest({
        draftId: body.draftId,
        to: body.to,
        ...(body.status ? { status: body.status } : {}),
      }),
      202,
    )
  })

  app.post('/api/tests/ses-simulator', async (c) => {
    const body = sesSimulatorSchema.parse(await c.req.json())
    return c.json(await platform.sendSesSimulator(body), 202)
  })

  app.post('/api/messages/retry-failed', async (c) => {
    const body = retryFailedSchema.parse(await c.req.json().catch(() => ({})))
    return c.json(
      await platform.retryFailedMessages({
        ...(body.broadcastId ? { broadcastId: body.broadcastId } : {}),
        ...(body.scheduledAt ? { scheduledAt: new Date(body.scheduledAt) } : {}),
        limit: body.limit ?? 100,
      }),
      202,
    )
  })

  app.post('/api/contacts/:identity/tags', async (c) => {
    const body = contactTagSchema.parse(await c.req.json())
    return c.json(
      await platform.tagContact({
        emailOrId: c.req.param('identity'),
        tagKey: body.tagKey,
        ...(body.name ? { name: body.name } : {}),
        ...(body.source ? { source: body.source } : {}),
        ...(body.metadata ? { metadata: body.metadata } : {}),
      }),
      201,
    )
  })

  app.get('/api/contacts/:identity/tags', async (c) => {
    const tags = await platform.listContactTags({
      emailOrId: c.req.param('identity'),
    })
    if (!tags) return c.json({ error: 'not_found' }, 404)
    return c.json(tags)
  })

  app.delete('/api/contacts/:identity/tags/:tag', async (c) => {
    return c.json(
      await platform.untagContact({
        emailOrId: c.req.param('identity'),
        tagKey: c.req.param('tag'),
      }),
    )
  })

  app.post('/api/contacts/:identity/external-ids', async (c) => {
    const body = externalIdSchema.parse(await c.req.json())
    return c.json(
      await platform.upsertContactExternalId({
        emailOrId: c.req.param('identity'),
        provider: body.provider,
        externalId: body.externalId,
        ...(body.label ? { label: body.label } : {}),
        ...(body.metadata ? { metadata: body.metadata } : {}),
      }),
      201,
    )
  })

  app.get('/api/external-ids/:provider/:externalId/contact', async (c) => {
    const contact = await platform.findContactByExternalId({
      provider: c.req.param('provider'),
      externalId: c.req.param('externalId'),
    })
    if (!contact) return c.json({ error: 'not_found' }, 404)
    return c.json(contact)
  })

  app.get('/api/contacts/:identity/value', async (c) => {
    const value = await platform.getContactValue({
      emailOrId: c.req.param('identity'),
    })
    if (!value) return c.json({ error: 'not_found' }, 404)
    return c.json(value)
  })

  app.post('/api/purchases', async (c) => {
    const body = purchaseSchema.parse(await c.req.json())
    return c.json(
      await platform.recordPurchase({
        ...(body.email ? { email: body.email } : {}),
        ...(body.contactId ? { contactId: body.contactId } : {}),
        ...(body.provider ? { provider: body.provider } : {}),
        ...(body.externalId ? { externalId: body.externalId } : {}),
        ...(body.idempotencyKey ? { idempotencyKey: body.idempotencyKey } : {}),
        productKey: body.productKey,
        ...(body.productName ? { productName: body.productName } : {}),
        amountCents: body.amountCents,
        currency: body.currency,
        ...(body.purchasedAt ? { purchasedAt: new Date(body.purchasedAt) } : {}),
        ...(body.metadata ? { metadata: body.metadata } : {}),
      }),
      201,
    )
  })

  app.post('/api/audience/preview', async (c) => {
    const body = audienceSchema.parse(await c.req.json().catch(() => ({})))
    return c.json(await platform.previewAudience(audienceFromBody(body)))
  })

  app.get('/api/contacts/:identity/analytics', async (c) => {
    const query = listSchema.parse(c.req.query())
    const analytics = await platform.getContactAnalytics({
      emailOrId: c.req.param('identity'),
      limit: query.limit ?? 100,
    })
    if (!analytics) return c.json({ error: 'not_found' }, 404)
    return c.json(analytics)
  })

  app.get('/api/contacts/:identity/links', async (c) => {
    const query = listSchema.parse(c.req.query())
    const links = await platform.getContactLinkInsights({
      emailOrId: c.req.param('identity'),
      limit: query.limit ?? 100,
    })
    if (!links) return c.json({ error: 'not_found' }, 404)
    return c.json(links)
  })

  app.get('/api/contacts/:identity/topics', async (c) => {
    const query = listSchema.parse(c.req.query())
    const topics = await platform.getContactTopicInsights({
      emailOrId: c.req.param('identity'),
      limit: query.limit ?? 100,
    })
    if (!topics) return c.json({ error: 'not_found' }, 404)
    return c.json(topics)
  })

  app.get('/api/analytics/links', async (c) => {
    const query = linkInsightSchema.parse(c.req.query())
    return c.json(
      await platform.getLinkInsights({
        ...(query.broadcastId ? { broadcastId: query.broadcastId } : {}),
        ...(query.topic ? { topic: query.topic } : {}),
        ...(query.tag ? { tag: query.tag } : {}),
        ...(query.sponsor ? { sponsor: query.sponsor } : {}),
        limit: query.limit ?? 100,
      }),
    )
  })

  app.get('/api/analytics/link-summary', async (c) => {
    const query = linkInsightSchema.parse(c.req.query())
    return c.json(
      await platform.getLinkSummaryInsights({
        ...(query.broadcastId ? { broadcastId: query.broadcastId } : {}),
        ...(query.topic ? { topic: query.topic } : {}),
        ...(query.tag ? { tag: query.tag } : {}),
        ...(query.sponsor ? { sponsor: query.sponsor } : {}),
        limit: query.limit ?? 100,
      }),
    )
  })

  app.post('/api/analytics/rebuild-rollups', async (c) => {
    rollupRebuildSchema.parse(await c.req.json().catch(() => ({})))
    return c.json(await platform.rebuildAnalyticsRollups(), 202)
  })

  app.post('/api/send-due', async (c) => {
    const body = sendDueSchema.parse(await c.req.json().catch(() => ({})))
    return c.json(
      await platform.sendDue(
        body.now ? new Date(body.now) : new Date(),
        body.limit ?? 100,
      ),
      202,
    )
  })

  app.get('/t/open/:token', async (c) => {
    await platform.trackOpen({
      token: c.req.param('token'),
      ...trackingMetadata(c.req.raw.headers, config),
    })
    return new Response(transparentGif(), {
      headers: {
        'content-type': 'image/gif',
        'cache-control': 'no-store, max-age=0',
      },
    })
  })

  app.get('/t/click/:token', async (c) => {
    const result = await platform.trackClick({
      token: c.req.param('token'),
      ...trackingMetadata(c.req.raw.headers, config),
    })
    if (!result.recorded || !result.url) return c.text('Not found', 404)
    return c.redirect(result.url, 302)
  })

  app.get('/unsubscribe/:token', (c) => {
    return c.html(unsubscribePage(config.appName, 'confirm'))
  })

  app.post('/unsubscribe/:token', async (c) => {
    const result = await platform.unsubscribe({
      token: c.req.param('token'),
      source: 'unsubscribe',
    })
    if (!result.unsubscribed) return c.text('Invalid unsubscribe link', 400)
    return c.html(unsubscribePage(config.appName, 'done'))
  })

  app.onError((error, c) => {
    if (error instanceof z.ZodError) {
      return c.json({ error: 'invalid_request', issues: error.issues }, 400)
    }
    return c.json({ error: error.message }, 500)
  })

  return app
}

export interface ServeApiInput extends ApiInput {
  port?: number
}

export function serveApi(input: ServeApiInput = {}) {
  const port = input.port ?? Number.parseInt(process.env.PORT ?? '3000', 10)
  return serve({ fetch: createApp(input).fetch, port })
}

function trackingMetadata(headers: Headers, config: AppConfig) {
  const userAgent = headers.get('user-agent') ?? undefined
  const ip = firstHeader(headers, 'cf-connecting-ip', 'x-real-ip', 'x-forwarded-for')
  return {
    ...(userAgent ? { userAgent } : {}),
    ...(ip && config.trackingSecret ? { ip } : {}),
  }
}

function firstHeader(headers: Headers, ...names: string[]): string | undefined {
  for (const name of names) {
    const value = headers.get(name)
    if (value) return value.split(',')[0]?.trim()
  }
  return undefined
}

function defaultSnsVerifier(config: AppConfig) {
  return (message: SnsMessage) =>
    verifySnsSignature(message, {
      allowedCertHostSuffixes: config.aws.snsAllowedCertHostSuffixes,
    })
}

function defaultSnsSubscriptionConfirmer(config: AppConfig) {
  return (message: SnsMessage) =>
    confirmSnsSubscription(message, {
      allowedSubscribeHostSuffixes: config.aws.snsAllowedSubscribeHostSuffixes,
    })
}
