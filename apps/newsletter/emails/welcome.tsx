import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { DefaultEmail } from '@email/core'

type WelcomeEmailContent = {
  subject: string
  preview: string
  template: string
  bodyMarkdown: string
}

const contentPath = join(dirname(fileURLToPath(import.meta.url)), 'welcome.md')

export const welcomeEmail = parseMarkdownEmail(readFileSync(contentPath, 'utf8'))

function parseMarkdownEmail(raw: string): WelcomeEmailContent {
  const match = raw.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/)
  if (!match) {
    throw new Error('welcome.md must start with frontmatter.')
  }
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
  const template = frontmatter.template ?? 'default'
  if (!subject) throw new Error('welcome.md is missing subject.')
  if (!preview) throw new Error('welcome.md is missing preview.')
  return {
    subject,
    preview,
    template,
    bodyMarkdown: (match[2] ?? '').trim(),
  }
}

export default function WelcomeEmailPreview() {
  return (
    <DefaultEmail
      subject={welcomeEmail.subject}
      preview={welcomeEmail.preview}
      template={welcomeEmail.template}
      bodyMarkdown={welcomeEmail.bodyMarkdown}
    />
  )
}
