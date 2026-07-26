import { readFile, writeFile } from 'node:fs/promises'
import { pathToFileURL } from 'node:url'
import { serveApi } from '@email/api'
import {
  type AudienceFilter,
  createEmailPlatformRuntime,
  type DeliveryPolicyInput,
  type DraftInput,
  type EmailPlatform,
  loadConfig,
  type RecipientStatus,
  runMigrations,
  runSendWorker,
  runSendWorkerOnce,
} from '@email/core'
import { startMcpStdio } from '@email/mcp'
import {
  getBooleanFlag,
  getNumberFlag,
  getStringFlag,
  type ParsedArgs,
  parseArgs,
} from './args.js'
import { parseCanarySteps } from './canary-steps.js'
import { gmailAliases } from './gmail-aliases.js'
import { usage } from './help.js'
import { seedGmailSubscriberIntelligence } from './seed-intelligence.js'
import { runTemplateCommand } from './template-commands.js'

export const version = '0.1.0'

interface CliIo {
  stdout?: (text: string) => void
  stderr?: (text: string) => void
}

export interface CliRunInput extends CliIo {
  env?: NodeJS.ProcessEnv
  platform?: EmailPlatform
}

class CliError extends Error {
  constructor(
    message: string,
    readonly exitCode = 2,
  ) {
    super(message)
  }
}

export async function runCli(
  argv = process.argv.slice(2),
  input: CliRunInput = {},
): Promise<number> {
  const parsed = parseArgs(argv)
  const writeOut = input.stdout ?? ((text) => process.stdout.write(text))
  const writeErr = input.stderr ?? ((text) => process.stderr.write(text))
  const json = getBooleanFlag(parsed, 'json')

  try {
    const result = await dispatch(parsed, input)
    if (result !== undefined) {
      writeResult(result, json, writeOut)
    }
    return 0
  } catch (error) {
    const message = formatError(error)
    if (json) {
      writeOut(`${JSON.stringify({ ok: false, error: message })}\n`)
    } else {
      writeErr(`${message}\n`)
    }
    return error instanceof CliError ? error.exitCode : 1
  }
}

function formatError(error: unknown): string {
  if (!(error instanceof Error)) return 'Unknown error'
  const cause = error.cause
  if (cause instanceof Error && cause.message && !error.message.includes(cause.message)) {
    return `${error.message}\ncaused by: ${cause.message}`
  }
  return error.message
}

