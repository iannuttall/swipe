import type { EmailPlatform } from '@email/core'
import type { Hono } from 'hono'
import { z } from 'zod'

const confirmSchema = z.object({
  token: z.string().min(20).max(4_096),
  ip: z.string().max(100).optional(),
  userAgent: z.string().max(500).optional(),
  sourceUrl: z.string().url().max(1_000).optional(),
})

const prepareSchema = z.object({
  confirm: z.literal(true),
  batchKey: z.string().min(3).max(80),
  expiresAt: z.string().datetime(),
  source: z.string().max(120).optional(),
})

const reportSchema = z.object({
  purpose: z.enum(['double_opt_in', 'swipe_invite', 'swipe_migration']),
  batchKey: z.string().min(3).max(80).optional(),
})

const cleanupSchema = z.object({
  confirm: z.boolean().default(false),
  batchKey: z.string().min(3).max(80),
  expiredBefore: z.string().datetime(),
  source: z.string().max(120).optional(),
})

export function registerConfirmationRoutes(app: Hono, platform: EmailPlatform): void {
  app.post('/api/confirmations/confirm', async (c) => {
    const body = confirmSchema.parse(await c.req.json())
    const result = await platform.confirmSubscription({
      token: body.token,
      ...(body.ip ? { ip: body.ip } : {}),
      ...(body.userAgent ? { userAgent: body.userAgent } : {}),
      ...(body.sourceUrl ? { sourceUrl: body.sourceUrl } : {}),
    })
    if (result.status === 'invalid') return c.json(result, 400)
    if (result.status === 'expired') return c.json(result, 410)
    return c.json(result)
  })

  app.post('/api/confirmations/migration/prepare', async (c) => {
    const body = prepareSchema.parse(await c.req.json())
    return c.json(
      await platform.prepareMigrationConfirmations({
        batchKey: body.batchKey,
        expiresAt: new Date(body.expiresAt),
        ...(body.source ? { source: body.source } : {}),
      }),
      201,
    )
  })

  app.get('/api/confirmations/report', async (c) => {
    const query = reportSchema.parse(c.req.query())
    return c.json(
      await platform.getConfirmationReport({
        purpose: query.purpose,
        ...(query.batchKey ? { batchKey: query.batchKey } : {}),
      }),
    )
  })

  app.post('/api/confirmations/migration/unsubscribe-unconfirmed', async (c) => {
    const body = cleanupSchema.parse(await c.req.json())
    return c.json(
      await platform.unsubscribeUnconfirmedMigration({
        batchKey: body.batchKey,
        expiredBefore: new Date(body.expiredBefore),
        execute: body.confirm,
        ...(body.source ? { source: body.source } : {}),
      }),
      body.confirm ? 202 : 200,
    )
  })
}
