import type { AppConfig } from './config.js'
import { requestUrl, usableOrNewRequest } from './confirmation-request.js'
import type { DraftRecord, EmailStore, MessageRecord } from './store.js'
import type { DraftInput } from './types.js'

export const confirmationUrlPlaceholder = '{{confirmationUrl}}'

export interface ConfirmationDraftSettings {
  purpose: 'swipe_migration'
  batchKey: string
  expiresAt: Date
}

export function confirmationDraftSettings(
  draft: Pick<DraftRecord, 'metadata'>,
): ConfirmationDraftSettings | undefined {
  const raw = draft.metadata?.confirmation
  if (!raw || typeof raw !== 'object') return undefined
  const value = raw as Record<string, unknown>
  if (value.purpose !== 'swipe_migration') {
    throw new Error('Draft confirmation purpose must be swipe_migration')
  }
  if (typeof value.batchKey !== 'string' || !value.batchKey.trim()) {
    throw new Error('Draft confirmation batchKey is required')
  }
  if (typeof value.expiresAt !== 'string') {
    throw new Error('Draft confirmation expiresAt is required')
  }
  const expiresAt = new Date(value.expiresAt)
  if (Number.isNaN(expiresAt.getTime())) {
    throw new Error('Draft confirmation expiresAt must be an ISO date')
  }
  return { purpose: value.purpose, batchKey: value.batchKey, expiresAt }
}

export async function personalizeConfirmationDraft(input: {
  store: EmailStore
  config: AppConfig
  draft: DraftRecord
  message: MessageRecord
}): Promise<{ draft: DraftInput; excludedTrackingPrefixes: string[] }> {
  const hasPlaceholder = input.draft.bodyMarkdown.includes(confirmationUrlPlaceholder)
  const settings = confirmationDraftSettings(input.draft)
  if (!hasPlaceholder && !settings) {
    return { draft: input.draft, excludedTrackingPrefixes: [] }
  }
  if (!hasPlaceholder || !settings) {
    throw new Error(
      'Confirmation drafts require metadata.confirmation and {{confirmationUrl}}',
    )
  }
  if (settings.expiresAt.getTime() <= Date.now()) {
    throw new Error('Confirmation campaign has expired')
  }
  const request = await usableOrNewRequest({
    store: input.store,
    config: input.config,
    contactId: input.message.contactId,
    purpose: settings.purpose,
    batchKey: settings.batchKey,
    source: `broadcast:${input.message.broadcastId}`,
    requestedAt: new Date(),
    expiresAt: settings.expiresAt,
    metadata: { broadcastId: input.message.broadcastId },
  })
  const url = requestUrl(request, input.config)
  return {
    draft: {
      ...input.draft,
      bodyMarkdown: input.draft.bodyMarkdown.replaceAll(confirmationUrlPlaceholder, url),
    },
    excludedTrackingPrefixes: [
      `${input.config.confirmation.baseUrl.replace(/\/$/, '')}/confirm?token=`,
    ],
  }
}

export function previewConfirmationDraft(
  draft: DraftRecord,
  config: AppConfig,
): DraftInput {
  if (!draft.bodyMarkdown.includes(confirmationUrlPlaceholder)) return draft
  confirmationDraftSettings(draft)
  return {
    ...draft,
    bodyMarkdown: draft.bodyMarkdown.replaceAll(
      confirmationUrlPlaceholder,
      `${config.confirmation.baseUrl.replace(/\/$/, '')}/confirm?token=test-link`,
    ),
  }
}
