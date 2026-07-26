import { listEmailTemplates, renderDraftEmail } from '@email/core'
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js'
import { z } from 'zod'

export function registerTemplateTools(
  server: McpServer,
  result: (data: object, isError?: boolean) => CallToolResult,
) {
  server.registerTool(
    'email_list_templates',
    {
      title: 'List Email Templates',
      description: 'List available email templates and rendering engines.',
      inputSchema: {},
    },
    async () => result({ templates: listEmailTemplates() }),
  )

  server.registerTool(
    'email_render_template',
    {
      title: 'Render Email Template',
      description: 'Render a markdown email through a template for QA.',
      inputSchema: {
        subject: z.string().min(1),
        bodyMarkdown: z.string().min(1),
        preview: z.string().optional(),
        template: z.string().optional(),
      },
    },
    async (input) =>
      result(
        await renderDraftEmail({
          subject: input.subject,
          bodyMarkdown: input.bodyMarkdown,
          ...(input.preview ? { preview: input.preview } : {}),
          ...(input.template ? { template: input.template } : {}),
        }),
      ),
  )
}
