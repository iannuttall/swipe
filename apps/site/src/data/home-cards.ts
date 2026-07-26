import v1Raw from '../../content/home-cards-v1.yaml?raw'
import v2Raw from '../../content/home-cards-v2.yaml?raw'
import v3Raw from '../../content/home-cards-v3.yaml?raw'
import v4Raw from '../../content/home-cards-v4.yaml?raw'
import yaml from 'js-yaml'

export type CardVersion = 'v1' | 'v2' | 'v3' | 'v4'

export const DEFAULT_CARD_VERSION: CardVersion = 'v4'

export function toCardVersion(value: unknown): CardVersion {
  return value === 'v1' || value === 'v2' || value === 'v3' || value === 'v4'
    ? value
    : DEFAULT_CARD_VERSION
}

export type CardDef =
  | { id: string; type: 'terminal'; title: string; text: string }
  | { id: string; type: 'chat'; messages: { role: 'user' | 'ai'; text: string }[] }
  | { id: string; type: 'file'; filename: string; text: string }
  | { id: string; type: 'message'; sender: string; time?: string; text: string }
  | { id: string; type: 'cli'; terminal?: string; tool: string; command: string; diff: string }
  | {
      id: string
      type: 'plan'
      question: string
      options: { label: string; desc: string }[]
      selected?: number
    }
  | {
      id: string
      type: 'workflow'
      title: string
      input: string
      steps: string[]
      output: string | string[]
    }
  | { id: string; type: 'swipe'; title: string; text: string; tryThis: string }
  | { id: string; type: 'before-after'; title: string; before: string; after: string }
  | { id: string; type: 'result'; app: string; title: string; detail: string; status: string }
  | {
      id: string
      type: 'skill'
      title: string
      giveIt: string
      learns: string
      result?: string
      output?: string[]
    }
  | {
      id: string
      type: 'prompt'
      title: string
      prompt: string
      result?: string
      output?: string[]
    }
  | {
      id: string
      type: 'field-note'
      eyebrow: string
      title: string
      text: string
      result: string
    }

// YAML block scalars add a trailing newline — strip it
function trimText(card: Record<string, unknown>): CardDef {
  const c = { ...card }
  if (typeof c.text === 'string') c.text = c.text.trimEnd()
  if (typeof c.diff === 'string') c.diff = c.diff.trimEnd()
  if (typeof c.command === 'string') c.command = c.command.trimEnd()
  if (Array.isArray(c.messages)) {
    c.messages = (c.messages as { role: string; text: string }[]).map((m) => ({
      ...m,
      text: m.text.trimEnd(),
    }))
  }
  return c as CardDef
}

/** Max cards shown per group, per version. Groups without a limit are uncapped. */
const GROUP_LIMITS: Record<CardVersion, Record<string, number>> = {
  v1: {
    plan: 2,
    skill: 2,
    chat: 5,
    'plan-file': 2,
    'claude-cli': 1,
    'codex-cli': 1,
    'claude-md': 1,
    'agents-md': 1,
    message: 4,
  },
  v2: {
    build: 4,
    create: 4,
    marketing: 4,
    product: 4,
    business: 4,
    research: 4,
    everyday: 4,
  },
  v3: {
    build: 4,
    marketing: 5,
    product: 4,
    business: 5,
    research: 4,
    create: 4,
    agents: 4,
    terminal: 2,
    fun: 1,
  },
  v4: {
    chat: 12,
    message: 6,
    file: 5,
    terminal: 3,
    plan: 1,
  },
}

function parseCards(raw: string): Record<string, unknown>[] {
  const parsed = yaml.load(raw) as Record<string, unknown>[]
  return parsed.filter((c) => !c.disabled)
}

const CARD_SETS: Record<CardVersion, Record<string, unknown>[]> = {
  v1: parseCards(v1Raw),
  v2: parseCards(v2Raw),
  v3: parseCards(v3Raw),
  v4: parseCards(v4Raw),
}

function hashString(input: string) {
  let hash = 0
  for (let i = 0; i < input.length; i += 1) {
    hash = (hash * 31 + input.charCodeAt(i)) | 0
  }
  return hash >>> 0
}

function createRng(seed: number) {
  let state = seed >>> 0
  return () => {
    state += 0x6d2b79f5
    let t = state
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function cardSeedToken(card: Record<string, unknown>) {
  const id = card.id
  if (typeof id === 'string') return id
  return JSON.stringify(card)
}

function toSeed(value: string | number) {
  if (typeof value === 'number') return value >>> 0
  return hashString(value)
}

function shuffle<T>(arr: T[], seed: number): T[] {
  const random = createRng(seed)
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

/** Select cards respecting per-group limits. */
function selectWithLimits(
  cards: Record<string, unknown>[],
  seed: number,
  limits: Record<string, number>,
): Record<string, unknown>[] {
  const byGroup: Record<string, Record<string, unknown>[]> = {}
  const ungrouped: Record<string, unknown>[] = []

  for (const c of cards) {
    const group = c.group as string | undefined
    if (group) {
      ;(byGroup[group] ??= []).push(c)
    } else {
      ungrouped.push(c)
    }
  }

  const selected: Record<string, unknown>[] = [...ungrouped]
  for (const [group, pool] of Object.entries(byGroup)) {
    const limit = limits[group] ?? Infinity
    const groupSeed = hashString(`${seed}:${group}:${pool.map(cardSeedToken).join('|')}`)
    const shuffled = shuffle(pool, groupSeed)
    selected.push(...shuffled.slice(0, limit))
  }

  return selected
}

export function getCardsForSeed(
  seedInput: string | number,
  version: CardVersion = DEFAULT_CARD_VERSION,
): CardDef[] {
  const seed = toSeed(seedInput)
  return selectWithLimits(CARD_SETS[version], seed, GROUP_LIMITS[version]).map(trimText)
}
