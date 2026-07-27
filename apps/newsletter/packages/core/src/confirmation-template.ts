import type { AppConfig } from './config.js'
import type { ProviderSendInput } from './providers.js'

export function doubleOptInEmail(input: {
  config: AppConfig
  email: string
  confirmationUrl: string
}): ProviderSendInput {
  const appName = input.config.appName
  const fromName = input.config.email.fromName
  const subject = `Confirm your ${appName} subscription`
  const escapedUrl = escapeHtml(input.confirmationUrl)
  const html = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>${escapeHtml(subject)}</title>
  </head>
  <body style="margin:0;padding:24px;background:#f6f7f8;color:#171717;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif">
    <main style="max-width:560px;margin:0 auto;background:#fff;padding:32px;border:1px solid #e5e7eb">
      <h1 style="margin:0 0 16px;font-size:28px;line-height:1.15">Confirm your email</h1>
      <p style="margin:0 0 24px;font-size:17px;line-height:1.6">Confirm that you want to receive ${escapeHtml(appName)}.</p>
      <p style="margin:0">
        <a href="${escapedUrl}" data-track="false" style="display:inline-block;background:#171717;color:#fff;padding:14px 20px;text-decoration:none;font-weight:600">Confirm my subscription</a>
      </p>
      <p style="margin:24px 0 0;color:#6b7280;font-size:13px;line-height:1.5">If you did not request this, ignore this email.</p>
    </main>
  </body>
</html>`
  const text = `Confirm your email

Confirm that you want to receive ${appName}.

${input.confirmationUrl}

If you did not request this, ignore this email.`

  return {
    to: input.email,
    fromEmail: requiredFromEmail(input.config),
    subject,
    html,
    text,
    ...(fromName ? { fromName } : {}),
  }
}

function requiredFromEmail(config: AppConfig): string {
  if (!config.email.fromEmail)
    throw new Error('Missing required secret: EMAIL_FROM_EMAIL')
  return config.email.fromEmail
}

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}