async function dispatch(parsed: ParsedArgs, input: CliRunInput): Promise<unknown> {
  const [area, action] = parsed.positionals
  if (!area || area === 'help' || getBooleanFlag(parsed, 'help')) {
    return usage(loadConfig(input.env).appName, version)
  }

  if (area === 'api' && action === 'serve') {
    const config = loadConfig(input.env)
    const port =
      getNumberFlag(parsed, 'port') ??
      Number.parseInt(input.env?.PORT ?? process.env.PORT ?? '3000', 10)
    serveApi({ config, port })
    return { ok: true, port }
  }

  if (area === 'mcp' && action === 'serve') {
    await startMcpStdio({ config: loadConfig(input.env) })
    return { ok: true, transport: 'stdio' }
  }

  if (area === 'db' && action === 'migrate') {
    const config = loadConfig(input.env)
    return runMigrations({
      databaseUrl: config.databaseUrl,
      ...(getStringFlag(parsed, 'dir')
        ? { migrationsDir: mustString(parsed, 'dir') }
        : {}),
    })
  }

  const templateResult = await runTemplateCommand(parsed)
  if (templateResult) return templateResult

  const runtime = input.platform
    ? { platform: input.platform, close: async () => {} }
    : createEmailPlatformRuntime({ config: loadConfig(input.env) })
  const platform = runtime.platform

  try {
    if (area === 'doctor') {
      return await platform.doctor()
    }

    if (area === 'ops' && action === 'checklist') {
      return await platform.getProductionOpsChecklist()
    }

    if (area === 'ops' && action === 'queue') {
      const since = getStringFlag(parsed, 'since')
      return await platform.getQueueSummary({
        ...(getNumberFlag(parsed, 'stale-after-ms') !== undefined
          ? { staleAfterMs: mustNumber(parsed, 'stale-after-ms') }
          : {}),
        ...(since ? { since: new Date(since) } : {}),
      })
    }

    if (area === 'ops' && action === 'recover-stuck') {
      if (!getBooleanFlag(parsed, 'yes')) {
        throw new CliError('Refusing to recover stuck messages without --yes')
      }
      return await platform.recoverStuckMessages({
        ...(getNumberFlag(parsed, 'stale-after-ms') !== undefined
          ? { staleAfterMs: mustNumber(parsed, 'stale-after-ms') }
          : {}),
        limit: getNumberFlag(parsed, 'limit') ?? 100,
      })
    }

    if (area === 'subscribe') {
      const email = parsed.positionals[1] ?? getStringFlag(parsed, 'email')
      if (!email) throw new CliError('Missing email')
      return await platform.subscribe({
        email,
        ...(getStringFlag(parsed, 'name') ? { name: mustString(parsed, 'name') } : {}),
        ...(getStringFlag(parsed, 'source')
          ? { source: mustString(parsed, 'source') }
          : {}),
      })
    }

    if (area === 'draft' && action === 'create') {
      return await platform.createDraft(await draftInput(parsed))
    }

    if (area === 'broadcast' && action === 'preview-plan') {
      const scheduledAt = getStringFlag(parsed, 'scheduled-at')
      const audience = await audienceInput(parsed)
      const deliveryPolicy = await deliveryPolicyInput(parsed)
      return await platform.previewSendPlan({
        ...(audience ? { audience } : {}),
        ...(deliveryPolicy ? { deliveryPolicy } : {}),
        ...(scheduledAt ? { scheduledAt: new Date(scheduledAt) } : {}),
        ...(getNumberFlag(parsed, 'sample-limit') !== undefined
          ? { sampleLimit: mustNumber(parsed, 'sample-limit') }
          : {}),
      })
    }

    if (area === 'broadcast' && action === 'create') {
      const draftId = getStringFlag(parsed, 'draft-id')
      if (!draftId) throw new CliError('Missing --draft-id')
      const scheduledAt = getStringFlag(parsed, 'scheduled-at')
      const audience = await audienceInput(parsed)
      const deliveryPolicy = await deliveryPolicyInput(parsed)
      return await platform.createBroadcast({
        draftId,
        ...(getStringFlag(parsed, 'name') ? { name: mustString(parsed, 'name') } : {}),
        ...(audience ? { audience } : {}),
        ...(deliveryPolicy ? { deliveryPolicy } : {}),
        ...(scheduledAt ? { scheduledAt: new Date(scheduledAt) } : {}),
      })
    }

    if (area === 'canary' && action === 'create') {
      const draftId = getStringFlag(parsed, 'draft-id')
      if (!draftId) throw new CliError('Missing --draft-id')
      const scheduledAt = getStringFlag(parsed, 'scheduled-at')
      const audience = await audienceInput(parsed)
      const deliveryPolicy = await deliveryPolicyInput(parsed)
      return await platform.createCanary({
        draftId,
        ...(getStringFlag(parsed, 'name') ? { name: mustString(parsed, 'name') } : {}),
        ...(audience ? { audience } : {}),
        ...(deliveryPolicy ? { deliveryPolicy } : {}),
        ...(getStringFlag(parsed, 'steps')
          ? { steps: parseCanarySteps(mustString(parsed, 'steps')) }
          : {}),
        ...(scheduledAt ? { scheduledAt: new Date(scheduledAt) } : {}),
      })
    }

    if (area === 'canary' && action === 'promote') {
      const id = parsed.positionals[2] ?? getStringFlag(parsed, 'id')
      if (!id) throw new CliError('Missing canary id')
      const scheduledAt = getStringFlag(parsed, 'scheduled-at')
      return await platform.promoteCanary({
        id,
        ...(getNumberFlag(parsed, 'step-index') !== undefined
          ? { stepIndex: mustNumber(parsed, 'step-index') }
          : {}),
        ...(scheduledAt ? { scheduledAt: new Date(scheduledAt) } : {}),
      })
    }

    if (area === 'canary' && action === 'get') {
      const id = parsed.positionals[2] ?? getStringFlag(parsed, 'id')
      if (!id) throw new CliError('Missing canary id')
      return await platform.getCanary(id)
    }

    if (area === 'broadcast' && action === 'list') {
      return await platform.listBroadcasts({
        limit: getNumberFlag(parsed, 'limit') ?? 50,
      })
    }

    if (area === 'broadcast' && action === 'get') {
      const id = parsed.positionals[2] ?? getStringFlag(parsed, 'id')
      if (!id) throw new CliError('Missing broadcast id')
      return await platform.getBroadcast(id)
    }

    if (area === 'broadcast' && action === 'stats') {
      const id = parsed.positionals[2] ?? getStringFlag(parsed, 'id')
      if (!id) throw new CliError('Missing broadcast id')
      return await platform.getBroadcastStats(id)
    }

    if (area === 'broadcast' && action === 'links') {
      const id = parsed.positionals[2] ?? getStringFlag(parsed, 'id')
      if (!id) throw new CliError('Missing broadcast id')
      return await platform.getBroadcastLinkStats(id)
    }

    if (area === 'broadcast' && action === 'events') {
      const id = parsed.positionals[2] ?? getStringFlag(parsed, 'id')
      if (!id) throw new CliError('Missing broadcast id')
      return await platform.listBroadcastEvents({
        broadcastId: id,
        limit: getNumberFlag(parsed, 'limit') ?? 100,
      })
    }

    if (area === 'broadcast' && action === 'pause') {
      const id = parsed.positionals[2] ?? getStringFlag(parsed, 'id')
      if (!id) throw new CliError('Missing broadcast id')
      return await platform.pauseBroadcast(id)
    }

    if (area === 'broadcast' && action === 'resume') {
      const id = parsed.positionals[2] ?? getStringFlag(parsed, 'id')
      if (!id) throw new CliError('Missing broadcast id')
      return await platform.resumeBroadcast(id)
    }

    if (area === 'broadcast' && action === 'cancel') {
      const id = parsed.positionals[2] ?? getStringFlag(parsed, 'id')
      if (!id) throw new CliError('Missing broadcast id')
      return await platform.cancelBroadcast(id)
    }

    if (area === 'broadcast' && action === 'test') {
      if (!getBooleanFlag(parsed, 'yes')) {
        throw new CliError('Refusing to send test without --yes')
      }
      const draftId = getStringFlag(parsed, 'draft-id')
      const to = getStringFlag(parsed, 'to')
      const status = getStringFlag(parsed, 'status')
      if (!draftId) throw new CliError('Missing --draft-id')
      if (!to) throw new CliError('Missing --to')
      if (status && status !== 'new' && status !== 'warm' && status !== 'cold') {
        throw new CliError('Invalid --status; expected new, warm, or cold')
      }
      const recipientStatus = status as RecipientStatus | undefined
      return await platform.sendTest({
        draftId,
        to,
        ...(recipientStatus ? { status: recipientStatus } : {}),
      })
    }

    if (area === 'provider' && action === 'ses-simulator') {
      if (!getBooleanFlag(parsed, 'yes')) {
        throw new CliError('Refusing to send SES simulator test without --yes')
      }
      const draftId = getStringFlag(parsed, 'draft-id')
      const type = getStringFlag(parsed, 'type')
      if (!draftId) throw new CliError('Missing --draft-id')
      if (
        type !== 'success' &&
        type !== 'bounce' &&
        type !== 'complaint' &&
        type !== 'ooto' &&
        type !== 'suppression'
      ) {
        throw new CliError('Missing or invalid --type')
      }
      return await platform.sendSesSimulator({ draftId, type })
    }

    if (area === 'message' && action === 'retry-failed') {
      if (!getBooleanFlag(parsed, 'yes')) {
        throw new CliError('Refusing to retry failed messages without --yes')
      }
      const scheduledAt = getStringFlag(parsed, 'scheduled-at')
      return await platform.retryFailedMessages({
        ...(getStringFlag(parsed, 'broadcast-id')
          ? { broadcastId: mustString(parsed, 'broadcast-id') }
          : {}),
        ...(scheduledAt ? { scheduledAt: new Date(scheduledAt) } : {}),
        limit: getNumberFlag(parsed, 'limit') ?? 100,
      })
    }

    if (area === 'contact' && action === 'analytics') {
      const emailOrId = parsed.positionals[2] ?? getStringFlag(parsed, 'contact')
      if (!emailOrId) throw new CliError('Missing contact email or id')
      return await platform.getContactAnalytics({
        emailOrId,
        limit: getNumberFlag(parsed, 'limit') ?? 100,
      })
    }

    if (area === 'contact' && action === 'unsubscribe') {
      const emailOrId = parsed.positionals[2] ?? getStringFlag(parsed, 'contact')
      if (!emailOrId) throw new CliError('Missing contact email or id')
      return await platform.unsubscribeContact({
        emailOrId,
        ...(getStringFlag(parsed, 'broadcast-id')
          ? { broadcastId: mustString(parsed, 'broadcast-id') }
          : {}),
        ...(getStringFlag(parsed, 'source')
          ? { source: mustString(parsed, 'source') }
          : {}),
      })
    }

    if (area === 'contact' && action === 'recent') {
      const days = getNumberFlag(parsed, 'days') ?? 7
      if (days < 1 || days > 365) {
        throw new CliError('--days must be between 1 and 365')
      }
      return await platform.recentContacts({
        days,
        limit: getNumberFlag(parsed, 'limit') ?? 1000,
      })
    }

    if (area === 'contact' && action === 'export') {
      const result = await platform.exportContacts({
        limit: getNumberFlag(parsed, 'limit') ?? 10_000,
      })
      const out = getStringFlag(parsed, 'out')
      if (out) {
        await writeFile(out, `${JSON.stringify(result, null, 2)}\n`)
        return { ok: true, out, contacts: result.contacts.length }
      }
      return result
    }

    if (area === 'contact' && action === 'import') {
      const file = getStringFlag(parsed, 'file')
      if (!file) throw new CliError('Missing --file')
      return await platform.importContacts(
        JSON.parse(await readFile(file, 'utf8')) as never,
      )
    }

    if (area === 'contact' && action === 'seed-aliases') {
      const email = getStringFlag(parsed, 'email')
      if (!email) throw new CliError('Missing --email')
      const count = getNumberFlag(parsed, 'count') ?? 20
      if (count < 1 || count > 1000) {
        throw new CliError('--count must be between 1 and 1000')
      }
      const aliases = gmailAliases({
        email,
        count,
        start: getNumberFlag(parsed, 'start') ?? 1,
        width: getNumberFlag(parsed, 'width') ?? 3,
        prefix: getStringFlag(parsed, 'prefix') ?? 'email',
      })
      const imported = await platform.importContacts({
        contacts: aliases.map((alias) => ({
          email: alias,
          source: getStringFlag(parsed, 'source') ?? 'local-test',
        })),
      })
      return { ...imported, contacts: aliases }
    }

    if (area === 'contact' && action === 'seed-intelligence') {
      const email = getStringFlag(parsed, 'email')
      if (!email) throw new CliError('Missing --email')
      const count = getNumberFlag(parsed, 'count') ?? 20
      if (count < 1 || count > 1000) {
        throw new CliError('--count must be between 1 and 1000')
      }
      return await seedGmailSubscriberIntelligence(platform, {
        email,
        count,
        start: getNumberFlag(parsed, 'start') ?? 1,
        width: getNumberFlag(parsed, 'width') ?? 3,
        prefix: getStringFlag(parsed, 'prefix') ?? 'intel',
        source: getStringFlag(parsed, 'source') ?? 'local-intelligence-test',
      })
    }

    if (area === 'contact' && action === 'tag') {
      const emailOrId = parsed.positionals[2] ?? getStringFlag(parsed, 'contact')
      if (!emailOrId) throw new CliError('Missing contact email or id')
      const tagKey = getStringFlag(parsed, 'tag')
      if (!tagKey) throw new CliError('Missing --tag')
      return await platform.tagContact({
        emailOrId,
        tagKey,
        ...(getStringFlag(parsed, 'name') ? { name: mustString(parsed, 'name') } : {}),
        ...(getStringFlag(parsed, 'source')
          ? { source: mustString(parsed, 'source') }
          : {}),
        ...(getStringFlag(parsed, 'metadata-file')
          ? { metadata: await readJsonFile(mustString(parsed, 'metadata-file')) }
          : {}),
      })
    }

    if (area === 'contact' && action === 'untag') {
      const emailOrId = parsed.positionals[2] ?? getStringFlag(parsed, 'contact')
      if (!emailOrId) throw new CliError('Missing contact email or id')
      const tagKey = getStringFlag(parsed, 'tag')
      if (!tagKey) throw new CliError('Missing --tag')
      return await platform.untagContact({ emailOrId, tagKey })
    }

    if (area === 'contact' && action === 'tags') {
      const emailOrId = parsed.positionals[2] ?? getStringFlag(parsed, 'contact')
      if (!emailOrId) throw new CliError('Missing contact email or id')
      return await platform.listContactTags({ emailOrId })
    }

    if (area === 'contact' && action === 'external-id') {
      const emailOrId = parsed.positionals[2] ?? getStringFlag(parsed, 'contact')
      if (!emailOrId) throw new CliError('Missing contact email or id')
      const provider = getStringFlag(parsed, 'provider')
      const externalId = getStringFlag(parsed, 'external-id')
      if (!provider) throw new CliError('Missing --provider')
      if (!externalId) throw new CliError('Missing --external-id')
      return await platform.upsertContactExternalId({
        emailOrId,
        provider,
        externalId,
        ...(getStringFlag(parsed, 'label') ? { label: mustString(parsed, 'label') } : {}),
        ...(getStringFlag(parsed, 'metadata-file')
          ? { metadata: await readJsonFile(mustString(parsed, 'metadata-file')) }
          : {}),
      })
    }

    if (area === 'contact' && action === 'value') {
      const emailOrId = parsed.positionals[2] ?? getStringFlag(parsed, 'contact')
      if (!emailOrId) throw new CliError('Missing contact email or id')
      return await platform.getContactValue({ emailOrId })
    }

    if (area === 'contact' && action === 'links') {
      const emailOrId = parsed.positionals[2] ?? getStringFlag(parsed, 'contact')
      if (!emailOrId) throw new CliError('Missing contact email or id')
      return await platform.getContactLinkInsights({
        emailOrId,
        limit: getNumberFlag(parsed, 'limit') ?? 100,
      })
    }

    if (area === 'contact' && action === 'topics') {
      const emailOrId = parsed.positionals[2] ?? getStringFlag(parsed, 'contact')
      if (!emailOrId) throw new CliError('Missing contact email or id')
      return await platform.getContactTopicInsights({
        emailOrId,
        limit: getNumberFlag(parsed, 'limit') ?? 100,
      })
    }

    if (area === 'analytics' && action === 'links') {
      return await platform.getLinkInsights({
        ...(getStringFlag(parsed, 'broadcast-id')
          ? { broadcastId: mustString(parsed, 'broadcast-id') }
          : {}),
        ...(getStringFlag(parsed, 'topic') ? { topic: mustString(parsed, 'topic') } : {}),
        ...(getStringFlag(parsed, 'tag') ? { tag: mustString(parsed, 'tag') } : {}),
        ...(getStringFlag(parsed, 'sponsor')
          ? { sponsor: mustString(parsed, 'sponsor') }
          : {}),
        limit: getNumberFlag(parsed, 'limit') ?? 100,
      })
    }

    if (area === 'analytics' && action === 'link-summary') {
      return await platform.getLinkSummaryInsights({
        ...(getStringFlag(parsed, 'broadcast-id')
          ? { broadcastId: mustString(parsed, 'broadcast-id') }
          : {}),
        ...(getStringFlag(parsed, 'topic') ? { topic: mustString(parsed, 'topic') } : {}),
        ...(getStringFlag(parsed, 'tag') ? { tag: mustString(parsed, 'tag') } : {}),
        ...(getStringFlag(parsed, 'sponsor')
          ? { sponsor: mustString(parsed, 'sponsor') }
          : {}),
        limit: getNumberFlag(parsed, 'limit') ?? 100,
      })
    }

    if (area === 'analytics' && action === 'rebuild-rollups') {
      if (!getBooleanFlag(parsed, 'yes')) {
        throw new CliError('Refusing to rebuild analytics rollups without --yes')
      }
      return await platform.rebuildAnalyticsRollups()
    }

    if (area === 'purchase' && action === 'record') {
      const productKey = getStringFlag(parsed, 'product-key')
      const amountCents = getNumberFlag(parsed, 'amount-cents')
      const currency = getStringFlag(parsed, 'currency')
      if (!productKey) throw new CliError('Missing --product-key')
      if (amountCents === undefined) throw new CliError('Missing --amount-cents')
      if (!currency) throw new CliError('Missing --currency')
      const purchasedAt = getStringFlag(parsed, 'purchased-at')
      return await platform.recordPurchase({
        ...(getStringFlag(parsed, 'email') ? { email: mustString(parsed, 'email') } : {}),
        ...(getStringFlag(parsed, 'contact-id')
          ? { contactId: mustString(parsed, 'contact-id') }
          : {}),
        ...(getStringFlag(parsed, 'provider')
          ? { provider: mustString(parsed, 'provider') }
          : {}),
        ...(getStringFlag(parsed, 'external-id')
          ? { externalId: mustString(parsed, 'external-id') }
          : {}),
        ...(getStringFlag(parsed, 'idempotency-key')
          ? { idempotencyKey: mustString(parsed, 'idempotency-key') }
          : {}),
        productKey,
        ...(getStringFlag(parsed, 'product-name')
          ? { productName: mustString(parsed, 'product-name') }
          : {}),
        amountCents,
        currency,
        ...(purchasedAt ? { purchasedAt: new Date(purchasedAt) } : {}),
        ...(getStringFlag(parsed, 'metadata-file')
          ? { metadata: await readJsonFile(mustString(parsed, 'metadata-file')) }
          : {}),
      })
    }

    if (area === 'audience' && action === 'preview') {
      return await platform.previewAudience(await audienceInput(parsed))
    }

    if (area === 'send' && action === 'due') {
      if (!getBooleanFlag(parsed, 'yes')) {
        throw new CliError('Refusing to send without --yes')
      }
      const now = getStringFlag(parsed, 'now')
      return await platform.sendDue(
        now ? new Date(now) : new Date(),
        getNumberFlag(parsed, 'limit'),
      )
    }

    if (area === 'worker' && action === 'send') {
      if (!getBooleanFlag(parsed, 'yes')) {
        throw new CliError('Refusing to run worker without --yes')
      }
      if (getBooleanFlag(parsed, 'once')) {
        const batchSize = getNumberFlag(parsed, 'batch-size')
        return await runSendWorkerOnce({
          platform,
          ...(batchSize ? { batchSize } : {}),
        })
      }
      const batchSize = getNumberFlag(parsed, 'batch-size')
      const intervalMs = getNumberFlag(parsed, 'interval-ms')
      return await runSendWorker({
        platform,
        ...(batchSize ? { batchSize } : {}),
        ...(intervalMs ? { intervalMs } : {}),
        onResult: (result) => {
          process.stdout.write(`${JSON.stringify({ ok: true, data: result })}\n`)
        },
      })
    }

    throw new CliError(`Unknown command: ${parsed.positionals.join(' ')}`)
  } finally {
    await runtime.close()
  }
}

