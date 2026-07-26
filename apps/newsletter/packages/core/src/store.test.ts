import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { MemoryEmailStore } from './store.js'

describe('EmailStore message claiming', () => {
  it('moves due messages to sending so they are not claimed twice', async () => {
    const store = new MemoryEmailStore()
    const contact = await store.upsertContact({ email: 'claim@example.com' })
    const draft = await store.createDraft({ subject: 'Subject', bodyMarkdown: 'Body' })
    const broadcast = await store.createBroadcast({
      draftId: draft.id,
      name: 'Broadcast',
      subject: draft.subject,
    })
    await store.createMessages(broadcast.id, [
      {
        contactId: contact.id,
        email: contact.email,
        domain: contact.emailDomain,
        engagementScore: 0,
        sendRank: 0,
        rankReason: 'default',
        status: 'new',
        scheduledAt: new Date(0),
      },
    ])

    const firstClaim = await store.claimDueMessages(new Date(), 10)
    const secondClaim = await store.claimDueMessages(new Date(), 10)

    assert.equal(firstClaim.length, 1)
    assert.equal(firstClaim[0]?.status, 'sending')
    assert.equal(secondClaim.length, 0)
  })

  it('recovers stale sending messages back to planned', async () => {
    const store = new MemoryEmailStore()
    const contact = await store.upsertContact({ email: 'stuck@example.com' })
    const draft = await store.createDraft({ subject: 'Subject', bodyMarkdown: 'Body' })
    const broadcast = await store.createBroadcast({
      draftId: draft.id,
      name: 'Broadcast',
      subject: draft.subject,
    })
    const [message] = await store.createMessages(broadcast.id, [
      {
        contactId: contact.id,
        email: contact.email,
        domain: contact.emailDomain,
        engagementScore: 0,
        sendRank: 0,
        rankReason: 'default',
        status: 'new',
        scheduledAt: new Date(0),
      },
    ])
    assert.ok(message)
    await store.claimDueMessages(new Date('2026-06-20T00:00:00.000Z'), 10)

    const result = await store.recoverStuckMessages({
      staleBefore: new Date('2026-06-20T00:10:00.000Z'),
      rescheduleAt: new Date('2026-06-20T00:11:00.000Z'),
      limit: 10,
    })

    assert.deepEqual(result, { recovered: 1, failed: 0 })
    const recovered = await store.getMessage(message.id)
    assert.equal(recovered?.status, 'planned')
    assert.equal(recovered?.scheduledAt.toISOString(), '2026-06-20T00:11:00.000Z')
  })

  it('reopens completed broadcasts when failed messages are retried', async () => {
    const store = new MemoryEmailStore()
    const contact = await store.upsertContact({ email: 'retry@example.com' })
    const draft = await store.createDraft({ subject: 'Subject', bodyMarkdown: 'Body' })
    const broadcast = await store.createBroadcast({
      draftId: draft.id,
      name: 'Broadcast',
      subject: draft.subject,
    })
    const [message] = await store.createMessages(broadcast.id, [
      {
        contactId: contact.id,
        email: contact.email,
        domain: contact.emailDomain,
        engagementScore: 0,
        sendRank: 0,
        rankReason: 'default',
        status: 'new',
        scheduledAt: new Date(0),
      },
    ])
    assert.ok(message)
    await store.updateMessage({ id: message.id, status: 'failed' })
    await store.finalizeBroadcasts([broadcast.id])

    assert.equal((await store.getBroadcast(broadcast.id))?.status, 'completed')
    assert.equal(
      await store.retryFailedMessages({
        scheduledAt: new Date('2026-06-20T00:00:00.000Z'),
        limit: 10,
      }),
      1,
    )

    assert.equal((await store.getBroadcast(broadcast.id))?.status, 'scheduled')
    assert.equal(
      (await store.claimDueMessages(new Date('2026-06-20T00:00:00.000Z'), 10)).length,
      1,
    )
  })

  it('summarizes queue health and stale sending messages', async () => {
    const store = new MemoryEmailStore()
    const contact = await store.upsertContact({ email: 'queue@example.com' })
    const draft = await store.createDraft({ subject: 'Subject', bodyMarkdown: 'Body' })
    const broadcast = await store.createBroadcast({
      draftId: draft.id,
      name: 'Broadcast',
      subject: draft.subject,
    })
    await store.createMessages(broadcast.id, [
      plannedRecipient(contact, new Date('2026-06-20T00:00:00.000Z'), 0),
      plannedRecipient(contact, new Date('2026-06-20T02:00:00.000Z'), 1),
    ])
    await store.claimDueMessages(new Date('2026-06-20T00:00:00.000Z'), 1)
    await store.recordEvent({
      type: 'message.bounced',
      source: 'test',
      occurredAt: new Date('2026-06-19T23:30:00.000Z'),
      metadata: {},
    })

    const summary = await store.getQueueSummary({
      now: new Date('2026-06-20T00:20:00.000Z'),
      staleBefore: new Date('2026-06-20T00:10:00.000Z'),
      since: new Date('2026-06-19T00:20:00.000Z'),
    })

    assert.equal(summary.plannedDue, 0)
    assert.equal(summary.plannedFuture, 1)
    assert.equal(summary.sending, 1)
    assert.equal(summary.staleSending, 1)
    assert.equal(summary.recentBounces, 1)
  })
})

function plannedRecipient(
  contact: { id: string; email: string; emailDomain: string },
  scheduledAt: Date,
  sendRank: number,
) {
  return {
    contactId: contact.id,
    email: contact.email,
    domain: contact.emailDomain,
    engagementScore: 0,
    sendRank,
    rankReason: 'default' as const,
    status: 'new' as const,
    scheduledAt,
  }
}
