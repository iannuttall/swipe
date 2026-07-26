import { setTimeout } from 'node:timers/promises'
import type { EmailPlatform } from './platform.js'

export interface SendWorkerResult {
  iterations: number
  sent: number
  skipped: number
}

export interface SendWorkerInput {
  platform: EmailPlatform
  batchSize?: number
  intervalMs?: number
  recoverStuck?: boolean
  signal?: AbortSignal
  maxIterations?: number
  now?: () => Date
  onResult?: (result: { sent: number; skipped: number }) => void | Promise<void>
}

export async function runSendWorkerOnce(input: {
  platform: EmailPlatform
  batchSize?: number
  now?: Date
  recoverStuck?: boolean
}): Promise<{ sent: number; skipped: number }> {
  const now = input.now ?? new Date()
  if (input.recoverStuck ?? false) {
    await input.platform.recoverStuckMessages({ now })
  }
  return input.platform.sendDue(now, input.batchSize ?? 100)
}

export async function runSendWorker(input: SendWorkerInput): Promise<SendWorkerResult> {
  const intervalMs = input.intervalMs ?? 10_000
  const batchSize = input.batchSize ?? 100
  let iterations = 0
  let sent = 0
  let skipped = 0

  while (!input.signal?.aborted) {
    const now = input.now ? input.now() : new Date()
    if (input.recoverStuck ?? false) {
      await input.platform.recoverStuckMessages({ now })
    }
    const result = await input.platform.sendDue(now, batchSize)
    await input.onResult?.(result)
    sent += result.sent
    skipped += result.skipped
    iterations += 1

    if (input.maxIterations && iterations >= input.maxIterations) break
    if (input.signal?.aborted) break
    await setTimeout(intervalMs, undefined, { signal: input.signal }).catch((error) => {
      if ((error as { name?: string }).name !== 'AbortError') throw error
    })
  }

  return { iterations, sent, skipped }
}
