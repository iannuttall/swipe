import rawYaml from '../../content/home-cards.yaml?raw'
import yaml from 'js-yaml'

export type CardDef =
  | { id: string; type: 'terminal'; title: string; text: string }
  | { id: string; type: 'chat'; messages: { role: 'user' | 'ai'; text: string }[] }
  | { id: string; type: 'file'; filename: string; text: string }
  | { id: string; type: 'message'; sender: string; time?: string; text: string }
  | { id: string; type: 'cli'; terminal?: string; tool: string; command: string; diff: string }
  | { id: string; type: 'plan'; question: string; options: { label: string; desc: string }[]; selected?: number }

const parsed = yaml.load(rawYaml) as Record<string, unknown>[]

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

/** Max cards shown per group. Groups without a limit are uncapped. */
const GROUP_LIMITS: Record<string, number> = {
  plan: 2,
  skill: 2,
  chat: 5,
  'plan-file': 2,
  'claude-cli': 1,
  'codex-cli': 1,
  'claude-md': 1,
  'agents-md': 1,
  message: 4,
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
function selectWithLimits(cards: Record<string, unknown>[], seed: number): Record<string, unknown>[] {
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
    const limit = GROUP_LIMITS[group] ?? Infinity
    const groupSeed = hashString(`${seed}:${group}:${pool.map(cardSeedToken).join('|')}`)
    const shuffled = shuffle(pool, groupSeed)
    selected.push(...shuffled.slice(0, limit))
  }

  return selected
}

const enabledCards = parsed.filter((c) => !c.disabled)

export function getCardsForSeed(seedInput: string | number): CardDef[] {
  const seed = toSeed(seedInput)
  return selectWithLimits(enabledCards, seed).map(trimText)
}

export const ALL_CARDS: CardDef[] = getCardsForSeed('default')

export const CARDS: Record<string, CardDef> = Object.fromEntries(
  ALL_CARDS.map((c) => [c.id, c]),
)
