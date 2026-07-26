export interface IssueSection {
  type: string
  attrs: Record<string, string>
  body: string
  items: string[]
}

export interface IssueLinkItem {
  title: string
  url: string
  tagline: string
  description: string
}

export interface IssueConditionContext {
  status?: string
}

export const issueSectionTypes = [
  'hero',
  'header',
  'lead',
  'text',
  'links',
  'sponsor',
  'box',
  'classifieds',
  'quote',
  'poll',
  'footer',
] as const

const componentTypes = new Map(
  [...issueSectionTypes, 'conditional'].map((type) => [
    type.replace(/(^|-)([a-z])/g, (_, _dash, letter: string) => letter.toUpperCase()),
    type,
  ]),
)
const directiveStart = /^:::\s*([a-z][\w-]*)\s*(.*)$/
const directiveEnd = /^:::\s*$/
const componentStart = /^<([A-Z][A-Za-z0-9]*)\b([^>]*)>\s*$/
const componentSelfClosing = /^<([A-Z][A-Za-z0-9]*)\b([^>]*)\/>\s*$/
const componentEnd = /^<\/([A-Z][A-Za-z0-9]*)>\s*$/
const attrPattern = /([\w-]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+))/g
const itemDivider = /^---\s*$/
const itemHeading = /^#{2,6}\s+/
const codeFence = /^(```|~~~)/

/**
 * Removes recipient-only blocks before the normal issue parser runs.
 * Conditional tags must sit on their own lines, which keeps the source valid,
 * readable Markdown and allows normal issue components inside them.
 */
export function resolveIssueConditionals(
  markdown: string,
  context: IssueConditionContext = {},
): string {
  const output: string[] = []
  const conditions: boolean[] = []
  let inCodeFence = false

  for (const line of markdown.split(/\r?\n/)) {
    if (codeFence.test(line.trim())) {
      inCodeFence = !inCodeFence
      if (conditions.every(Boolean)) output.push(line)
      continue
    }

    if (!inCodeFence) {
      const start = line.trim().match(/^<Conditional\b([^>]*)>$/)
      if (start) {
        const attrs = parseAttrs(start[1] ?? '')
        const condition = attrs.if
        if (!condition) throw new Error('Conditional requires an if attribute')
        conditions.push(matchesCondition(condition, context))
        continue
      }
      if (/^<\/Conditional>\s*$/.test(line.trim())) {
        if (conditions.length === 0) {
          throw new Error('Conditional closing tag has no opening tag')
        }
        conditions.pop()
        continue
      }
    }

    if (conditions.every(Boolean)) output.push(line)
  }

  if (conditions.length > 0) throw new Error('Conditional block is not closed')
  return output.join('\n')
}

export function parseIssueSections(markdown: string): IssueSection[] {
  const sections: IssueSection[] = []
  const proseLines: string[] = []
  let current:
    | {
        type: string
        attrs: Record<string, string>
        lines: string[]
        componentName?: string
      }
    | undefined
  let inCodeFence = false

  const flushProse = () => {
    const body = proseLines.join('\n').trim()
    proseLines.length = 0
    if (body) sections.push(makeSection('text', {}, body))
  }

  for (const line of markdown.split(/\r?\n/)) {
    if (codeFence.test(line.trim())) inCodeFence = !inCodeFence
    if (!inCodeFence) {
      if (current) {
        const componentClose = line.trim().match(componentEnd)
        const closesComponent =
          current.componentName && componentClose?.[1] === current.componentName
        const closesDirective = !current.componentName && directiveEnd.test(line.trim())
        if (closesComponent || closesDirective) {
          sections.push(
            makeSection(current.type, current.attrs, current.lines.join('\n').trim()),
          )
          current = undefined
          continue
        }
      } else {
        const selfClosing = line.trim().match(componentSelfClosing)
        const selfClosingType = selfClosing
          ? componentTypes.get(selfClosing[1] ?? '')
          : ''
        if (selfClosing && selfClosingType && selfClosingType !== 'conditional') {
          flushProse()
          sections.push(
            makeSection(selfClosingType, parseAttrs(selfClosing[2] ?? ''), ''),
          )
          continue
        }

        const component = line.trim().match(componentStart)
        const componentType = component ? componentTypes.get(component[1] ?? '') : ''
        if (component && componentType && componentType !== 'conditional') {
          flushProse()
          current = {
            type: componentType,
            attrs: parseAttrs(component[2] ?? ''),
            lines: [],
            componentName: component[1] ?? '',
          }
          continue
        }

        const directive = line.trim().match(directiveStart)
        if (directive && !directiveEnd.test(line.trim())) {
          flushProse()
          current = {
            type: directive[1] ?? 'text',
            attrs: parseAttrs(directive[2] ?? ''),
            lines: [],
          }
          continue
        }
      }
    }
    if (current) current.lines.push(line)
    else proseLines.push(line)
  }

  if (current) {
    // Keep malformed source visible instead of silently dropping authored text.
    sections.push(
      makeSection(current.type, current.attrs, current.lines.join('\n').trim()),
    )
  }
  flushProse()
  return sections
}

export function parseLinkItem(item: string): IssueLinkItem {
  const lines = item.split('\n')
  let title = ''
  let url = ''
  const taglineLines: string[] = []
  let index = 0

  while (index < lines.length && (lines[index] ?? '').trim() === '') index++
  if (index < lines.length) {
    const heading = (lines[index] ?? '').trim().replace(/^#+\s*/, '')
    const link = heading.match(/\[([^\]]+)]\(([^)\s]+)\)/)
    if (link) {
      title = link[1] ?? ''
      url = link[2] ?? ''
    } else {
      title = heading
    }
    index++
  }
  while (index < lines.length && (lines[index] ?? '').trim() !== '') {
    taglineLines.push((lines[index] ?? '').trim())
    index++
  }
  const description = lines.slice(index).join('\n').trim()
  return { title, url, tagline: taglineLines.join(' '), description }
}

function matchesCondition(condition: string, context: IssueConditionContext): boolean {
  const separator = condition.indexOf(':')
  if (separator === -1) throw new Error(`Invalid issue condition: ${condition}`)
  const field = condition.slice(0, separator)
  const expected = condition.slice(separator + 1)
  if (field !== 'status' || !expected) {
    throw new Error(`Unsupported issue condition: ${condition}`)
  }
  return context.status === expected
}

function makeSection(
  type: string,
  attrs: Record<string, string>,
  body: string,
): IssueSection {
  return { type, attrs, body, items: splitItems(body) }
}

function splitItems(body: string): string[] {
  const lines = body.split(/\r?\n/)
  if (lines.some((line) => itemDivider.test(line))) {
    return splitOn(lines, (line) => itemDivider.test(line))
  }
  if (lines.some((line) => itemHeading.test(line))) {
    return splitOn(lines, (line) => itemHeading.test(line), true)
  }
  const value = body.trim()
  return value ? [value] : []
}

function splitOn(
  lines: string[],
  boundary: (line: string) => boolean,
  keepBoundary = false,
): string[] {
  const items: string[] = []
  let buffer: string[] = []
  for (const line of lines) {
    if (boundary(line) && buffer.some((value) => value.trim())) {
      items.push(buffer.join('\n').trim())
      buffer = []
    }
    if (keepBoundary || !boundary(line)) buffer.push(line)
  }
  const tail = buffer.join('\n').trim()
  if (tail) items.push(tail)
  return items
}

function parseAttrs(source: string): Record<string, string> {
  const attrs: Record<string, string> = {}
  for (const match of source.matchAll(attrPattern)) {
    attrs[match[1] ?? ''] = match[2] ?? match[3] ?? match[4] ?? ''
  }
  return attrs
}
