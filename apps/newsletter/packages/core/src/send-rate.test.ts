import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { createProviderSendThrottle, providerSendIntervalMs } from './send-rate.js'

describe('provider send rate', () => {
  it('calculates the minimum interval between provider sends', () => {
    assert.equal(providerSendIntervalMs(14), 72)
    assert.equal(providerSendIntervalMs(1), 1000)
    assert.equal(providerSendIntervalMs(0), 1000)
    assert.equal(providerSendIntervalMs(Number.NaN), 1000)
  })

  it('waits between provider send attempts', async () => {
    let now = 1_000
    const sleeps: number[] = []
    const throttle = createProviderSendThrottle({
      ratePerSecond: 2,
      now: () => now,
      sleep: async (ms) => {
        sleeps.push(ms)
        now += ms
      },
    })

    await throttle()
    assert.deepEqual(sleeps, [])

    now += 100
    await throttle()
    assert.deepEqual(sleeps, [400])

    now += 500
    await throttle()
    assert.deepEqual(sleeps, [400])
  })
})