async function draftInput(parsed: ParsedArgs): Promise<DraftInput> {
  const subject = getStringFlag(parsed, 'subject')
  if (!subject) throw new CliError('Missing --subject')
  const bodyMarkdown =
    getStringFlag(parsed, 'body') ??
    (getStringFlag(parsed, 'body-file')
      ? await readFile(mustString(parsed, 'body-file'), 'utf8')
      : undefined)
  if (!bodyMarkdown) throw new CliError('Missing --body or --body-file')
  return {
    subject,
    bodyMarkdown,
    ...(getStringFlag(parsed, 'metadata-file')
      ? {
          metadata: JSON.parse(
            await readFile(mustString(parsed, 'metadata-file'), 'utf8'),
          ),
        }
      : {}),
    ...(getStringFlag(parsed, 'name') ? { name: mustString(parsed, 'name') } : {}),
    ...(getStringFlag(parsed, 'preview')
      ? { preview: mustString(parsed, 'preview') }
      : {}),
    ...(getStringFlag(parsed, 'from-email')
      ? { fromEmail: mustString(parsed, 'from-email') }
      : {}),
    ...(getStringFlag(parsed, 'from-name')
      ? { fromName: mustString(parsed, 'from-name') }
      : {}),
    ...(getStringFlag(parsed, 'reply-to')
      ? { replyTo: mustString(parsed, 'reply-to') }
      : {}),
    ...(getStringFlag(parsed, 'template')
      ? { template: mustString(parsed, 'template') }
      : {}),
  }
}

