export interface IssueItemSection {
  type: string
  attrs: Record<string, string>
  body: string
}

export interface IssueItem {
  id: string
  title: string
  url: string
  summary: string
  chip: string
  sponsor: boolean
  newRelease: boolean
  kind: 'tool' | 'workflow'
  sponsorLabel: string
  whyLabel: string
  tryLabel: string
  description: string
  why: string
  try: string
}

type ItemPart = 'description' | 'why' | 'try' | 'like' | 'dislike'

const itemId = /^[a-z0-9]+(?:-[a-z0-9]+)*$/
const codeFence = /^(```|~~~)/

export function parseIssueItem(section: IssueItemSection): IssueItem {
  if (section.type !== 'item') {
    throw new Error(`Expected an item section, received ${section.type}`)
  }

  const id = section.attrs.id?.trim() ?? ''
  const title = section.attrs.title?.trim() ?? ''
  if (!id || !itemId.test(id)) {
    throw new Error('Item requires a lowercase, hyphenated id')
  }
  if (!title) throw new Error(`Item ${id} requires a title`)

  const sponsor = isTruthy(section.attrs.sponsor)
  const summary = section.attrs.summary?.trim() ?? ''
  const parts = splitItemBody(section.body, id)
  const hasCurrentBlocks = Boolean(parts.why || parts.try)
  const hasLegacyBlocks = Boolean(parts.like || parts.dislike)
  if (!parts.description) throw new Error(`Item ${id} requires a description`)
  if (hasCurrentBlocks && hasLegacyBlocks) {
    throw new Error(`Item ${id} must not mix Why/Try with Like/Dislike blocks`)
  }
  if (hasCurrentBlocks) {
    if (!parts.why) throw new Error(`Item ${id} requires a Why block`)
    if (!parts.try) throw new Error(`Item ${id} requires a Try block`)
    const summaryWordCount = summary.split(/\s+/).filter(Boolean).length
    if (summaryWordCount < 4 || summaryWordCount > 5) {
      throw new Error(`Item ${id} requires a four-to-five-word summary`)
    }
  } else if (hasLegacyBlocks && !sponsor) {
    if (!parts.like) throw new Error(`Item ${id} requires a Like block`)
    if (!parts.dislike) throw new Error(`Item ${id} requires a Dislike block`)
  } else if (sponsor && hasLegacyBlocks) {
    throw new Error(`Sponsor item ${id} must not use Like or Dislike blocks`)
  } else {
    throw new Error(`Item ${id} requires Why and Try blocks`)
  }

  const url = section.attrs.url?.trim() ?? ''
  const newRelease = isTruthy(section.attrs.new)
  const kind = itemKind(section.attrs.kind, id)
  return {
    id,
    title,
    url,
    summary: summary || parts.description,
    chip: section.attrs.chip?.trim() || (sponsor ? '✦' : newRelease ? 'β' : '＋'),
    sponsor,
    newRelease,
    kind,
    sponsorLabel: section.attrs['sponsor-label']?.trim() || '[sponsor]',
    whyLabel: hasCurrentBlocks
      ? section.attrs['why-label']?.trim() || 'Why:'
      : section.attrs['like-label']?.trim() ||
        section.attrs['swipe-label']?.trim() ||
        'What we like:',
    tryLabel: hasCurrentBlocks
      ? section.attrs['try-label']?.trim() || 'Try:'
      : section.attrs['dislike-label']?.trim() ||
        section.attrs['verdict-label']?.trim() ||
        "What we don't like:",
    description: parts.description,
    why: parts.why || parts.like,
    try: parts.try || parts.dislike,
  }
}

export function parseIssueItems(sections: IssueItemSection[]): IssueItem[] {
  const items = sections.filter((section) => section.type === 'item').map(parseIssueItem)
  const ids = new Set<string>()
  for (const item of items) {
    if (ids.has(item.id)) throw new Error(`Duplicate item id: ${item.id}`)
    ids.add(item.id)
  }
  return items
}

function splitItemBody(body: string, id: string): Record<ItemPart, string> {
  const parts: Record<ItemPart, string[]> = {
    description: [],
    why: [],
    try: [],
    like: [],
    dislike: [],
  }
  let current: ItemPart = 'description'
  let open: ItemPart | undefined
  let inCodeFence = false

  for (const line of body.split(/\r?\n/)) {
    if (codeFence.test(line.trim())) inCodeFence = !inCodeFence
    if (!inCodeFence) {
      const start = line.trim().match(/^<(Why|Try|Like|Dislike|Swipe|Verdict)>$/)
      if (start) {
        if (open) throw new Error(`Item ${id} has nested content blocks`)
        current = itemPart(start[1] ?? '')
        open = current
        continue
      }
      const end = line.trim().match(/^<\/(Why|Try|Like|Dislike|Swipe|Verdict)>$/)
      if (end) {
        const closing = itemPart(end[1] ?? '')
        if (open !== closing) throw new Error(`Item ${id} has a mismatched content block`)
        current = 'description'
        open = undefined
        continue
      }
    }
    parts[current].push(line)
  }

  if (open) throw new Error(`Item ${id} has an unclosed ${open} block`)
  return {
    description: parts.description.join('\n').trim(),
    why: parts.why.join('\n').trim(),
    try: parts.try.join('\n').trim(),
    like: parts.like.join('\n').trim(),
    dislike: parts.dislike.join('\n').trim(),
  }
}

function itemPart(name: string): ItemPart {
  if (name === 'Why') return 'why'
  if (name === 'Try') return 'try'
  return name === 'Like' || name === 'Swipe' ? 'like' : 'dislike'
}

function itemKind(value: string | undefined, id: string): 'tool' | 'workflow' {
  const kind = value?.trim().toLowerCase() || 'tool'
  if (kind !== 'tool' && kind !== 'workflow') {
    throw new Error(`Item ${id} kind must be tool or workflow`)
  }
  return kind
}

function isTruthy(value?: string): boolean {
  return ['1', 'true', 'yes'].includes(value?.trim().toLowerCase() ?? '')
}
