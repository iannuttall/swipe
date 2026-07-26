import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { calculateIntervalMs, planRecipients } from './delivery-planner.js'

const defaults = {
  batchSize: 1000,
  batchDurationMinutes: 60,
  defaultDurationHours: 20,
}

describe('delivery planner', () => {
  it('prioritizes previous clickers and openers before cold contacts', () => {
    const now = new Date('2026-06-20T12:00:00.000Z')

    const plan = planRecipients({
      now,
      defaults,
      recipients: [
        {
          contactId: 'cold',
          email: 'cold@example.com',
          subscribedAt: new Date('2026-06-01T00:00:00.000Z'),
        },
        {
          contactId: 'opener',
          email: 'opener@example.com',
          engagement: {
            contactId: 'opener',
            totalSends: 9,
            totalClicks: 0,
            totalOpens: 12,
            lastOpenedAt: new Date('2026-06-19T00:00:00.000Z'),
          },
        },
        {
          contactId: 'clicker',
          email: 'clicker@example.com',
          engagement: {
            contactId: 'clicker',
            totalSends: 9,
            totalClicks: 2,
            totalOpens: 4,
            lastClickedAt: new Date('2026-06-10T00:00:00.000Z'),
          },
        },
      ],
    })

    assert.deepEqual(
      plan.map((recipient) => recipient.contactId),
      ['clicker', 'opener', 'cold'],
    )
    assert.equal(plan[0]?.rankReason, 'prior_click')
    assert.equal(plan[1]?.rankReason, 'prior_open')
    assert.equal(plan[0]?.status, 'warm')
    assert.equal(plan[1]?.status, 'cold')
    assert.equal(plan[2]?.status, 'new')
  })

  it('uses the default 1000 per hour cadence', () => {
    const intervalMs = calculateIntervalMs({
      count: 20_000,
      defaults,
    })

    assert.equal(intervalMs, 3600)
  })

  it('can spread a broadcast over a fixed duration', () => {
    const intervalMs = calculateIntervalMs({
      count: 20_000,
      defaults,
      policy: {
        strategy: 'duration',
        durationHours: 24,
      },
    })

    assert.equal(intervalMs, 4320)
  })

  it('assigns deterministic ranks and scheduled times', () => {
    const now = new Date('2026-06-20T12:00:00.000Z')
    const plan = planRecipients({
      now,
      defaults,
      recipients: [
        { contactId: 'b', email: 'b@example.com' },
        { contactId: 'a', email: 'a@example.com' },
      ],
    })

    assert.equal(plan[0]?.sendRank, 1)
    assert.equal(plan[0]?.email, 'a@example.com')
    assert.equal(plan[0]?.scheduledAt.toISOString(), '2026-06-20T12:00:00.000Z')
    assert.equal(plan[1]?.scheduledAt.toISOString(), '2026-06-20T12:00:03.600Z')
  })
})
