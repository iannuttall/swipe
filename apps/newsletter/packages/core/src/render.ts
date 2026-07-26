import { marked } from 'marked'
import sanitizeHtml from 'sanitize-html'
import { type IssueConditionContext, resolveIssueConditionals } from './issue-parser.js'
import {
  emailTemplateDefinitions,
  isKnownEmailTemplate,
  isReactEmailTemplate,
  renderReactEmailTemplate,
} from './react-email-templates.js'
import type { DraftInput, RenderedEmail } from './types.js'

const allowedTags = [
  'h1',
  'h2',
  'h3',
  'h4',
  'p',
  'a',
  'strong',
  'em',
  'ul',
  'ol',
  'li',
  'blockquote',
  'code',
  'pre',
  'br',
  'hr',
  'div',
  'span',
  'img',
]

export function renderDraft(
  input: DraftInput,
  context: IssueConditionContext = {},
): RenderedEmail {
  const resolved = resolveDraft(input, context)
  const contentHtml = renderMarkdownContent(resolved.bodyMarkdown)
  return renderDefaultEmail(resolved, contentHtml)
}

export async function renderDraftEmail(
  input: DraftInput,
  context: IssueConditionContext = {},
): Promise<RenderedEmail> {
  if (!isKnownEmailTemplate(input.template)) {
    const known = emailTemplateDefinitions.map((definition) => definition.key).join(', ')
    throw new Error(
      `Unknown email template "${input.template}". Known templates: ${known}`,
    )
  }
  const resolved = resolveDraft(input, context)
  const contentHtml = renderMarkdownContent(resolved.bodyMarkdown)
  if (isReactEmailTemplate(resolved.template)) {
    return await renderReactEmailTemplate({
      draft: resolved,
      fallbackText: markdownToText(resolved.bodyMarkdown),
    })
  }
  return renderDefaultEmail(resolved, contentHtml)
}

export function listEmailTemplates(): Array<{
  key: string
  name: string
  description: string
  engine: string
}> {
  return emailTemplateDefinitions.map((template) => ({ ...template }))
}

function renderMarkdownContent(markdown: string): string {
  const rawHtml = marked.parse(markdown, {
    async: false,
    gfm: true,
    breaks: true,
  })
  return sanitizeHtml(rawHtml, {
    allowedTags,
    allowedAttributes: {
      a: ['href', 'name', 'target', 'rel'],
      img: ['src', 'alt', 'title', 'width', 'height'],
      code: ['class'],
      pre: ['class'],
      div: ['class'],
      span: ['class'],
    },
    allowedSchemes: ['http', 'https', 'mailto'],
    allowedSchemesByTag: {
      img: ['http', 'https'],
    },
    allowProtocolRelative: false,
    transformTags: {
      a: sanitizeHtml.simpleTransform(
        'a',
        { rel: 'noopener noreferrer', target: '_blank' },
        true,
      ),
    },
  })
}

function renderDefaultEmail(input: DraftInput, contentHtml: string): RenderedEmail {
  return {
    subject: input.subject,
    html: wrapEmailHtml(contentHtml, input.preview),
    text: markdownToText(input.bodyMarkdown),
    ...(input.preview ? { preview: input.preview } : {}),
  }
}

export function markdownToText(markdown: string): string {
  return markdown
    .replace(/```[\s\S]*?```/g, '')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/!\[[^\]]*]\([^)]*\)/g, '')
    .replace(/\[([^\]]+)]\(([^)]+)\)/g, '$1 ($2)')
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/[*_~>]/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

function resolveDraft(input: DraftInput, context: IssueConditionContext): DraftInput {
  return {
    ...input,
    bodyMarkdown: resolveIssueConditionals(input.bodyMarkdown, context),
  }
}

function wrapEmailHtml(contentHtml: string, preview?: string): string {
  const previewHtml = preview
    ? `<div style="display:none;max-height:0;overflow:hidden">${escapeHtml(preview)}</div>`
    : ''

  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <style>
      body { margin:0; padding:24px; background:#f6f7f8; color:#171717; font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif; }
      .email-shell { max-width:640px; margin:0 auto; background:#fff; border:1px solid #e5e7eb; border-radius:8px; padding:32px; }
      .email-content { font-size:16px; line-height:1.65; }
      .email-content a { color:#db2777; text-decoration:underline; }
      .email-footer { max-width:640px; margin:16px auto 0; color:#6b7280; font-size:13px; line-height:1.5; }
    </style>
  </head>
  <body>
    ${previewHtml}
    <main class="email-shell">
      <div class="email-content">${contentHtml}</div>
    </main>
    <footer class="email-footer">
      <p><a href="{{unsubscribeUrl}}">Unsubscribe</a></p>
    </footer>
  </body>
</html>`
}

function escapeHtml(input: string): string {
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}
