import crypto from 'node:crypto'
import { parseIssueSections } from './issue-parser.js'
import type { DraftRecord, LinkStats } from './store.js'

export const issueQaMaxAgeMs = 7 * 24 * 60 * 60 * 1000

export interface IssueQaReceipt {
  fingerprint: string
  testBroadcastId: string
  testMessageId: string
  testedTo: string
  testedAt: string
  checkedAt: string
  canonicalUrl: string
  checkedLinks: number
  browserCheckedLinks: number
}

export interface IssueDraftMetadata extends Record<string, unknown> {
  issueSlug?: string
  issueQa?: IssueQaReceipt
}

export function draftFingerprint(draft: {
  name?: string
  subject: string
  preview?: string
  bodyMarkdown: string
  template?: string
  fromEmail?: string
  fromName?: string
  replyTo?: string
}): string {
  return crypto
    .createHash('sha256')
    .update(
      JSON.stringify({
        name: draft.name ?? null,
        subject: draft.subject,
        preview: draft.preview ?? null,
        bodyMarkdown: draft.bodyMarkdown,
        template: draft.template ?? 'default',
        fromEmail: draft.fromEmail ?? null,
        fromName: draft.fromName ?? null,
        replyTo: draft.replyTo ?? null,
      }),
    )
    .digest('hex')
}

export function issueSlug(draft: DraftRecord): string | undefined {
  const value = (draft.metadata ?? {}) as IssueDraftMetadata
  const slug = value.issueSlug
  return typeof slug === 'string' && slug.trim() ? slug.trim() : undefined
}

export function issueQaReceipt(draft: DraftRecord): IssueQaReceipt | undefined {
  const metadata = (draft.metadata ?? {}) as IssueDraftMetadata
  const value = metadata.issueQa
  if (!value || typeof value !== 'object') return undefined
  return value
}

export function assertIssueDraftCanBroadcast(draft: DraftRecord, now = new Date()): void {
  const slug = issueSlug(draft)
  if (!slug) return
  if (draft.name !== slug) {
    throw new Error(`Issue draft name must match its canonical slug: ${slug}`)
  }
  const receipt = issueQaReceipt(draft)
  if (draft.status !== 'ready' || !receipt) {
    throw new Error(
      `Issue ${slug} has not passed tracked test and browser QA; broadcast creation is blocked`,
    )
  }
  if (receipt.fingerprint !== draftFingerprint(draft)) {
    throw new Error(`Issue ${slug} changed after QA; send another tracked test`)
  }
  const checkedAt = new Date(receipt.checkedAt)
  if (
    Number.isNaN(checkedAt.getTime()) ||
    now.getTime() - checkedAt.getTime() > issueQaMaxAgeMs
  ) {
    throw new Error(`Issue ${slug} QA is stale; send another tracked test`)
  }
  if (receipt.checkedLinks < 1 || receipt.browserCheckedLinks !== receipt.checkedLinks) {
    throw new Error(`Issue ${slug} did not pass browser QA for every tracked link`)
  }
}

export function validateIssueLinkDestinations(input: {
  draft: DraftRecord
  links: LinkStats[]
  baseUrl: string
}): { canonicalUrl: string; expectedInternalLinks: number } {
  const slug = issueSlug(input.draft)
  if (!slug) throw new Error('Draft is not marked as an issue draft')
  if (input.draft.name !== slug) {
    throw new Error(`Issue draft name must match its canonical slug: ${slug}`)
  }

  const canonicalUrl = `${input.baseUrl.replace(/\/$/, '')}/issues/${encodeURIComponent(slug)}`
  const expected = parseIssueSections(input.draft.bodyMarkdown)
    .filter((section) => section.type === 'item' && section.attrs.sponsor !== 'true')
    .flatMap((section) => {
      const id = section.attrs.id
      return id ? [`${canonicalUrl}#${encodeURIComponent(id)}`] : []
    })
  expected.push(`${canonicalUrl}.md`)

  const actual = new Set(input.links.map((link) => link.originalUrl))
  const missing = expected.filter((url) => !actual.has(url))
  if (missing.length > 0) {
    throw new Error(
      `Tracked test is missing canonical issue links: ${missing.join(', ')}`,
    )
  }

  return { canonicalUrl, expectedInternalLinks: expected.length }
}
