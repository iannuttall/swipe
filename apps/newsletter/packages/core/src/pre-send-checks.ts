import crypto from 'node:crypto'
import type { RenderedEmail } from './types.js'

export type PreSendCheckStatus = 'pass' | 'warn' | 'fail'

export interface PreSendCheck {
  id: string
  title: string
  status: PreSendCheckStatus
  detail: string
}

export interface SpamAssassinRule {
  name: string
  score: number
  description?: string
}

export interface SpamAssassinResult {
  score: number
  requiredScore: number
  isSpam: boolean
  rules: SpamAssassinRule[]
}

export interface MailTesterSummary {
  score?: number
  title?: string
  checks: PreSendCheck[]
}

export interface PreSendReport {
  ready: boolean
  counts: Record<PreSendCheckStatus, number>
  message: {
    htmlBytes: number
    textBytes: number
    mimeBytes: number
    links: number
    images: number
  }
  checks: PreSendCheck[]
  spamAssassin?: SpamAssassinResult
  mailTester?: MailTesterSummary
}

export interface PreparedPreflightEmail {
  rendered: RenderedEmail
  mime: string
  unsubscribeUrl: string
}

export function preparePreflightEmail(input: {
  rendered: RenderedEmail
  fromEmail: string
  fromName?: string
  baseUrl: string
}): PreparedPreflightEmail {
  const baseUrl = input.baseUrl.replace(/\/$/, '')
  const unsubscribeUrl = `${baseUrl}/unsubscribe/preflight-check`
  const rendered = {
    ...input.rendered,
    html: input.rendered.html.replaceAll('{{unsubscribeUrl}}', unsubscribeUrl),
    text: input.rendered.text.replaceAll('{{unsubscribeUrl}}', unsubscribeUrl),
  }
  return {
    rendered,
    unsubscribeUrl,
    mime: buildPreflightMime({
      rendered,
      fromEmail: input.fromEmail,
      ...(input.fromName ? { fromName: input.fromName } : {}),
      unsubscribeUrl,
    }),
  }
}

export function runPreSendChecks(input: {
  prepared: PreparedPreflightEmail
  spamAssassin?: SpamAssassinResult
  mailTester?: MailTesterSummary
}): PreSendReport {
  const { rendered, mime, unsubscribeUrl } = input.prepared
  const htmlBytes = Buffer.byteLength(rendered.html)
  const textBytes = Buffer.byteLength(rendered.text)
  const mimeBytes = Buffer.byteLength(mime)
  const links = Array.from(rendered.html.matchAll(/\bhref=["']([^"']+)["']/gi))
  const images = Array.from(rendered.html.matchAll(/<img\b[^>]*>/gi))
  const missingAlt = images.filter(([tag]) => !/\balt=["'][^"']*["']/i.test(tag ?? ''))
  const insecureLinks = links.filter((match) => match[1]?.startsWith('http://'))
  const checks: PreSendCheck[] = [
    requiredContentCheck('html_part', 'HTML body', rendered.html),
    requiredContentCheck('text_part', 'Plain-text body', rendered.text),
    {
      id: 'html_size',
      title: 'HTML size',
      status: htmlBytes >= 100 * 1024 ? 'fail' : htmlBytes >= 90 * 1024 ? 'warn' : 'pass',
      detail: `${formatBytes(htmlBytes)}${
        htmlBytes >= 100 * 1024
          ? ' risks Gmail clipping the footer and unsubscribe link.'
          : htmlBytes >= 90 * 1024
            ? ' is close to Gmail clipping territory.'
            : ' is comfortably below the clipping guardrail.'
      }`,
    },
    {
      id: 'unsubscribe_body',
      title: 'Visible unsubscribe',
      status:
        rendered.html.includes(unsubscribeUrl) && rendered.text.includes(unsubscribeUrl)
          ? 'pass'
          : 'fail',
      detail:
        rendered.html.includes(unsubscribeUrl) && rendered.text.includes(unsubscribeUrl)
          ? 'Present in both HTML and plain text.'
          : 'Missing from HTML or plain text.',
    },
    {
      id: 'one_click_unsubscribe',
      title: 'One-click unsubscribe headers',
      status:
        mime.includes('List-Unsubscribe:') && mime.includes('List-Unsubscribe-Post:')
          ? 'pass'
          : 'fail',
      detail: 'Checks the RFC 8058 headers used by Gmail and other mailbox providers.',
    },
    {
      id: 'template_placeholders',
      title: 'Unresolved template values',
      status: /{{[^}]+}}/.test(`${rendered.html}\n${rendered.text}`) ? 'fail' : 'pass',
      detail: /{{[^}]+}}/.test(`${rendered.html}\n${rendered.text}`)
        ? 'The rendered message still contains a {{placeholder}}.'
        : 'No unresolved placeholders found.',
    },
    {
      id: 'unsafe_html',
      title: 'Unsafe HTML',
      status: /<(script|iframe|object|embed|form)\b/i.test(rendered.html)
        ? 'fail'
        : 'pass',
      detail: /<(script|iframe|object|embed|form)\b/i.test(rendered.html)
        ? 'Found an element that mail clients commonly reject.'
        : 'No scripts, frames, embeds, objects, or forms found.',
    },
    {
      id: 'secure_links',
      title: 'Secure links',
      status: insecureLinks.length > 0 ? 'fail' : 'pass',
      detail:
        insecureLinks.length > 0
          ? `${insecureLinks.length} HTTP link${insecureLinks.length === 1 ? '' : 's'} found.`
          : `${links.length} links use HTTPS or non-web schemes.`,
    },
    {
      id: 'image_alt_text',
      title: 'Image alt text',
      status: missingAlt.length > 0 ? 'warn' : 'pass',
      detail:
        missingAlt.length > 0
          ? `${missingAlt.length} of ${images.length} images have no alt attribute.`
          : `${images.length} images have alt attributes.`,
    },
    spamAssassinCheck(input.spamAssassin),
  ]
  if (input.mailTester) checks.push(...input.mailTester.checks)

  const counts = countStatuses(checks)
  return {
    ready: counts.fail === 0,
    counts,
    message: {
      htmlBytes,
      textBytes,
      mimeBytes,
      links: links.length,
      images: images.length,
    },
    checks,
    ...(input.spamAssassin ? { spamAssassin: input.spamAssassin } : {}),
    ...(input.mailTester ? { mailTester: input.mailTester } : {}),
  }
}

