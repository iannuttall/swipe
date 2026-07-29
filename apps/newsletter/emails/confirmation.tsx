import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { DefaultEmail } from '@email/core/react-email-templates'
import { parseEmailContent } from '@email/core/welcome-content'

const contentPath = join(process.cwd(), 'emails', 'confirmation.md')
const content = parseEmailContent(readFileSync(contentPath, 'utf8'), 'confirmation.md')
const previewValues = {
  appName: 'Swipe',
  confirmationUrl: 'https://swipe.md/confirm?token=preview',
}

export default function ConfirmationEmailPreview() {
  return (
    <DefaultEmail
      {...content}
      subject={replacePlaceholders(content.subject)}
      preview={replacePlaceholders(content.preview ?? '')}
      bodyMarkdown={replacePlaceholders(content.bodyMarkdown)}
    />
  )
}

function replacePlaceholders(value: string): string {
  return Object.entries(previewValues).reduce(
    (result, [key, replacement]) => result.replaceAll(`{{${key}}}`, replacement),
    value,
  )
}
