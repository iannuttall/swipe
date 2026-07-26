export function parseCanarySteps(value: string): Array<number | 'all'> {
  return value.split(',').map((item) => {
    const trimmed = item.trim()
    if (trimmed === 'all') return 'all'
    const parsed = Number.parseInt(trimmed, 10)
    if (!Number.isSafeInteger(parsed) || parsed < 1) {
      throw new Error(`Invalid canary step: ${trimmed}`)
    }
    return parsed
  })
}
