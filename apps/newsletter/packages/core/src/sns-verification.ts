import crypto from 'node:crypto'
import { z } from 'zod'

const certCache = new Map<string, { certificate: string; expiresAt: number }>()
const certCacheTtlMs = 6 * 60 * 60 * 1000

export const snsMessageSchema = z.object({
  Type: z.enum(['Notification', 'SubscriptionConfirmation', 'UnsubscribeConfirmation']),
  MessageId: z.string(),
  Message: z.string(),
  Timestamp: z.string(),
  TopicArn: z.string().optional(),
  Subject: z.string().optional(),
  Token: z.string().optional(),
  SubscribeURL: z.string().url().optional(),
  SignatureVersion: z.string().optional(),
  Signature: z.string().optional(),
  SigningCertURL: z.string().url().optional(),
})

export type SnsMessage = z.infer<typeof snsMessageSchema>

export interface SnsVerificationOptions {
  allowedCertHostSuffixes: string[]
  fetchCertificate?: (url: string) => Promise<string>
  now?: () => number
}

export interface SnsSubscriptionConfirmationOptions {
  allowedSubscribeHostSuffixes: string[]
  fetchUrl?: (url: string) => Promise<Response>
}

export function parseSnsMessage(input: unknown): SnsMessage {
  return snsMessageSchema.parse(input)
}

export function isAllowedSnsTopic(
  topicArn: string | undefined,
  allowedTopics: string[],
): boolean {
  if (!allowedTopics.length) return false
  return topicArn ? allowedTopics.includes(topicArn) : false
}

export function isAllowedAwsUrl(url: string, allowedHostSuffixes: string[]): boolean {
  let parsed: URL
  try {
    parsed = new URL(url)
  } catch {
    return false
  }

  if (parsed.protocol !== 'https:') return false
  const hostname = parsed.hostname.toLowerCase()
  return allowedHostSuffixes.some((suffix) => {
    const normalized = suffix.toLowerCase()
    return hostname === normalized || hostname.endsWith(`.${normalized}`)
  })
}

export function isAllowedSnsSigningCertUrl(
  url: string,
  allowedHostSuffixes: string[],
): boolean {
  if (!isAllowedAwsUrl(url, allowedHostSuffixes)) return false
  const parsed = new URL(url)
  return isSnsServiceHostname(parsed.hostname) && isSnsCertificatePath(parsed.pathname)
}

export function isAllowedSnsSubscribeUrl(
  url: string,
  allowedHostSuffixes: string[],
): boolean {
  if (!isAllowedAwsUrl(url, allowedHostSuffixes)) return false
  return isSnsServiceHostname(new URL(url).hostname)
}

export function buildSnsStringToSign(message: SnsMessage): string {
  const fields =
    message.Type === 'Notification'
      ? ['Message', 'MessageId', 'Subject', 'Timestamp', 'TopicArn', 'Type']
      : ['Message', 'MessageId', 'SubscribeURL', 'Timestamp', 'Token', 'TopicArn', 'Type']

  return fields
    .flatMap((field) => {
      const value = message[field as keyof SnsMessage]
      return typeof value === 'string' ? [`${field}\n${value}\n`] : []
    })
    .join('')
}

export async function verifySnsSignature(
  message: SnsMessage,
  options: SnsVerificationOptions,
): Promise<boolean> {
  if (!message.Signature || !message.SigningCertURL || !message.SignatureVersion) {
    return false
  }

  if (
    !isAllowedSnsSigningCertUrl(message.SigningCertURL, options.allowedCertHostSuffixes)
  ) {
    return false
  }

  const algorithm = signatureAlgorithm(message.SignatureVersion)
  if (!algorithm) return false

  const certificate = await getSigningCertificate(message.SigningCertURL, options)
  const verifier = crypto.createVerify(algorithm)
  verifier.update(buildSnsStringToSign(message), 'utf8')
  verifier.end()

  return verifier.verify(certificate, message.Signature, 'base64')
}

export async function confirmSnsSubscription(
  message: SnsMessage,
  options: SnsSubscriptionConfirmationOptions,
): Promise<boolean> {
  if (
    message.Type !== 'SubscriptionConfirmation' ||
    !message.SubscribeURL ||
    !isAllowedSnsSubscribeUrl(message.SubscribeURL, options.allowedSubscribeHostSuffixes)
  ) {
    return false
  }

  const response = await (options.fetchUrl ?? fetch)(message.SubscribeURL)
  return response.ok
}

async function getSigningCertificate(
  url: string,
  options: SnsVerificationOptions,
): Promise<string> {
  const now = options.now?.() ?? Date.now()
  const cached = certCache.get(url)
  if (cached && cached.expiresAt > now) return cached.certificate

  const certificate = options.fetchCertificate
    ? await options.fetchCertificate(url)
    : await fetchCertificate(url)
  certCache.set(url, { certificate, expiresAt: now + certCacheTtlMs })
  return certificate
}

async function fetchCertificate(url: string): Promise<string> {
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`Failed to fetch SNS signing certificate: ${response.status}`)
  }
  return response.text()
}

function signatureAlgorithm(version: string): 'RSA-SHA1' | 'RSA-SHA256' | undefined {
  if (version === '1') return 'RSA-SHA1'
  if (version === '2') return 'RSA-SHA256'
  return undefined
}

function isSnsServiceHostname(hostname: string): boolean {
  return /^sns\.[a-z0-9-]+\.amazonaws\.com(\.cn)?$/.test(hostname.toLowerCase())
}

function isSnsCertificatePath(pathname: string): boolean {
  return /^\/SimpleNotificationService(-[A-Za-z0-9]+)?\.pem$/.test(pathname)
}
