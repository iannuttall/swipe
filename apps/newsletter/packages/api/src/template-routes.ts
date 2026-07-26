import { listEmailTemplates, renderDraftEmail } from '@email/core'
import type { Hono } from 'hono'
import { z } from 'zod'

const templateRenderSchema = z.object({
  subject: z.string().min(1),
  bodyMarkdown: z.string().min(1),
  preview: z.string().optional(),
  template: z.string().optional(),
})

export function registerTemplateRoutes(app: Hono) {
  app.get('/api/templates', (c) => c.json({ templates: listEmailTemplates() }))

  app.post('/api/templates/render', async (c) => {
    const body = templateRenderSchema.parse(await c.req.json())
    return c.json(
      await renderDraftEmail({
        subject: body.subject,
        bodyMarkdown: body.bodyMarkdown,
        ...(body.preview ? { preview: body.preview } : {}),
        ...(body.template ? { template: body.template } : {}),
      }),
    )
  })
}