async function audienceInput(parsed: ParsedArgs): Promise<AudienceFilter | undefined> {
  const fromFile = getStringFlag(parsed, 'audience-file')
    ? ((await readJsonFile(mustString(parsed, 'audience-file'))) as AudienceFilter)
    : {}
  const audience: AudienceFilter = {
    ...fromFile,
    ...stringListFlag(parsed, 'contact-id', 'contactIds'),
    ...stringListFlag(parsed, 'exclude-contact-id', 'excludeContactIds'),
    ...stringListFlag(parsed, 'contact-tag', 'contactTags'),
    ...stringListFlag(parsed, 'exclude-contact-tag', 'excludeContactTags'),
    ...stringListFlag(parsed, 'topic', 'linkTopics'),
    ...stringListFlag(parsed, 'exclude-topic', 'excludeLinkTopics'),
    ...stringListFlag(parsed, 'link-tag', 'linkTags'),
    ...stringListFlag(parsed, 'exclude-link-tag', 'excludeLinkTags'),
    ...(getStringFlag(parsed, 'sponsor')
      ? { sponsor: mustString(parsed, 'sponsor') }
      : {}),
    ...stringListFlag(parsed, 'purchased-product', 'purchasedProductKeys'),
    ...stringListFlag(parsed, 'exclude-purchased-product', 'excludePurchasedProductKeys'),
    ...(getNumberFlag(parsed, 'min-ltv-cents') !== undefined
      ? { minLifetimeValueCents: mustNumber(parsed, 'min-ltv-cents') }
      : {}),
    ...(getNumberFlag(parsed, 'max-ltv-cents') !== undefined
      ? { maxLifetimeValueCents: mustNumber(parsed, 'max-ltv-cents') }
      : {}),
    ...(getStringFlag(parsed, 'currency')
      ? { currency: mustString(parsed, 'currency') }
      : {}),
    ...(getNumberFlag(parsed, 'limit') !== undefined
      ? { limit: mustNumber(parsed, 'limit') }
      : {}),
  }
  return Object.keys(audience).length > 0 ? audience : undefined
}

