import { render, toPlainText } from 'react-email'
import { DefaultEmail } from './default-template.js'
import { issueMsoHeadHtml } from './issue-styles.js'
import type { DraftInput, RenderedEmail } from './types.js'

export const emailTemplateDefinitions = [
  {
    key: 'default',
    name: 'Default',
    description: 'Swipe newsletter shell.',
    engine: 'react-email',
  },
] as const

export { DefaultEmail } from './default-template.js'

export function isReactEmailTemplate(template?: string): boolean {
  return !template || template === 'default'
}

export function isKnownEmailTemplate(template?: string): boolean {
  if (!template) return true
  return emailTemplateDefinitions.some((definition) => definition.key === template)
}

export async function renderReactEmailTemplate(input: {
  draft: DraftInput
  fallbackText: string
}): Promise<RenderedEmail> {
  let html = await render(DefaultEmail(input.draft))
  // React cannot emit conditional comments; inject the Outlook font fallback
  // into the head after rendering.
  html = html.replace('</head>', `${issueMsoHeadHtml}</head>`)
  const text = toPlainText(html).trim() || input.fallbackText
  return {
    subject: input.draft.subject,
    html,
    text,
    ...(input.draft.preview ? { preview: input.draft.preview } : {}),
  }
}
