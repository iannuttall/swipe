import type { SendPlanPreview } from './broadcast-planning.js'
import { planBroadcastSend, previewBroadcastSendPlan } from './broadcast-planning.js'
import {
  createCanaryCampaign,
  getCanaryState,
  promoteCanaryCampaign,
} from './canary-service.js'
import type { AppConfig } from './config.js'
import { requireSecret } from './config.js'
import {
  subscribeContact,
  unsubscribeContact as unsubscribeContactByOperator,
} from './contact-consent.js'
import type {
  CanaryState,
  ContactAnalytics,
  ContactExport,
  ContactImport,
  EmailPlatform,
  QueueSummaryRequest,
  RecentContacts,
  RecoverStuckInput,
  SendDueResult,
  SesSimulatorType,
  TrackingRequest,
} from './platform-contracts.js'
import { buildProductionOpsChecklist } from './production-ops.js'
import type { EmailProvider } from './providers.js'
import type { DoctorReport } from './readiness.js'
import { emptyEngagement, recipientStatusFromMessage } from './recipient-engagement.js'
import { renderDraftEmail } from './render.js'
import { ProviderAcceptedPersistenceError } from './send-errors.js'
import { createProviderSendThrottle } from './send-rate.js'
import type { NormalizedProviderEvent } from './ses-webhooks.js'
import type {
  BroadcastRecord,
  BroadcastStats,
  ContactLinkInsight,
  ContactRecord,
  ContactTopicInsight,
  EmailStore,
  EventRecord,
  LinkInsight,
  LinkStats,
  LinkSummaryInsight,
  MessageRecord,
  QueueSummary,
} from './store.js'
import {
  type AudienceFilter,
  type AudiencePreview,
  type ContactExternalIdRecord,
  type ContactTagRecord,
  type ContactValueRecord,
  normalizeAudience,
  type PurchaseRecord,
  type RollupRebuildResult,
} from './subscriber-intelligence.js'
import { rewriteTrackedLinks } from './tracked-links.js'
import {
  classifyTrackingRequest,
  createTrackingToken,
  injectOpenPixel,
  ipHash,
  replaceUnsubscribeUrl,
  tokenHash,
  verifyTrackingToken,
} from './tracking.js'
import type { DeliveryPolicyInput, DraftInput, RecipientStatus } from './types.js'

export type * from './platform-contracts.js'

export class CoreEmailPlatform implements EmailPlatform {
  constructor(
    private readonly deps: {
      store: EmailStore
      provider: EmailProvider
      config: AppConfig
    },
  ) {}

  async subscribe(input: {
    email: string
    name?: string
    source?: string
  }): Promise<{ id: string }> {
    return subscribeContact(this.deps.store, input)
  }

  async unsubscribeContact(input: {
    emailOrId: string
    broadcastId?: string
    source?: string
  }): Promise<{ unsubscribed: boolean; contactId: string; email: string }> {
    return unsubscribeContactByOperator(this.deps.store, input)
  }

