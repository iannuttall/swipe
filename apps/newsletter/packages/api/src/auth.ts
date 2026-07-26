import crypto from 'node:crypto'
import type { AppConfig } from '@email/core'

export function isAuthorized(
  authorization: string | undefined,
  apiTokenHeader: string | undefined,
  config: AppConfig,
): boolean {
  const configured = config.apiToken
  if (!configured) return false
  const bearer = authorization?.startsWith('Bearer ')
    ? authorization.slice('Bearer '.length)
    : undefined
  return safeEqual(apiTokenHeader ?? bearer ?? '', configured)
}

export function safeEqual(a: string, b: string): boolean {
  if (!a || !b || a.length !== b.length) return false
  return crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b))
}
