export type FlagValue = boolean | string

export interface ParsedArgs {
  positionals: string[]
  flags: Map<string, FlagValue>
}

export function parseArgs(argv: string[]): ParsedArgs {
  const positionals: string[] = []
  const flags = new Map<string, FlagValue>()

  for (let i = 0; i < argv.length; i += 1) {
    const current = argv[i]
    if (!current?.startsWith('--')) {
      if (current) positionals.push(current)
      continue
    }
    const raw = current.slice(2)
    const [key, inlineValue] = raw.split('=', 2)
    if (!key) continue
    if (inlineValue !== undefined) {
      flags.set(key, inlineValue)
      continue
    }
    const next = argv[i + 1]
    if (next && !next.startsWith('--')) {
      flags.set(key, next)
      i += 1
    } else {
      flags.set(key, true)
    }
  }

  return { positionals, flags }
}

export function getStringFlag(parsed: ParsedArgs, name: string): string | undefined {
  const value = parsed.flags.get(name)
  return typeof value === 'string' ? value : undefined
}

export function getBooleanFlag(parsed: ParsedArgs, name: string): boolean {
  return parsed.flags.get(name) === true
}

export function getNumberFlag(parsed: ParsedArgs, name: string): number | undefined {
  const value = getStringFlag(parsed, name)
  if (!value) return undefined
  const parsedValue = Number.parseInt(value, 10)
  if (Number.isNaN(parsedValue)) throw new Error(`Invalid number for --${name}`)
  return parsedValue
}