  async recentContacts(
    input: { days?: number; limit?: number } = {},
  ): Promise<RecentContacts> {
    const days = input.days ?? 7
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000)
    const found = await this.deps.store.listRecentContacts({
      since,
      limit: input.limit ?? 1000,
    })
    const contacts = found.map((contact) => ({
      email: contact.email,
      ...(contact.name ? { name: contact.name } : {}),
      ...(contact.source ? { source: contact.source } : {}),
      status: contact.status,
      ...(contact.subscribedAt
        ? { subscribedAt: contact.subscribedAt.toISOString() }
        : {}),
    }))
    return { since: since.toISOString(), days, signups: contacts.length, contacts }
  }

  async exportContacts(input: { limit?: number } = {}): Promise<ContactExport> {
    const contacts = await this.deps.store.listContacts({
      limit: input.limit ?? 10_000,
    })
    const suppressions = await this.deps.store.listSuppressions({
      limit: input.limit ?? 10_000,
    })
    return {
      contacts,
      suppressions: suppressions.map((suppression) => ({
        ...(suppression.email ? { email: suppression.email } : {}),
        ...(suppression.domain ? { domain: suppression.domain } : {}),
        reason: suppression.reason,
        ...(suppression.description ? { description: suppression.description } : {}),
        source: suppression.source,
      })),
    }
  }

  async importContacts(input: ContactImport): Promise<{
    imported: number
    suppressed: number
  }> {
    let imported = 0
    let suppressed = 0
    for (const contact of input.contacts) {
      await this.deps.store.upsertContact({
        email: contact.email,
        ...(contact.name ? { name: contact.name } : {}),
        ...(contact.attributes ? { attributes: contact.attributes } : {}),
        source: contact.source ?? 'import',
      })
      imported += 1
    }
    for (const suppression of input.suppressions ?? []) {
      await this.deps.store.addSuppression({
        ...(suppression.email ? { email: suppression.email } : {}),
        ...(suppression.domain ? { domain: suppression.domain } : {}),
        reason: normalizeSuppressionReason(suppression.reason),
        ...(suppression.description ? { description: suppression.description } : {}),
        source: suppression.source ?? 'import',
      })
      suppressed += 1
    }
    return { imported, suppressed }
  }

  async doctor(): Promise<DoctorReport> {
    const snsTopicAllowlistConfigured = this.deps.config.aws.snsAllowedTopics.length > 0
    const report = {
      appName: this.deps.config.appName,
      env: this.deps.config.env,
      provider: this.deps.config.provider,
      baseUrl: this.deps.config.baseUrl,
      databaseConfigured: Boolean(this.deps.config.databaseUrl),
      fromEmailConfigured: Boolean(this.deps.config.email.fromEmail),
      apiAuthConfigured: Boolean(this.deps.config.apiToken),
      trackingConfigured: Boolean(this.deps.config.trackingSecret),
      unsubscribeConfigured: Boolean(this.deps.config.unsubscribeSecret),
      snsWebhookConfigured: Boolean(this.deps.config.aws.snsWebhookSecret),
      snsTopicAllowlistConfigured,
    }
    const sesReady =
      report.provider !== 'ses' ||
      (report.snsWebhookConfigured && snsTopicAllowlistConfigured)
    return {
      ...report,
      ready: [
        report.databaseConfigured,
        report.fromEmailConfigured,
        report.apiAuthConfigured,
        report.trackingConfigured,
        report.unsubscribeConfigured,
        sesReady,
      ].every(Boolean),
    }
  }

  async getProductionOpsChecklist() {
    return buildProductionOpsChecklist({
      config: this.deps.config,
      doctor: await this.doctor(),
    })
  }

  async createDraft(input: DraftInput): Promise<{ id: string }> {
    const draft = await this.deps.store.createDraft(input)
    return { id: draft.id }
  }

  async tagContact(input: {
    emailOrId: string
    tagKey: string
    name?: string
    source?: string
    metadata?: Record<string, unknown>
  }): Promise<ContactTagRecord> {
    const contact = await this.requireContact(input.emailOrId)
    const tag = await this.deps.store.tagContact({
      contactId: contact.id,
      tagKey: input.tagKey,
      ...(input.name ? { name: input.name } : {}),
      source: input.source ?? 'api',
      ...(input.metadata ? { metadata: input.metadata } : {}),
    })
    await this.deps.store.recordEvent({
      type: 'contact.tagged',
      contactId: contact.id,
      source: input.source ?? 'api',
      metadata: {
        tagKey: tag.tagKey,
        ...(input.metadata ? { metadata: input.metadata } : {}),
      },
    })
    return tag
  }

  async untagContact(input: {
    emailOrId: string
    tagKey: string
  }): Promise<{ removed: boolean }> {
    const contact = await this.requireContact(input.emailOrId)
    await this.deps.store.untagContact({
      contactId: contact.id,
      tagKey: input.tagKey,
    })
    return { removed: true }
  }

  async listContactTags(input: {
    emailOrId: string
  }): Promise<ContactTagRecord[] | undefined> {
    const contact = await this.findContact(input.emailOrId)
    if (!contact) return undefined
    return this.deps.store.listContactTags(contact.id)
  }

  async upsertContactExternalId(input: {
    emailOrId: string
    provider: string
    externalId: string
    label?: string
    metadata?: Record<string, unknown>
  }): Promise<ContactExternalIdRecord> {
    const contact = await this.requireContact(input.emailOrId)
    return this.deps.store.upsertContactExternalId({
      contactId: contact.id,
      provider: input.provider,
      externalId: input.externalId,
      ...(input.label ? { label: input.label } : {}),
      ...(input.metadata ? { metadata: input.metadata } : {}),
    })
  }

  async findContactByExternalId(input: {
    provider: string
    externalId: string
  }): Promise<ContactRecord | undefined> {
    return this.deps.store.findContactByExternalId(input)
  }

  async recordPurchase(input: {
    email?: string
    contactId?: string
    provider?: string
    externalId?: string
    idempotencyKey?: string
    productKey: string
    productName?: string
    amountCents: number
    currency: string
    purchasedAt?: Date
    metadata?: Record<string, unknown>
  }): Promise<PurchaseRecord> {
    const contact = await this.resolvePurchaseContact(input)
    const purchase = await this.deps.store.recordPurchase({
      contactId: contact.id,
      provider: input.provider ?? 'manual',
      ...(input.externalId ? { externalId: input.externalId } : {}),
      ...(input.idempotencyKey ? { idempotencyKey: input.idempotencyKey } : {}),
      productKey: input.productKey,
      ...(input.productName ? { productName: input.productName } : {}),
      amountCents: input.amountCents,
      currency: input.currency,
      ...(input.purchasedAt ? { purchasedAt: input.purchasedAt } : {}),
      ...(input.metadata ? { metadata: input.metadata } : {}),
    })
    await this.deps.store.recordEvent({
      type: 'contact.purchase_recorded',
      contactId: contact.id,
      source: input.provider ?? 'api',
      idempotencyKey: input.idempotencyKey
        ? `purchase:${input.idempotencyKey}`
        : `purchase:${purchase.id}`,
      occurredAt: purchase.purchasedAt,
      metadata: {
        purchaseId: purchase.id,
        productKey: purchase.productKey,
        amountCents: purchase.amountCents,
        currency: purchase.currency,
        ...(purchase.externalId ? { externalId: purchase.externalId } : {}),
      },
    })
    return purchase
  }

  async getContactValue(input: {
    emailOrId: string
  }): Promise<ContactValueRecord[] | undefined> {
    const contact = await this.findContact(input.emailOrId)
    if (!contact) return undefined
    return this.deps.store.getContactValue(contact.id)
  }

  async previewAudience(input: AudienceFilter = {}): Promise<AudiencePreview> {
    const audience = normalizeAudience(input)
    const resolution = await this.deps.store.resolveAudience({
      ...audience,
      limit: audience.limit ?? 25,
    })
    return {
      audience,
      total: resolution.total,
      suppressed: resolution.suppressed,
      sample: resolution.contacts.slice(0, 25),
    }
  }

  async previewSendPlan(
    input: {
      audience?: AudienceFilter
      deliveryPolicy?: DeliveryPolicyInput
      scheduledAt?: Date
      sampleLimit?: number
    } = {},
  ): Promise<SendPlanPreview> {
    const plan = await planBroadcastSend({
      store: this.deps.store,
      config: this.deps.config,
      ...(input.audience ? { audience: input.audience } : {}),
      ...(input.deliveryPolicy ? { deliveryPolicy: input.deliveryPolicy } : {}),
      ...(input.scheduledAt ? { scheduledAt: input.scheduledAt } : {}),
    })
    return previewBroadcastSendPlan(plan, input.sampleLimit)
  }

  async rebuildAnalyticsRollups(): Promise<RollupRebuildResult> {
    return this.deps.store.rebuildAnalyticsRollups()
  }

  async getQueueSummary(input: QueueSummaryRequest = {}): Promise<QueueSummary> {
    const now = input.now ?? new Date()
    return this.deps.store.getQueueSummary({
      now,
      staleBefore: new Date(now.getTime() - (input.staleAfterMs ?? 10 * 60 * 1000)),
      since: input.since ?? new Date(now.getTime() - 24 * 60 * 60 * 1000),
    })
  }

  async createBroadcast(input: {
    draftId: string
    name?: string
    audience?: AudienceFilter
    deliveryPolicy?: DeliveryPolicyInput
    scheduledAt?: Date
  }): Promise<{ id: string; totalPlanned: number }> {
    const draft = await this.requireDraft(input.draftId)
    const broadcast = await this.deps.store.createBroadcast({
      draftId: draft.id,
      name: input.name ?? draft.name ?? draft.subject,
      subject: draft.subject,
      ...(input.audience ? { audience: input.audience } : {}),
      ...(input.deliveryPolicy ? { deliveryPolicy: input.deliveryPolicy } : {}),
      ...(input.scheduledAt ? { scheduledAt: input.scheduledAt } : {}),
    })
    const plan = await planBroadcastSend({
      store: this.deps.store,
      config: this.deps.config,
      ...(input.audience ? { audience: input.audience } : {}),
      ...(input.deliveryPolicy ? { deliveryPolicy: input.deliveryPolicy } : {}),
      ...(input.scheduledAt ? { scheduledAt: input.scheduledAt } : {}),
    })
    await this.deps.store.createMessages(broadcast.id, plan.planned)
    return { id: broadcast.id, totalPlanned: plan.total }
  }

  async createCanary(input: {
    draftId: string
    name?: string
    audience?: AudienceFilter
    deliveryPolicy?: DeliveryPolicyInput
    steps?: Array<number | 'all'>
    scheduledAt?: Date
  }): Promise<CanaryState> {
    return createCanaryCampaign({
      store: this.deps.store,
      config: this.deps.config,
      draftId: input.draftId,
      ...(input.name ? { name: input.name } : {}),
      ...(input.audience ? { audience: input.audience } : {}),
      ...(input.deliveryPolicy ? { deliveryPolicy: input.deliveryPolicy } : {}),
      ...(input.steps ? { steps: input.steps } : {}),
      ...(input.scheduledAt ? { scheduledAt: input.scheduledAt } : {}),
    })
  }

  async promoteCanary(input: {
    id: string
    stepIndex?: number
    scheduledAt?: Date
  }): Promise<CanaryState> {
    return promoteCanaryCampaign({
      store: this.deps.store,
      config: this.deps.config,
      id: input.id,
      ...(input.stepIndex !== undefined ? { stepIndex: input.stepIndex } : {}),
      ...(input.scheduledAt ? { scheduledAt: input.scheduledAt } : {}),
    })
  }

  async getCanary(id: string): Promise<CanaryState | undefined> {
    return getCanaryState(this.deps.store, id)
  }

  async listBroadcasts(input: { limit?: number } = {}): Promise<BroadcastRecord[]> {
    return this.deps.store.listBroadcasts(input.limit ?? 50)
  }

  async getBroadcast(id: string): Promise<BroadcastRecord | undefined> {
    return this.deps.store.getBroadcast(id)
  }

  async getBroadcastStats(id: string): Promise<BroadcastStats | undefined> {
    return this.deps.store.getBroadcastStats(id)
  }

  async getBroadcastLinkStats(id: string): Promise<LinkStats[] | undefined> {
    const broadcast = await this.deps.store.getBroadcast(id)
    if (!broadcast) return undefined
    return this.deps.store.getBroadcastLinkStats(id)
  }

  async listBroadcastEvents(input: {
    broadcastId: string
    limit?: number
  }): Promise<EventRecord[] | undefined> {
    const broadcast = await this.deps.store.getBroadcast(input.broadcastId)
    if (!broadcast) return undefined
    return this.deps.store.listEvents({
      broadcastId: input.broadcastId,
      limit: input.limit ?? 100,
    })
  }

  async getContactAnalytics(input: {
    emailOrId: string
    limit?: number
  }): Promise<ContactAnalytics | undefined> {
    const contact = input.emailOrId.includes('@')
      ? await this.deps.store.findContactByEmail(input.emailOrId)
      : await this.deps.store.getContact(input.emailOrId)
    if (!contact) return undefined

    const engagement =
      (await this.deps.store.getEngagement([contact.id])).get(contact.id) ??
      emptyEngagement(contact)
    const events = await this.deps.store.listEvents({
      contactId: contact.id,
      limit: input.limit ?? 100,
    })
    const links = await this.deps.store.getContactLinkInsights(
      contact.id,
      input.limit ?? 100,
    )
    const topics = await this.deps.store.getContactTopicInsights(
      contact.id,
      input.limit ?? 100,
    )

    return { contact, engagement, events, links, topics }
  }

  async getLinkInsights(
    input: {
      broadcastId?: string
      topic?: string
      tag?: string
      sponsor?: string
      limit?: number
    } = {},
  ): Promise<LinkInsight[]> {
    return this.deps.store.getLinkInsights(input)
  }

  async getLinkSummaryInsights(
    input: {
      broadcastId?: string
      topic?: string
      tag?: string
      sponsor?: string
      limit?: number
    } = {},
  ): Promise<LinkSummaryInsight[]> {
    return this.deps.store.getLinkSummaryInsights(input)
  }

  async getContactLinkInsights(input: {
    emailOrId: string
    limit?: number
  }): Promise<ContactLinkInsight[] | undefined> {
    const contact = await this.findContactByEmailOrId(input.emailOrId)
    if (!contact) return undefined
    return this.deps.store.getContactLinkInsights(contact.id, input.limit ?? 100)
  }

  async getContactTopicInsights(input: {
    emailOrId: string
    limit?: number
  }): Promise<ContactTopicInsight[] | undefined> {
    const contact = await this.findContactByEmailOrId(input.emailOrId)
    if (!contact) return undefined
    return this.deps.store.getContactTopicInsights(contact.id, input.limit ?? 100)
  }

  async pauseBroadcast(id: string): Promise<{ paused: boolean }> {
    const broadcast = await this.deps.store.getBroadcast(id)
    if (!broadcast) return { paused: false }
    await this.deps.store.updateBroadcastStatus(id, 'paused')
    return { paused: true }
  }

  async resumeBroadcast(id: string): Promise<{ resumed: boolean }> {
    const broadcast = await this.deps.store.getBroadcast(id)
    if (!broadcast) return { resumed: false }
    await this.deps.store.updateBroadcastStatus(id, 'scheduled')
    return { resumed: true }
  }

  async cancelBroadcast(id: string): Promise<{ cancelled: boolean; skipped: number }> {
    const broadcast = await this.deps.store.getBroadcast(id)
    if (!broadcast) return { cancelled: false, skipped: 0 }
    const skipped = await this.deps.store.cancelBroadcastMessages(id)
    await this.deps.store.updateBroadcastStatus(id, 'cancelled')
    return { cancelled: true, skipped }
  }

  async sendTest(input: {
    draftId: string
    to: string
    status?: RecipientStatus
  }): Promise<{
    providerMessageId: string
  }> {
    const draft = await this.requireDraft(input.draftId)
    const rendered = await renderDraftEmail(
      draft,
      input.status ? { status: input.status } : {},
    )
    const fromName = draft.fromName ?? this.deps.config.email.fromName
    const result = await this.deps.provider.send({
      to: input.to,
      fromEmail: this.defaultFromEmail(draft.fromEmail),
      subject: `[TEST] ${rendered.subject}`,
      html: rendered.html.replaceAll('{{unsubscribeUrl}}', '#'),
      text: rendered.text,
      ...(fromName ? { fromName } : {}),
      ...(draft.replyTo ? { replyTo: draft.replyTo } : {}),
    })
    return { providerMessageId: result.providerMessageId }
  }

  async sendSesSimulator(input: {
    draftId: string
    type: SesSimulatorType
  }): Promise<{ providerMessageId: string; to: string }> {
    const to = sesSimulatorAddress(input.type)
    const result = await this.sendTest({ draftId: input.draftId, to })
    return { ...result, to }
  }

  async retryFailedMessages(
    input: { broadcastId?: string; limit?: number; scheduledAt?: Date } = {},
  ): Promise<{ retried: number }> {
    return {
      retried: await this.deps.store.retryFailedMessages({
        ...(input.broadcastId ? { broadcastId: input.broadcastId } : {}),
        limit: input.limit ?? 100,
        scheduledAt: input.scheduledAt ?? new Date(),
      }),
    }
  }

  async sendDue(now = new Date(), limit = 100): Promise<SendDueResult> {
    const messages = await this.deps.store.claimDueMessages(now, limit)
    let sent = 0
    let skipped = 0
    let retried = 0
    let failed = 0
    const waitForProviderSlot = createProviderSendThrottle({
      ratePerSecond: this.deps.config.delivery.maxProviderRatePerSecond,
    })
    const broadcastIds = new Set(messages.map((message) => message.broadcastId))
    for (const message of messages) {
      if (await this.deps.store.isSuppressed(message.toEmail)) {
        await this.deps.store.updateMessage({ id: message.id, status: 'skipped' })
        skipped += 1
        continue
      }
      try {
        await waitForProviderSlot()
        await this.sendMessage(message)
        sent += 1
      } catch (error) {
        if (error instanceof ProviderAcceptedPersistenceError) {
          sent += 1
          continue
        }
        const retryable = message.retryCount < message.maxAttempts
        await this.deps.store.updateMessage({
          id: message.id,
          status: retryable ? 'planned' : 'failed',
          ...(retryable ? { scheduledAt: new Date(now.getTime() + 15 * 60 * 1000) } : {}),
          error: {
            message: error instanceof Error ? error.message : 'Unknown send error',
          },
        })
        if (retryable) retried += 1
        else failed += 1
      }
    }
    await this.deps.store.finalizeBroadcasts(Array.from(broadcastIds))
    return { sent, skipped, retried, failed }
  }

  async recoverStuckMessages(input: RecoverStuckInput = {}): Promise<{
    recovered: number
    failed: number
  }> {
    const now = input.now ?? new Date()
    return this.deps.store.recoverStuckMessages({
      staleBefore: new Date(now.getTime() - (input.staleAfterMs ?? 10 * 60 * 1000)),
      rescheduleAt: now,
      limit: input.limit ?? 100,
    })
  }

  async trackOpen(input: TrackingRequest): Promise<{ recorded: boolean }> {
    if (!this.deps.config.tracking.trackOpens) return { recorded: false }
    const payload = verifyTrackingToken(
      input.token,
      requireSecret(this.deps.config.trackingSecret, 'TRACKING_SECRET'),
    )
    if (payload?.kind !== 'open' || !payload.messageId || !payload.contactId) {
      return { recorded: false }
    }
    const message = await this.deps.store.getMessage(payload.messageId)
    if (!message) return { recorded: false }
    const classification = classifyTrackingRequest(input)
    await this.deps.store.recordEvent({
      type: classification.isBot ? 'engagement.opened_by_bot' : 'engagement.opened',
      contactId: payload.contactId,
      broadcastId: message.broadcastId,
      messageId: message.id,
      source: 'tracking',
      idempotencyKey: `${classification.isBot ? 'bot_open' : 'open'}:${message.id}`,
      ...(input.userAgent ? { userAgent: input.userAgent } : {}),
      ...(input.ip ? { ipHash: this.hashIp(input.ip) } : {}),
      metadata: {
        bot: classification.isBot,
        ...(classification.reason ? { reason: classification.reason } : {}),
      },
    })
    return { recorded: true }
  }

  async trackClick(input: TrackingRequest): Promise<{ recorded: boolean; url?: string }> {
    const payload = verifyTrackingToken(
      input.token,
      requireSecret(this.deps.config.trackingSecret, 'TRACKING_SECRET'),
    )
    if (
      payload?.kind !== 'click' ||
      !payload.messageId ||
      !payload.contactId ||
      !payload.linkId
    ) {
      return { recorded: false }
    }
    const message = await this.deps.store.getMessage(payload.messageId)
    const link = await this.deps.store.findLinkByTokenHash(tokenHash(input.token))
    if (
      !message ||
      !link ||
      message.contactId !== payload.contactId ||
      link.id !== payload.linkId ||
      link.messageId !== message.id ||
      link.broadcastId !== message.broadcastId
    ) {
      return { recorded: false }
    }
    const classification = classifyTrackingRequest(input)
    const event = await this.deps.store.recordEvent({
      type: classification.isBot ? 'engagement.clicked_by_bot' : 'engagement.clicked',
      contactId: payload.contactId,
      broadcastId: message.broadcastId,
      messageId: message.id,
      linkId: link.id,
      source: 'tracking',
      ...(input.userAgent ? { userAgent: input.userAgent } : {}),
      ...(input.ip ? { ipHash: this.hashIp(input.ip) } : {}),
      metadata: {
        originalUrl: link.originalUrl,
        bot: classification.isBot,
        ...(classification.reason ? { reason: classification.reason } : {}),
      },
    })
    if (!classification.isBot && this.deps.config.tracking.trackOpens) {
      await this.deps.store.recordEvent({
        type: 'engagement.opened',
        contactId: payload.contactId,
        broadcastId: message.broadcastId,
        messageId: message.id,
        source: 'tracking',
        idempotencyKey: `open:${message.id}`,
        ...(input.userAgent ? { userAgent: input.userAgent } : {}),
        ...(input.ip ? { ipHash: this.hashIp(input.ip) } : {}),
        metadata: { inferredFrom: 'click' },
      })
    }
    await this.deps.store.recordClickRollup({
      link,
      contactId: payload.contactId,
      isBot: classification.isBot,
      occurredAt: event.occurredAt,
    })
    return { recorded: true, url: link.originalUrl }
  }

  async unsubscribe(input: {
    token: string
    source?: string
  }): Promise<{ unsubscribed: boolean }> {
    const payload = verifyTrackingToken(
      input.token,
      requireSecret(this.deps.config.unsubscribeSecret, 'UNSUBSCRIBE_SECRET'),
    )
    if (payload?.kind !== 'unsubscribe' || !payload.contactId) {
      return { unsubscribed: false }
    }
    const contact = await this.deps.store.getContact(payload.contactId)
    await this.deps.store.unsubscribeContact({
      contactId: payload.contactId,
      ...(contact?.email ? { email: contact.email } : {}),
      source: input.source ?? 'unsubscribe',
    })
    await this.deps.store.recordEvent({
      type: 'contact.unsubscribed',
      contactId: payload.contactId,
      ...(payload.messageId ? { messageId: payload.messageId } : {}),
      source: input.source ?? 'unsubscribe',
      metadata: {},
    })
    return { unsubscribed: true }
  }

  async handleProviderEvents(
    events: NormalizedProviderEvent[],
  ): Promise<{ processed: number }> {
    let processed = 0
    for (const event of events) {
      const message = await this.deps.store.findMessageByProviderId(
        event.providerMessageId,
      )
      const contact = await this.deps.store.findContactByEmail(event.email)
      await this.deps.store.recordEvent({
        type: event.type,
        ...(contact?.id ? { contactId: contact.id } : {}),
        ...(message?.broadcastId ? { broadcastId: message.broadcastId } : {}),
        ...(message?.id ? { messageId: message.id } : {}),
        source: event.provider,
        occurredAt: event.occurredAt,
        idempotencyKey: event.providerEventId,
        metadata: event.metadata,
      })
      if (message) {
        await this.deps.store.updateMessage({
          id: message.id,
          status: event.type === 'message.complained' ? 'complained' : 'bounced',
        })
      }
      if (
        !isSesSimulatorAddress(event.email) &&
        (event.type === 'message.complained' || event.permanent)
      ) {
        await this.deps.store.addSuppression({
          email: event.email,
          ...(contact?.id ? { contactId: contact.id } : {}),
          reason: event.type === 'message.complained' ? 'complaint' : 'hard_bounce',
          source: event.provider,
          description: event.type,
        })
      }
      processed += 1
    }
    return { processed }
  }

  private async sendMessage(message: MessageRecord): Promise<void> {
    const broadcast = await this.deps.store.getBroadcast(message.broadcastId)
    if (!broadcast) throw new Error(`Broadcast not found: ${message.broadcastId}`)
    const draft = await this.requireDraft(broadcast.draftId)
    const recipientStatus = recipientStatusFromMessage(message)
    const rendered = await renderDraftEmail(
      draft,
      recipientStatus ? { status: recipientStatus } : {},
    )
    const trackingSecret = requireSecret(
      this.deps.config.trackingSecret,
      'TRACKING_SECRET',
    )
    const unsubscribeSecret = requireSecret(
      this.deps.config.unsubscribeSecret,
      'UNSUBSCRIBE_SECRET',
    )
    const openToken = createTrackingToken(
      { kind: 'open', messageId: message.id, contactId: message.contactId },
      trackingSecret,
    )
    const unsubscribeToken = createTrackingToken(
      { kind: 'unsubscribe', messageId: message.id, contactId: message.contactId },
      unsubscribeSecret,
    )
    const htmlWithUnsubscribe = replaceUnsubscribeUrl(
      rendered.html,
      unsubscribeToken,
      this.deps.config,
    )
    const htmlWithClicks = await rewriteTrackedLinks({
      html: htmlWithUnsubscribe,
      message,
      secret: trackingSecret,
      draftMetadata: draft.metadata ?? {},
      store: this.deps.store,
      baseUrl: this.deps.config.baseUrl,
    })
    const html = this.deps.config.tracking.trackOpens
      ? injectOpenPixel(htmlWithClicks, openToken, this.deps.config)
      : htmlWithClicks
    const fromName = draft.fromName ?? this.deps.config.email.fromName
    const result = await this.deps.provider.send({
      to: message.toEmail,
      fromEmail: this.defaultFromEmail(draft.fromEmail),
      subject: rendered.subject,
      html,
      text: rendered.text,
      ...(fromName ? { fromName } : {}),
      ...(draft.replyTo ? { replyTo: draft.replyTo } : {}),
      headers: [
        {
          name: 'List-Unsubscribe',
          value: `<${this.deps.config.baseUrl}/unsubscribe/${unsubscribeToken}>`,
        },
        { name: 'List-Unsubscribe-Post', value: 'List-Unsubscribe=One-Click' },
      ],
    })
    try {
      await this.deps.store.updateMessage({
        id: message.id,
        status: 'sent',
        provider: result.provider,
        providerMessageId: result.providerMessageId,
      })
      await this.deps.store.recordEvent({
        type: 'message.sent',
        contactId: message.contactId,
        broadcastId: message.broadcastId,
        messageId: message.id,
        source: result.provider,
        metadata: { providerMessageId: result.providerMessageId },
      })
    } catch (error) {
      throw new ProviderAcceptedPersistenceError(result, error)
    }
  }

  private async findContact(emailOrId: string): Promise<ContactRecord | undefined> {
    return emailOrId.includes('@')
      ? this.deps.store.findContactByEmail(emailOrId)
      : this.deps.store.getContact(emailOrId)
  }

  private async requireContact(emailOrId: string): Promise<ContactRecord> {
    const contact = await this.findContact(emailOrId)
    if (!contact) throw new Error(`Contact not found: ${emailOrId}`)
    return contact
  }

  private async resolvePurchaseContact(input: {
    email?: string
    contactId?: string
    provider?: string
    externalId?: string
  }): Promise<ContactRecord> {
    if (input.contactId) {
      const contact = await this.deps.store.getContact(input.contactId)
      if (!contact) throw new Error(`Contact not found: ${input.contactId}`)
      return contact
    }
    if (input.provider && input.externalId) {
      const contact = await this.deps.store.findContactByExternalId({
        provider: input.provider,
        externalId: input.externalId,
      })
      if (contact) return contact
    }
    if (input.email) {
      const existing = await this.deps.store.findContactByEmail(input.email)
      if (existing) return existing
      return this.deps.store.upsertContact({
        email: input.email,
        source: input.provider ?? 'purchase',
      })
    }
    throw new Error('Purchase needs contactId, email, or provider/externalId')
  }

  private async requireDraft(id: string) {
    const draft = await this.deps.store.getDraft(id)
    if (!draft) throw new Error(`Draft not found: ${id}`)
    return draft
  }

  private defaultFromEmail(fromEmail: string | undefined): string {
    const configured = fromEmail ?? this.deps.config.email.fromEmail
    if (!configured) throw new Error('Missing from email')
    return configured
  }

  private hashIp(ip: string): string {
    return ipHash(ip, requireSecret(this.deps.config.trackingSecret, 'TRACKING_SECRET'))
  }

  private findContactByEmailOrId(emailOrId: string): Promise<ContactRecord | undefined> {
    return emailOrId.includes('@')
      ? this.deps.store.findContactByEmail(emailOrId)
      : this.deps.store.getContact(emailOrId)
  }
}

function normalizeSuppressionReason(reason: string | undefined) {
  if (
    reason === 'unsubscribe' ||
    reason === 'hard_bounce' ||
    reason === 'complaint' ||
    reason === 'manual' ||
    reason === 'invalid_email' ||
    reason === 'domain_block'
  ) {
    return reason
  }
  return 'manual'
}

function sesSimulatorAddress(type: SesSimulatorType): string {
  if (type === 'bounce') return 'bounce@simulator.amazonses.com'
  if (type === 'complaint') return 'complaint@simulator.amazonses.com'
  if (type === 'ooto') return 'ooto@simulator.amazonses.com'
  if (type === 'suppression') return 'suppressionlist@simulator.amazonses.com'
  return 'success@simulator.amazonses.com'
}

function isSesSimulatorAddress(email: string): boolean {
  return email.trim().toLowerCase().endsWith('@simulator.amazonses.com')
}
