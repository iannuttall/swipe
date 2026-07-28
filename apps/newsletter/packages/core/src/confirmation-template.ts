import type { AppConfig } from './config.js'
import type { ProviderSendInput } from './providers.js'
import { renderDraftEmail } from './render.js'

export async function doubleOptInEmail(input: {
  config: AppConfig
  email: string
  confirmationUrl: string
}): Promise<ProviderSendInput> {
  const appName = input.config.appName
  const fromName = input.config.email.fromName
  const subject = `Confirm your ${appName} subscription`
  const preview = 'Click to confirm your email & get the best AI skills and workflows.'
  const rendered = await renderDraftEmail({
    subject,
    preview,
    bodyMarkdown: [
      '<Header name="Confirm your email" read-time="off" />',
      '',
      '# Confirm your email',
      '',
      `Confirm that you want to receive ${appName}.`,
      '',
      `<Cta url="${input.confirmationUrl}" label="Confirm my subscription" variant="signup" />`,
      '',
      'If you did not request this, ignore this email.',
      '',
      '<Footer unsubscribe="false" />',
    ].join('\n'),
  })
  const text = `Confirm your email

Confirm that you want to receive ${appName}.

${input.confirmationUrl}

If you did not request this, ignore this email.`

  return {
    to: input.email,
    fromEmail: requiredFromEmail(input.config),
    subject,
    html: rendered.html,
    text,
    ...(fromName ? { fromName } : {}),
  }
}

function requiredFromEmail(config: AppConfig): string {
  if (!config.email.fromEmail)
    throw new Error('Missing required secret: EMAIL_FROM_EMAIL')
  return config.email.fromEmail
}
