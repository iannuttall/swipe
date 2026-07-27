import type { EmailPlatform } from '@email/core'
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js'
import { z } from 'zod'

type ResultWriter = (data: object, isError?: boolean) => CallToolResult

export function registerConfirmationTools(
  server: McpServer,
  platform: EmailPlatform,
  result: ResultWriter,
): void {
  server.registerTool(
    'email_prepare_confirmations',
    {
      title: 'Prepare Migration Confirmations',
      description:
        'Create idempotent confirmation requests for the active migration audience.',
      inputSchema: {
        confirm: z.boolean(),
        batchKey: z.string().min(3).max(80),
        expiresAt: z.string().datetime(),
        source: z.string().max(120).optional(),
      },
    },
    async (input) => {
      if (!input.confirm) return result({ error: 'confirm must be true' }, true)
      return result(
        await platform.prepareMigrationConfirmations({
          batchKey: input.batchKey,
          expiresAt: new Date(input.expiresAt),
          ...(input.source ? { source: input.source } : {}),
        }),
      )
    },
  )

  server.registerTool(
    'email_get_confirmation_report',
    {
      title: 'Get Confirmation Report',
      description: 'Return confirmation totals for one purpose and optional batch.',
      inputSchema: {
        purpose: z.enum(['double_opt_in', 'swipe_migration']),
        batchKey: z.string().min(3).max(80).optional(),
      },
    },
    async (input) =>
      result(
        await platform.getConfirmationReport({
          purpose: input.purpose,
          ...(input.batchKey ? { batchKey: input.batchKey } : {}),
        }),
      ),
  )

  server.registerTool(
    'email_unsubscribe_unconfirmed_migration',
    {
      title: 'Unsubscribe Unconfirmed Migration Contacts',
      description:
        'Preview or execute removal of active contacts with an expired unconfirmed request in one migration batch.',
      inputSchema: {
        confirm: z.boolean(),
        batchKey: z.string().min(3).max(80),
        expiredBefore: z.string().datetime(),
        source: z.string().max(120).optional(),
      },
    },
    async (input) =>
      result(
        await platform.unsubscribeUnconfirmedMigration({
          batchKey: input.batchKey,
          expiredBefore: new Date(input.expiredBefore),
          execute: input.confirm,
          ...(input.source ? { source: input.source } : {}),
        }),
      ),
  )
}
