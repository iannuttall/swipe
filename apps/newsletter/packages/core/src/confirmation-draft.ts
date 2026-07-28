import type { AppConfig } from './config.js'
import { requireSecret } from './config.js'
import { assertConfirmationBatchKey } from './confirmation-request.js'
import { createSwipeInviteToken } from './confirmation-token.js'
import type { DraftRecord, MessageRecord } from './store.js'
import type { DraftInput } from './types.js'

export const confirmationUrlPlaceholder = '{{confirmationUrl}}'

export interface ConfirmationDraftSettings {
  purpose: 'swipe_invite'
  batchKey: string
  expiresAt: Date
}

export function confirmationDraftSettings(
  draft: Pick<DraftRecord, 'metadata'>,
): ConfirmationDraftSettings | undefined {
  const raw = draft.metadata?.confirmation
  if (!raw || typeof raw !== 'object') return undefined
  const value = raw as Record<string, unknown>
  if (value.purpose !== 'swipe_invite') {
    throw new Error('Draft confirmation purpose must be swipe_invite')
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
  assertConfirmationBatchKey(value.batchKey)
  return { purpose: value.purpose, batchKey: value.batchKey, expiresAt }
}

export async function personalizeConfirmationDraft(input: {
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
  const token = createSwipeInviteToken(
    {
      email: input.message.toEmail,
      batchKey: settings.batchKey,
      expiresAt: settings.expiresAt,
    },
    requireSecret(input.config.swipeInvite.secret, 'SWIPE_INVITE_SECRET'),
  )
  const baseUrl = input.config.swipeInvite.baseUrl.replace(/\/$/, '')
  const url = `${baseUrl}/confirm?token=${encodeURIComponent(token)}`
  return {
    draft: {
      ...input.draft,
      bodyMarkdown: input.draft.bodyMarkdown.replaceAll(confirmationUrlPlaceholder, url),
    },
    excludedTrackingPrefixes: [`${baseUrl}/confirm?token=`],
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
      `${config.swipeInvite.baseUrl.replace(/\/$/, '')}/confirm?token=test-link`,
    ),
  }
}
