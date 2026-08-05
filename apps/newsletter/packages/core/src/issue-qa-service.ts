import type { AppConfig } from './config.js'
import {
  draftFingerprint,
  type IssueQaReceipt,
  issueQaReceipt,
  issueSlug,
  validateIssueLinkDestinations,
} from './draft-qa.js'
import { sendQueuedMessage } from './message-sender.js'
import type { EmailProvider } from './providers.js'
import type { EmailStore } from './store.js'
import type { RecipientStatus } from './types.js'

type Deps = { store: EmailStore; provider: EmailProvider; config: AppConfig }

async function requireDraft(deps: Deps, id: string) {
  const draft = await deps.store.getDraft(id)
  if (!draft) throw new Error(`Draft not found: ${id}`)
  return draft
}

export async function getIssueDraftQa(deps: Deps, draftId: string) {
  const draft = await requireDraft(deps, draftId)
  const slug = issueSlug(draft)
  const receipt = issueQaReceipt(draft)
  return {
    fingerprint: draftFingerprint(draft),
    status: draft.status,
    ...(slug ? { issueSlug: slug } : {}),
    ...(receipt ? { receipt } : {}),
  }
}

export async function approveIssueDraftQa(
  deps: Deps,
  input: {
    draftId: string
    testMessageId: string
    checkedAt: Date
    browserCheckedLinks: number
    archiveHtmlOk: boolean
    archiveMarkdownOk: boolean
  },
): Promise<IssueQaReceipt> {
  const draft = await requireDraft(deps, input.draftId)
  const slug = issueSlug(draft)
  if (!slug) throw new Error('Draft is not marked as an issue draft')
  if (!input.archiveHtmlOk || !input.archiveMarkdownOk) {
    throw new Error(`Issue ${slug} archive HTML and Markdown must both pass QA`)
  }
  const now = new Date()
  if (
    Number.isNaN(input.checkedAt.getTime()) ||
    Math.abs(now.getTime() - input.checkedAt.getTime()) > 15 * 60 * 1000
  ) {
    throw new Error('QA check timestamp must be within the last 15 minutes')
  }
  const message = await deps.store.getMessage(input.testMessageId)
  if (message?.status !== 'sent') {
    throw new Error('Tracked test message was not sent successfully')
  }
  const broadcast = await deps.store.getBroadcast(message.broadcastId)
  if (!broadcast || broadcast.draftId !== draft.id || !broadcast.name.startsWith('qa:')) {
    throw new Error('Test message does not belong to this issue draft')
  }
  const links = (await deps.store.getBroadcastLinkStats(broadcast.id)).filter(
    (link) => link.messageId === message.id,
  )
  const { canonicalUrl } = validateIssueLinkDestinations({
    draft,
    links,
    baseUrl: deps.config.baseUrl,
  })
  if (links.length < 1 || input.browserCheckedLinks !== links.length) {
    throw new Error(
      `Browser QA covered ${input.browserCheckedLinks} of ${links.length} tracked links`,
    )
  }
  const receipt: IssueQaReceipt = {
    fingerprint: draftFingerprint(draft),
    testBroadcastId: broadcast.id,
    testMessageId: message.id,
    testedTo: message.toEmail,
    testedAt: message.attemptedAt?.toISOString() ?? now.toISOString(),
    checkedAt: input.checkedAt.toISOString(),
    canonicalUrl,
    checkedLinks: links.length,
    browserCheckedLinks: input.browserCheckedLinks,
  }
  await deps.store.updateDraft({
    id: draft.id,
    status: 'ready',
    metadata: { ...draft.metadata, issueQa: receipt },
  })
  return receipt
}

export async function sendTrackedTest(
  deps: Deps,
  input: { draftId: string; to: string; status?: RecipientStatus },
) {
  const draft = await requireDraft(deps, input.draftId)
  const contact = await deps.store.findContactByEmail(input.to)
  if (!contact) throw new Error('Tracked test recipient must already exist as a contact')
  if (await deps.store.isSuppressed(contact.email)) {
    throw new Error('Tracked test recipient is suppressed')
  }
  const now = new Date()
  const broadcast = await deps.store.createBroadcast({
    draftId: draft.id,
    name: `qa:${draft.name ?? draft.id}`,
    subject: draft.subject,
    audience: { contactIds: [contact.id] },
    scheduledAt: now,
  })
  const [message] = await deps.store.createMessages(broadcast.id, [
    {
      contactId: contact.id,
      email: contact.email,
      domain: contact.emailDomain,
      engagementScore: 0,
      sendRank: 0,
      rankReason: 'qa_test',
      status: input.status ?? 'cold',
      scheduledAt: now,
    },
  ])
  if (!message) throw new Error('Failed to create tracked test message')
  await deps.store.updateMessage({ id: message.id, status: 'sending' })
  const result = await sendQueuedMessage(deps, message, { subjectPrefix: '[TEST] ' })
  await deps.store.finalizeBroadcasts([broadcast.id])
  const links = (await deps.store.getBroadcastLinkStats(broadcast.id)).filter(
    (link) => link.messageId === message.id,
  )
  if (links.length !== result.trackingUrls.length) {
    throw new Error('Tracked test link persistence mismatch')
  }
  return {
    providerMessageId: result.providerMessageId,
    broadcastId: broadcast.id,
    messageId: message.id,
    draftFingerprint: draftFingerprint(draft),
    trackingLinks: result.trackingUrls.map((trackingUrl, index) => ({
      trackingUrl,
      originalUrl: links[index]?.originalUrl ?? '',
    })),
  }
}
