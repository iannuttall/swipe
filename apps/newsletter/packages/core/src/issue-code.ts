import { createElement as h } from 'react'
import { CodeBlock, type PrismLanguage, type Theme } from 'react-email'
import { issueColors, issueSectionPalette } from './issue-palette.js'

// Light theme matching the issue palette: the section-box tint as the
// surface, ink for text, and the DD section squares for token accents.
export const issueCodeTheme = {
  base: {
    fontFamily: 'Menlo,Consolas,monospace',
    // Body copy is 18/27; code matches it instead of reading like fine print.
    fontSize: '18px',
    lineHeight: '27px',
    color: issueColors.ink,
    backgroundColor: issueColors.highlight,
    padding: '16px',
    borderRadius: '4px',
    margin: '0 0 15px',
    // Email clients have no horizontal scroll; wrap long lines instead of
    // blowing out the 640px frame.
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-word',
  },
  comment: { color: issueColors.grey, fontStyle: 'italic' },
  prolog: { color: issueColors.grey },
  doctype: { color: issueColors.grey },
  cdata: { color: issueColors.grey },
  punctuation: { color: issueColors.grey },
  keyword: { color: issueSectionPalette.pink.square },
  tag: { color: issueSectionPalette.pink.square },
  boolean: { color: issueSectionPalette.orange.square },
  number: { color: issueSectionPalette.orange.square },
  string: { color: issueSectionPalette.green.square },
  char: { color: issueSectionPalette.green.square },
  'attr-value': { color: issueSectionPalette.green.square },
  function: { color: issueSectionPalette.blue.square },
  'class-name': { color: issueSectionPalette.blue.square },
  'attr-name': { color: issueSectionPalette.blue.square },
  selector: { color: issueSectionPalette.purple.square },
  builtin: { color: issueSectionPalette.purple.square },
  variable: { color: issueColors.ink },
  operator: { color: issueColors.grey },
  url: { color: issueSectionPalette.teal.square },
} as Theme

// Languages we realistically fence in issues. Anything else falls back to
// markdown, which highlights nothing but never crashes Prism.
const knownLanguages = new Set([
  'bash',
  'sh',
  'shell',
  'css',
  'diff',
  'docker',
  'dockerfile',
  'go',
  'html',
  'ini',
  'javascript',
  'js',
  'json',
  'jsx',
  'markdown',
  'md',
  'python',
  'py',
  'rust',
  'sql',
  'toml',
  'ts',
  'tsx',
  'typescript',
  'yaml',
  'yml',
])

export function normalizeCodeLanguage(raw: string | undefined): PrismLanguage {
  const lang = raw?.trim().toLowerCase() ?? ''
  return (knownLanguages.has(lang) ? lang : 'markdown') as PrismLanguage
}

// Prism highlights shell "commands" from a fixed list of known binaries, so
// `npm` gets colored while a personal CLI like `seo` stays plain. Uniform ink
// beats that lottery for one-line commands.
const shellLanguages = new Set(['bash', 'sh', 'shell'])

export function issueCodeBlock(code: string, language?: string, key?: string) {
  const normalized = normalizeCodeLanguage(language)
  const theme = shellLanguages.has(normalized)
    ? ({ ...issueCodeTheme, function: { color: issueColors.ink } } as Theme)
    : issueCodeTheme
  return h(CodeBlock, {
    key,
    code,
    language: normalized,
    theme,
    // CodeBlock forces width:100%, which overflows its cell by the padding
    // (content-box). A block pre with width:auto fills the column instead.
    style: { width: 'auto' },
  })
}

export interface IssueBodySegment {
  kind: 'markdown' | 'code'
  content: string
  language?: string
}

const fenceLine = /^(```|~~~)\s*([\w-]*)\s*$/

/**
 * Split a section body into markdown and fenced-code segments so code can
 * render through <CodeBlock> instead of the Markdown component's <pre>.
 */
export function splitIssueBody(markdown: string): IssueBodySegment[] {
  const segments: IssueBodySegment[] = []
  let buffer: string[] = []
  let fence: { marker: string; language?: string; lines: string[] } | null = null

  const flushMarkdown = () => {
    const content = buffer.join('\n').trim()
    buffer = []
    if (content) segments.push({ kind: 'markdown', content })
  }

  for (const line of markdown.split(/\r?\n/)) {
    const match = line.trim().match(fenceLine)
    if (fence) {
      if (match && match[1] === fence.marker && !match[2]) {
        segments.push({
          kind: 'code',
          content: fence.lines.join('\n'),
          ...(fence.language ? { language: fence.language } : {}),
        })
        fence = null
      } else {
        fence.lines.push(line)
      }
      continue
    }
    if (match) {
      flushMarkdown()
      fence = {
        marker: match[1] ?? '```',
        ...(match[2] ? { language: match[2] } : {}),
        lines: [],
      }
      continue
    }
    buffer.push(line)
  }

  // Unterminated fence: keep the content as code rather than dropping it.
  if (fence) {
    segments.push({
      kind: 'code',
      content: fence.lines.join('\n'),
      ...(fence.language ? { language: fence.language } : {}),
    })
  }
  flushMarkdown()
  return segments
}
