import { readFileSync } from 'node:fs'
import type { AppConfig } from './config.js'
import { requireSecret } from './config.js'
import type { ProviderSendInput } from './providers.js'
import { renderDraftEmail } from './render.js'
import { parseWelcomeEmailContent } from './welcome-content.js'

export const welcomeEmailContent = parseWelcomeEmailContent(
  readFileSync(new URL('./welcome.md', import.meta.url), 'utf8'),
)

export async function welcomeEmail(input: {
  config: AppConfig
  email: string
  unsubscribeUrl: string
}): Promise<ProviderSendInput> {
  const fromEmail = requireSecret(input.config.email.fromEmail, 'EMAIL_FROM_EMAIL')
  const fromName = input.config.email.fromName
  const rendered = await renderDraftEmail({
    ...welcomeEmailContent,
    bodyMarkdown: welcomeEmailContent.bodyMarkdown.replaceAll('{{fromEmail}}', fromEmail),
  })

  return {
    to: input.email,
    fromEmail,
    subject: rendered.subject,
    html: rendered.html.replaceAll('{{unsubscribeUrl}}', input.unsubscribeUrl),
    text: rendered.text.replaceAll('{{unsubscribeUrl}}', input.unsubscribeUrl),
    replyTo: fromEmail,
    ...(fromName ? { fromName } : {}),
    headers: [
      {
        name: 'List-Unsubscribe',
        value: `<${input.unsubscribeUrl}>`,
      },
      { name: 'List-Unsubscribe-Post', value: 'List-Unsubscribe=One-Click' },
    ],
  }
}
