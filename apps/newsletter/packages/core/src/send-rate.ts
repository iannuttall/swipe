import { setTimeout } from 'node:timers/promises'

export interface ProviderSendThrottleInput {
  ratePerSecond: number
  now?: () => number
  sleep?: (ms: number) => Promise<void>
}

export function providerSendIntervalMs(ratePerSecond: number): number {
  if (!Number.isFinite(ratePerSecond) || ratePerSecond < 1) {
    return 1000
  }
  return Math.ceil(1000 / ratePerSecond)
}

export function createProviderSendThrottle(input: ProviderSendThrottleInput) {
  const intervalMs = providerSendIntervalMs(input.ratePerSecond)
  const now = input.now ?? Date.now
  const sleep = input.sleep ?? ((ms: number) => setTimeout(ms))
  let lastStartedAt: number | undefined

  return async function waitForProviderSlot(): Promise<void> {
    const current = now()
    const waitMs =
      lastStartedAt === undefined ? 0 : Math.max(0, lastStartedAt + intervalMs - current)

    if (waitMs > 0) {
      await sleep(waitMs)
    }
    lastStartedAt = now()
  }
}
