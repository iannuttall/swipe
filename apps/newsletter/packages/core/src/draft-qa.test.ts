import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { loadConfig } from './config.js'
import { CoreEmailPlatform } from './platform.js'
import { TestEmailProvider } from './providers.js'
import { MemoryEmailStore } from './store.js'

const issueBody = [
  '<Header name="This week\'s Swipe" />',
  '',
  'A tested issue.',
  '',
  '<Item id="sponsor" title="Sponsor" url="https://sponsor.example.com" sponsor="true" summary="Useful context for agents">',
  'A sponsored tool.',
  '',
  '<Why>',
  'It carries context between sessions.',
  '</Why>',
  '',
  '<Try>',
  'Give it one recurring workflow.',
  '</Try>',
  '</Item>',
  '',
  '<Item id="agent-grade" title="AgentGrade" url="https://example.com/tool" summary="Compare two agent setups">',
  'Compare two agent setups.',
  '',
  '<Why>',
  'It catches regressions.',
  '</Why>',
  '',
  '<Try>',
  'Run the same task twice.',
  '</Try>',
  '</Item>',
].join('\n')

function setup() {
  const store = new MemoryEmailStore()
  const provider = new TestEmailProvider()
  const platform = new CoreEmailPlatform({
    store,
    provider,
    config: loadConfig({
      NODE_ENV: 'test',
      BASE_URL: 'https://swipe.md',
      EMAIL_FROM_EMAIL: 'ian@swipe.md',
    }),
  })
  return { store, provider, platform }
}

describe('issue draft QA gate', () => {
  it('blocks issue broadcasts until the exact tracked test passes browser QA', async () => {
    const { platform, provider } = setup()
    await platform.subscribe({ email: 'ian@example.com' })
    const draft = await platform.createDraft({
      name: 'qa-issue',
      subject: 'QA issue',
      bodyMarkdown: issueBody,
      metadata: { issueSlug: 'qa-issue' },
    })

    await assert.rejects(
      platform.createBroadcast({ draftId: draft.id }),
      /has not passed tracked test and browser QA/,
    )

    const test = await platform.sendTest({
      draftId: draft.id,
      to: 'ian@example.com',
      status: 'cold',
    })
    assert.match(provider.sent[0]?.subject ?? '', /^\[TEST\] /)
    assert.ok(test.trackingLinks.length >= 3)
    assert.ok(test.trackingLinks.every((link) => link.trackingUrl.includes('/t/click/')))
    assert.ok(
      test.trackingLinks.some(
        (link) => link.originalUrl === 'https://swipe.md/issues/qa-issue#agent-grade',
      ),
    )
    assert.ok(
      test.trackingLinks.some(
        (link) => link.originalUrl === 'https://swipe.md/issues/qa-issue.md',
      ),
    )

    const receipt = await platform.approveDraftQa({
      draftId: draft.id,
      testMessageId: test.messageId,
      checkedAt: new Date(),
      browserCheckedLinks: test.trackingLinks.length,
      archiveHtmlOk: true,
      archiveMarkdownOk: true,
    })
    assert.equal(receipt.fingerprint, draft.fingerprint)
    assert.equal((await platform.getDraftQa(draft.id)).status, 'ready')
    assert.equal((await platform.createBroadcast({ draftId: draft.id })).totalPlanned, 1)
  })

  it('rejects the temporary-slug failure that broke correction archive links', async () => {
    const { platform } = setup()
    await platform.subscribe({ email: 'ian@example.com' })
    const draft = await platform.createDraft({
      name: 'qa-issue-correction',
      subject: 'Correction',
      bodyMarkdown: issueBody,
      metadata: { issueSlug: 'qa-issue' },
    })
    const test = await platform.sendTest({ draftId: draft.id, to: 'ian@example.com' })

    await assert.rejects(
      platform.approveDraftQa({
        draftId: draft.id,
        testMessageId: test.messageId,
        checkedAt: new Date(),
        browserCheckedLinks: test.trackingLinks.length,
        archiveHtmlOk: true,
        archiveMarkdownOk: true,
      }),
      /name must match its canonical slug/,
    )
  })

  it('invalidates approval if the tested draft content changes', async () => {
    const { platform, store } = setup()
    await platform.subscribe({ email: 'ian@example.com' })
    const draft = await platform.createDraft({
      name: 'qa-issue',
      subject: 'QA issue',
      bodyMarkdown: issueBody,
      metadata: { issueSlug: 'qa-issue' },
    })
    const test = await platform.sendTest({ draftId: draft.id, to: 'ian@example.com' })
    await platform.approveDraftQa({
      draftId: draft.id,
      testMessageId: test.messageId,
      checkedAt: new Date(),
      browserCheckedLinks: test.trackingLinks.length,
      archiveHtmlOk: true,
      archiveMarkdownOk: true,
    })
    const stored = await store.getDraft(draft.id)
    assert.ok(stored)
    stored.bodyMarkdown += '\nChanged after QA.'

    await assert.rejects(
      platform.createBroadcast({ draftId: draft.id }),
      /changed after QA/,
    )
  })
})
