import { readFileSync } from 'node:fs'
import type { AppConfig } from './config.js'
import { requireSecret } from './config.js'
import type { ProviderSendInput } from './providers.js'
import { renderDraftEmail } from './render.js'
import type { DraftInput } from './types.js'

export const welcomeEmailContent = parseWelcomeEmailContent(
  readFileSync(new URL('./welcome.md', import.meta.url), 'utf8'),
)

export function parseWelcomeEmailContent(raw: string): DraftInput {
  const match = raw.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/)
  if (!match) throw new Error('welcome.md must start with frontmatter')

  const frontmatter = Object.fromEntries(
    (match[1] ?? '')
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => {
        const separator = line.indexOf(':')
        if (separator === -1) throw new Error(`Invalid frontmatter line: ${line}`)
        const key = line.slice(0, separator).trim()
        const value = line
          .slice(separator + 1)
          .trim()
          .replace(/^["']|["']$/g, '')
        return [key, value]
      }),
  )
  const subject = frontmatter.subject
  const preview = frontmatter.preview
  if (!subject) throw new Error('welcome.md is missing subject')
  if (!preview) throw new Error('welcome.md is missing preview')

  return {
    subject,
    preview,
    template: frontmatter.template ?? 'default',
    bodyMarkdown: (match[2] ?? '').trim(),
  }
}

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
