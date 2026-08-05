import type { AppConfig } from './config.js'
import { requireSecret } from './config.js'
import { personalizeConfirmationDraft } from './confirmation-draft.js'
import type { EmailProvider } from './providers.js'
import { recipientStatusFromMessage } from './recipient-engagement.js'
import { renderDraftEmail } from './render.js'
import { ProviderAcceptedPersistenceError } from './send-errors.js'
import type { EmailStore, MessageRecord } from './store.js'
import { rewriteTrackedLinks } from './tracked-links.js'
import {
  createTrackingToken,
  injectOpenPixel,
  replaceUnsubscribeUrl,
} from './tracking.js'

export async function sendQueuedMessage(
  deps: { store: EmailStore; provider: EmailProvider; config: AppConfig },
  message: MessageRecord,
  options: { subjectPrefix?: string } = {},
): Promise<{ providerMessageId: string; trackingUrls: string[] }> {
  const broadcast = await deps.store.getBroadcast(message.broadcastId)
  if (!broadcast) throw new Error(`Broadcast not found: ${message.broadcastId}`)
  const storedDraft = await deps.store.getDraft(broadcast.draftId)
  if (!storedDraft) throw new Error(`Draft not found: ${broadcast.draftId}`)
  const personalized = await personalizeConfirmationDraft({
    config: deps.config,
    draft: storedDraft,
    message,
  })
  const recipientStatus = recipientStatusFromMessage(message)
  const rendered = await renderDraftEmail(
    personalized.draft,
    recipientStatus ? { status: recipientStatus } : {},
  )
  const trackingSecret = requireSecret(deps.config.trackingSecret, 'TRACKING_SECRET')
  const unsubscribeSecret = requireSecret(
    deps.config.unsubscribeSecret,
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
    deps.config,
  )
  const htmlWithClicks = await rewriteTrackedLinks({
    html: htmlWithUnsubscribe,
    message,
    secret: trackingSecret,
    draftMetadata: storedDraft.metadata ?? {},
    store: deps.store,
    baseUrl: deps.config.baseUrl,
    excludedUrlPrefixes: personalized.excludedTrackingPrefixes,
  })
  const html = deps.config.tracking.trackOpens
    ? injectOpenPixel(htmlWithClicks, openToken, deps.config)
    : htmlWithClicks
  const fromEmail = storedDraft.fromEmail ?? deps.config.email.fromEmail
  if (!fromEmail) throw new Error('Missing from email')
  const fromName = storedDraft.fromName ?? deps.config.email.fromName
  const result = await deps.provider.send({
    to: message.toEmail,
    fromEmail,
    subject: `${options.subjectPrefix ?? ''}${rendered.subject}`,
    html,
    text: rendered.text,
    ...(fromName ? { fromName } : {}),
    ...(storedDraft.replyTo ? { replyTo: storedDraft.replyTo } : {}),
    headers: [
      {
        name: 'List-Unsubscribe',
        value: `<${deps.config.baseUrl}/unsubscribe/${unsubscribeToken}>`,
      },
      { name: 'List-Unsubscribe-Post', value: 'List-Unsubscribe=One-Click' },
    ],
  })
  try {
    await deps.store.updateMessage({
      id: message.id,
      status: 'sent',
      provider: result.provider,
      providerMessageId: result.providerMessageId,
    })
    await deps.store.recordEvent({
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
  return {
    providerMessageId: result.providerMessageId,
    trackingUrls: Array.from(
      html.matchAll(/href="(https?:\/\/[^"\s]+\/t\/click\/[^"\s]+)"/g),
      (match) => match[1],
    ).filter((url): url is string => Boolean(url)),
  }
}
