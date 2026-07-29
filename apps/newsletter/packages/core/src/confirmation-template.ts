import { readFileSync } from 'node:fs'
import type { AppConfig } from './config.js'
import type { ProviderSendInput } from './providers.js'
import { renderDraftEmail } from './render.js'
import { parseEmailContent } from './welcome-content.js'

export const confirmationEmailContent = parseEmailContent(
  readFileSync(new URL('./confirmation.md', import.meta.url), 'utf8'),
  'confirmation.md',
)

export async function doubleOptInEmail(input: {
  config: AppConfig
  email: string
  confirmationUrl: string
}): Promise<ProviderSendInput> {
  const appName = input.config.appName
  const fromName = input.config.email.fromName
  const rendered = await renderDraftEmail({
    ...confirmationEmailContent,
    subject: replacePlaceholders(confirmationEmailContent.subject, {
      appName,
      confirmationUrl: input.confirmationUrl,
    }),
    preview: replacePlaceholders(confirmationEmailContent.preview ?? '', {
      appName,
      confirmationUrl: input.confirmationUrl,
    }),
    bodyMarkdown: replacePlaceholders(confirmationEmailContent.bodyMarkdown, {
      appName,
      confirmationUrl: input.confirmationUrl,
    }),
  })

  return {
    to: input.email,
    fromEmail: requiredFromEmail(input.config),
    subject: rendered.subject,
    html: rendered.html,
    text: rendered.text,
    ...(fromName ? { fromName } : {}),
  }
}

function requiredFromEmail(config: AppConfig): string {
  if (!config.email.fromEmail)
    throw new Error('Missing required secret: EMAIL_FROM_EMAIL')
  return config.email.fromEmail
}

function replacePlaceholders(
  value: string,
  replacements: Record<string, string>,
): string {
  return Object.entries(replacements).reduce(
    (result, [key, replacement]) => result.replaceAll(`{{${key}}}`, replacement),
    value,
  )
}
