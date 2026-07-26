import crypto from 'node:crypto'
import type { AppConfig } from './config.js'

export interface TrackingTokenPayload {
  kind: 'open' | 'click' | 'unsubscribe'
  messageId?: string
  contactId?: string
  linkId?: string
}

export interface TrackingClassification {
  isBot: boolean
  reason?: string
}

export function createTrackingToken(
  payload: TrackingTokenPayload,
  secret: string,
): string {
  const body = Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url')
  const signature = crypto.createHmac('sha256', secret).update(body).digest('base64url')
  return `${body}.${signature}`
}

export function verifyTrackingToken(
  token: string,
  secret: string,
): TrackingTokenPayload | null {
  const [body, signature] = token.split('.')
  if (!body || !signature) return null

  const expected = crypto.createHmac('sha256', secret).update(body).digest('base64url')
  if (!safeCompare(signature, expected)) return null

  try {
    const parsed = JSON.parse(Buffer.from(body, 'base64url').toString('utf8')) as unknown
    if (!isTrackingPayload(parsed)) return null
    return parsed
  } catch {
    return null
  }
}

export function tokenHash(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex')
}

export function ipHash(ip: string, secret: string): string {
  return crypto.createHmac('sha256', secret).update(ip).digest('hex').slice(0, 24)
}

export function classifyTrackingRequest(input: {
  userAgent?: string
}): TrackingClassification {
  const userAgent = input.userAgent?.trim()
  if (!userAgent) return { isBot: true, reason: 'missing_user_agent' }
  if (userAgent === 'Mozilla/5.0') return { isBot: true, reason: 'generic_user_agent' }

  const lower = userAgent.toLowerCase()
  const pattern = botUserAgentPatterns.find((item) => lower.includes(item.pattern))
  if (pattern) return { isBot: true, reason: pattern.reason }

  if (/mozilla\/5\.0 \(compatible;/.test(lower)) {
    return { isBot: true, reason: 'compatible_bot_signature' }
  }

  return { isBot: false }
}

export function injectOpenPixel(html: string, token: string, config: AppConfig): string {
  const pixel = `<img src="${config.baseUrl}/t/open/${token}" width="1" height="1" alt="" style="display:none">`
  const closeBody = html.lastIndexOf('</body>')
  if (closeBody === -1) return `${html}${pixel}`
  return `${html.slice(0, closeBody)}${pixel}${html.slice(closeBody)}`
}

export function replaceUnsubscribeUrl(
  html: string,
  token: string,
  config: AppConfig,
): string {
  return html.replaceAll('{{unsubscribeUrl}}', `${config.baseUrl}/unsubscribe/${token}`)
}

function safeCompare(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  return crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b))
}

function isTrackingPayload(value: unknown): value is TrackingTokenPayload {
  if (!value || typeof value !== 'object') return false
  const kind = (value as { kind?: unknown }).kind
  return kind === 'open' || kind === 'click' || kind === 'unsubscribe'
}

const botUserAgentPatterns: Array<{ pattern: string; reason: string }> = [
  { pattern: 'headlesschrome', reason: 'headless_browser' },
  { pattern: 'phantomjs', reason: 'headless_browser' },
  { pattern: 'puppeteer', reason: 'automation' },
  { pattern: 'selenium', reason: 'automation' },
  { pattern: 'curl', reason: 'http_client' },
  { pattern: 'wget', reason: 'http_client' },
  { pattern: 'python', reason: 'http_client' },
  { pattern: 'go-http-client', reason: 'http_client' },
  { pattern: 'node', reason: 'http_client' },
  { pattern: 'axios/', reason: 'http_client' },
  { pattern: 'okhttp', reason: 'http_client' },
  { pattern: 'apache-httpclient', reason: 'http_client' },
  { pattern: 'java/', reason: 'http_client' },
  { pattern: 'postman', reason: 'http_client' },
  { pattern: 'contentfetcher', reason: 'preview_fetcher' },
  { pattern: 'urlpreview', reason: 'preview_fetcher' },
  { pattern: 'linkpreview', reason: 'preview_fetcher' },
  { pattern: 'googleimageproxy', reason: 'image_proxy' },
  { pattern: 'mailprivacyprotection', reason: 'image_proxy' },
  { pattern: 'emailprivacyproxy', reason: 'image_proxy' },
  { pattern: 'appleimageproxy', reason: 'image_proxy' },
  { pattern: 'mimecast', reason: 'security_gateway' },
  { pattern: 'proofpoint', reason: 'security_gateway' },
  { pattern: 'barracuda', reason: 'security_gateway' },
  { pattern: 'trendmicro', reason: 'security_gateway' },
  { pattern: 'fortigate', reason: 'security_gateway' },
  { pattern: 'fortimail', reason: 'security_gateway' },
  { pattern: 'symantec', reason: 'security_gateway' },
  { pattern: 'mcafee', reason: 'security_gateway' },
  { pattern: 'kaspersky', reason: 'security_gateway' },
  { pattern: 'cisco-secure', reason: 'security_gateway' },
  { pattern: 'ironport', reason: 'security_gateway' },
  { pattern: 'zscaler', reason: 'security_gateway' },
  { pattern: 'paloalto', reason: 'security_gateway' },
  { pattern: 'checkpoint', reason: 'security_gateway' },
  { pattern: 'fireeye', reason: 'security_gateway' },
  { pattern: 'spamassassin', reason: 'security_gateway' },
  { pattern: 'emailscanner', reason: 'security_gateway' },
  { pattern: 'securityscanner', reason: 'security_gateway' },
  { pattern: 'emailsecuritygateway', reason: 'security_gateway' },
  { pattern: 'antivirus', reason: 'security_gateway' },
  { pattern: 'securityappliance', reason: 'security_gateway' },
  { pattern: 'scanner', reason: 'scanner' },
  { pattern: 'bot/', reason: 'bot' },
  { pattern: 'bot;', reason: 'bot' },
  { pattern: 'crawler', reason: 'crawler' },
  { pattern: 'spider', reason: 'crawler' },
  { pattern: 'facebookexternalhit', reason: 'social_preview' },
  { pattern: 'slackbot', reason: 'social_preview' },
]