async function deliveryPolicyInput(
  parsed: ParsedArgs,
): Promise<DeliveryPolicyInput | undefined> {
  const fromFile = getStringFlag(parsed, 'delivery-file')
    ? ((await readJsonFile(mustString(parsed, 'delivery-file'))) as DeliveryPolicyInput)
    : {}
  const startAt = getStringFlag(parsed, 'delivery-start-at')
  const policy = {
    ...fromFile,
    ...(getStringFlag(parsed, 'delivery-strategy')
      ? { strategy: mustDeliveryStrategy(parsed) }
      : {}),
    ...(getNumberFlag(parsed, 'batch-size') !== undefined
      ? { batchSize: mustNumber(parsed, 'batch-size') }
      : {}),
    ...(getNumberFlag(parsed, 'batch-duration-minutes') !== undefined
      ? { batchDurationMinutes: mustNumber(parsed, 'batch-duration-minutes') }
      : {}),
    ...(getNumberFlag(parsed, 'duration-hours') !== undefined
      ? { durationHours: mustNumber(parsed, 'duration-hours') }
      : {}),
    ...(startAt ? { startAt: new Date(startAt) } : {}),
  }
  return Object.keys(policy).length > 0 ? (policy as DeliveryPolicyInput) : undefined
}

async function readJsonFile(path: string): Promise<Record<string, unknown>> {
  return JSON.parse(await readFile(path, 'utf8')) as Record<string, unknown>
}

