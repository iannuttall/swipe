import type { DraftInput } from './types.js'

export function parseEmailContent(raw: string, sourceName = 'email.md'): DraftInput {
  const match = raw.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/)
  if (!match) throw new Error(`${sourceName} must start with frontmatter`)

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
  if (!subject) throw new Error(`${sourceName} is missing subject`)
  if (!preview) throw new Error(`${sourceName} is missing preview`)

  return {
    subject,
    preview,
    template: frontmatter.template ?? 'default',
    bodyMarkdown: (match[2] ?? '').trim(),
  }
}

export function parseWelcomeEmailContent(raw: string): DraftInput {
  return parseEmailContent(raw, 'welcome.md')
}
