import type { AppConfig } from './config.js'
import { requireSecret } from './config.js'
import type { ProviderSendInput } from './providers.js'
import { renderDraftEmail } from './render.js'
import type { DraftInput } from './types.js'

export const welcomeEmailContent = {
  subject: "You're on Swipe",
  preview: 'One small favour before the first issue.',
  template: 'default',
  bodyMarkdown: `Hey, you're on Swipe.

Every week we send useful AI skills, prompts, tools, and workflows worth stealing.

<Text title="Help the next issue land in the right place">
- If this message is in spam, mark it as not spam.
- In Gmail, move it from Promotions to Primary and choose Yes when Gmail asks about future messages.
- Add ian@swipe.md to your contacts or safe sender list.
- Reply and say hi. You can also tell us what you want to use AI for.
</Text>

That tells your email app you asked for Swipe and want future issues.

See you in the next issue,

Swipe`,
} satisfies DraftInput

export async function welcomeEmail(input: {
  config: AppConfig
  email: string
  unsubscribeUrl: string
}): Promise<ProviderSendInput> {
  const fromEmail = requireSecret(input.config.email.fromEmail, 'EMAIL_FROM_EMAIL')
  const fromName = input.config.email.fromName
  const rendered = await renderDraftEmail({
    ...welcomeEmailContent,
    bodyMarkdown: welcomeEmailContent.bodyMarkdown.replace('ian@swipe.md', fromEmail),
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