export function parseSpamAssassinOutput(output: string): SpamAssassinResult | undefined {
  const headers = output.split(/\r?\n\r?\n/, 1)[0]?.replace(/\r?\n[ \t]+/g, ' ')
  const status = headers?.match(
    /X-Spam-Status:\s*(Yes|No),?\s+score=(-?\d+(?:\.\d+)?)\s+required=(-?\d+(?:\.\d+)?)(?:\s+tests=([^\r\n]+?))?(?:\s+autolearn=|$)/i,
  )
  if (!status) return undefined
  const descriptions = new Map<string, string>()
  const scores = new Map<string, number>()
  for (const line of output.split(/\r?\n/)) {
    const match = line.match(/^\s*(-?\d+(?:\.\d+)?)\s+([A-Z][A-Z0-9_]+)\s+(.+)$/)
    if (!match?.[1] || !match[2]) continue
    scores.set(match[2], Number(match[1]))
    descriptions.set(match[2], match[3]?.trim() ?? '')
  }
  const names = (status[4] ?? '')
    .split(',')
    .map((name) => name.trim())
    .filter(Boolean)
  const rules = names
    .map((name): SpamAssassinRule => {
      const description = descriptions.get(name)
      return {
        name,
        score: scores.get(name) ?? 0,
        ...(description ? { description } : {}),
      }
    })
    .sort((a, b) => Math.abs(b.score) - Math.abs(a.score))
  return {
    isSpam: status[1]?.toLowerCase() === 'yes',
    score: Number(status[2]),
    requiredScore: Number(status[3]),
    rules,
  }
}

function buildPreflightMime(input: {
  rendered: RenderedEmail
  fromEmail: string
  fromName?: string
  unsubscribeUrl: string
}): string {
  const boundary = `swipe-preflight-${crypto.createHash('sha256').update(input.rendered.html).digest('hex').slice(0, 16)}`
  const from = input.fromName
    ? `"${input.fromName.replaceAll('"', '\\"')}" <${input.fromEmail}>`
    : input.fromEmail
  return [
    `From: ${from}`,
    'To: reader@example.com',
    `Subject: ${input.rendered.subject}`,
    'Date: Thu, 01 Jan 1970 00:00:00 +0000',
    'MIME-Version: 1.0',
    `Message-ID: <preflight-${boundary}@${input.fromEmail.split('@')[1] ?? 'swipe.invalid'}>`,
    `List-Unsubscribe: <${input.unsubscribeUrl}>`,
    'List-Unsubscribe-Post: List-Unsubscribe=One-Click',
    `Content-Type: multipart/alternative; boundary="${boundary}"`,
    '',
    `--${boundary}`,
    'Content-Type: text/plain; charset=UTF-8',
    'Content-Transfer-Encoding: 8bit',
    '',
    input.rendered.text,
    `--${boundary}`,
    'Content-Type: text/html; charset=UTF-8',
    'Content-Transfer-Encoding: 8bit',
    '',
    input.rendered.html,
    `--${boundary}--`,
    '',
  ].join('\r\n')
}

function requiredContentCheck(id: string, title: string, value: string): PreSendCheck {
  return {
    id,
    title,
    status: value.trim() ? 'pass' : 'fail',
    detail: value.trim() ? `${formatBytes(Buffer.byteLength(value))}.` : 'Missing.',
  }
}

function spamAssassinCheck(result?: SpamAssassinResult): PreSendCheck {
  if (!result) {
    return {
      id: 'spamassassin',
      title: 'SpamAssassin',
      status: 'fail',
      detail: 'Scanner did not return a readable score.',
    }
  }
  const status =
    result.isSpam || result.score >= result.requiredScore
      ? 'fail'
      : result.score >= Math.min(3, result.requiredScore * 0.6)
        ? 'warn'
        : 'pass'
  return {
    id: 'spamassassin',
    title: 'SpamAssassin',
    status,
    detail: `${result.score.toFixed(1)} / ${result.requiredScore.toFixed(1)}; ${result.rules.length} matched rules.`,
  }
}

function countStatuses(checks: PreSendCheck[]): Record<PreSendCheckStatus, number> {
  const counts = { pass: 0, warn: 0, fail: 0 }
  for (const check of checks) counts[check.status] += 1
  return counts
}

function formatBytes(bytes: number): string {
  return bytes < 1024 ? `${bytes} B` : `${(bytes / 1024).toFixed(1)} KiB`
}