function stringListFlag<K extends keyof AudienceFilter>(
  parsed: ParsedArgs,
  flag: string,
  key: K,
): Pick<AudienceFilter, K> {
  const value = getStringFlag(parsed, flag)
  if (!value) return {} as Pick<AudienceFilter, K>
  return {
    [key]: value
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean),
  } as Pick<AudienceFilter, K>
}

function mustString(parsed: ParsedArgs, name: string): string {
  const value = getStringFlag(parsed, name)
  if (!value) throw new CliError(`Missing --${name}`)
  return value
}

function mustNumber(parsed: ParsedArgs, name: string): number {
  const value = getNumberFlag(parsed, name)
  if (value === undefined) throw new CliError(`Missing --${name}`)
  return value
}

function mustDeliveryStrategy(parsed: ParsedArgs): DeliveryPolicyInput['strategy'] {
  const value = mustString(parsed, 'delivery-strategy')
  if (value !== 'steady' && value !== 'duration' && value !== 'warm_first') {
    throw new CliError('Invalid --delivery-strategy')
  }
  return value
}

function writeResult(
  result: unknown,
  json: boolean,
  writeOut: NonNullable<CliIo['stdout']>,
) {
  if (typeof result === 'string') {
    writeOut(result)
    return
  }
  if (json) {
    writeOut(`${JSON.stringify({ ok: true, data: result })}\n`)
    return
  }
  writeOut(`${JSON.stringify(result, null, 2)}\n`)
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  process.exitCode = await runCli()
}
