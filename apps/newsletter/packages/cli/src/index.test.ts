import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { FakePlatform } from './fake-platform.test-helper.js'
import { runCli } from './index.js'

describe('cli', () => {
  it('prints command help', async () => {
    const output: string[] = []
    const code = await runCli(['--help'], {
      env: { APP_NAME: 'Acme Mail' },
      stdout: (text) => output.push(text),
    })

    assert.equal(code, 0)
    assert.match(output.join(''), /Acme Mail 0\.1\.0/)
    assert.match(output.join(''), /email subscribe/)
    assert.match(output.join(''), /email ops queue/)
    assert.match(output.join(''), /email send due --yes/)
    assert.match(output.join(''), /email broadcast test --yes/)
  })

  it('prints JSON for agent callers', async () => {
    const output: string[] = []
    const platform = new FakePlatform()
    const code = await runCli(['subscribe', 'ian@example.com', '--json'], {
      platform,
      stdout: (text) => output.push(text),
    })

    assert.equal(code, 0)
    assert.equal(platform.subscribedEmail, 'ian@example.com')
    assert.deepEqual(JSON.parse(output.join('')), {
      ok: true,
      data: { id: 'contact_1' },
    })
  })

  it('requires explicit confirmation for due sends', async () => {
    const output: string[] = []
    const code = await runCli(['send', 'due', '--json'], {
      platform: new FakePlatform(),
      stdout: (text) => output.push(text),
    })

    assert.equal(code, 2)
    assert.deepEqual(JSON.parse(output.join('')), {
      ok: false,
      error: 'Refusing to send without --yes',
    })
  })

  it('requires explicit confirmation for test sends', async () => {
    const output: string[] = []
    const code = await runCli(
      ['broadcast', 'test', '--draft-id', 'draft_1', '--to', 'ian@example.com', '--json'],
      {
        platform: new FakePlatform(),
        stdout: (text) => output.push(text),
      },
    )

    assert.equal(code, 2)
    assert.deepEqual(JSON.parse(output.join('')), {
      ok: false,
      error: 'Refusing to send test without --yes',
    })
  })

  it('prints production ops checklist and guards stuck recovery', async () => {
    const output: string[] = []
    const platform = new FakePlatform()
    const checklistCode = await runCli(['ops', 'checklist', '--json'], {
      platform,
      stdout: (text) => output.push(text),
    })

    assert.equal(checklistCode, 0)
    assert.equal(JSON.parse(output.join('')).data.ready, true)

    output.length = 0
    const blockedCode = await runCli(['ops', 'recover-stuck', '--json'], {
      platform,
      stdout: (text) => output.push(text),
    })
    assert.equal(blockedCode, 2)
    assert.deepEqual(JSON.parse(output.join('')), {
      ok: false,
      error: 'Refusing to recover stuck messages without --yes',
    })

    output.length = 0
    const recoverCode = await runCli(
      ['ops', 'recover-stuck', '--yes', '--limit', '10', '--json'],
      {
        platform,
        stdout: (text) => output.push(text),
      },
    )
    assert.equal(recoverCode, 0)
    assert.deepEqual(JSON.parse(output.join('')).data, { recovered: 0, failed: 0 })
  })

  it('prints queue health for operators', async () => {
    const output: string[] = []
    const platform = new FakePlatform()
    const code = await runCli(
      [
        'ops',
        'queue',
        '--stale-after-ms',
        '300000',
        '--since',
        '2026-06-30T00:00:00.000Z',
        '--json',
      ],
      {
        platform,
        stdout: (text) => output.push(text),
      },
    )

    assert.equal(code, 0)
    assert.equal(platform.queueSummaryRequest?.staleAfterMs, 300_000)
    assert.deepEqual(
      platform.queueSummaryRequest?.since,
      new Date('2026-06-30T00:00:00.000Z'),
    )
    assert.equal(JSON.parse(output.join('')).data.plannedDue, 0)
  })

  it('creates drafts from inline body markdown', async () => {
    const output: string[] = []
    const platform = new FakePlatform()
    const code = await runCli(
      ['draft', 'create', '--subject', 'Subject', '--body', 'Body', '--json'],
      {
        platform,
        stdout: (text) => output.push(text),
      },
    )

    assert.equal(code, 0)
    assert.equal(platform.draftSubject, 'Subject')
    assert.equal(platform.draftTemplate, undefined)
    assert.deepEqual(JSON.parse(output.join('')), {
      ok: true,
      data: { id: 'draft_1' },
    })
  })

  it('creates drafts with template and preview options', async () => {
    const output: string[] = []
    const platform = new FakePlatform()
    const code = await runCli(
      [
        'draft',
        'create',
        '--subject',
        'Subject',
        '--body',
        'Body',
        '--template',
        'default',
        '--preview',
        'Inbox preview',
        '--json',
      ],
      {
        platform,
        stdout: (text) => output.push(text),
      },
    )

    assert.equal(code, 0)
    assert.equal(platform.draftTemplate, 'default')
    assert.equal(platform.draftPreview, 'Inbox preview')
  })

  it('lists and renders templates without a platform', async () => {
    const output: string[] = []
    const listCode = await runCli(['template', 'list', '--json'], {
      stdout: (text) => output.push(text),
    })
    assert.equal(listCode, 0)
    assert.match(output.join(''), /default/)

    output.length = 0
    const renderCode = await runCli(
      [
        'template',
        'render',
        '--subject',
        'Rendered',
        '--body',
        'Read [this](https://example.com).',
        '--template',
        'default',
        '--json',
      ],
      { stdout: (text) => output.push(text) },
    )
    assert.equal(renderCode, 0)
    const rendered = JSON.parse(output.join('')).data
    assert.equal(rendered.template, 'default')
    assert.match(rendered.html, /https:\/\/example.com/)
  })

  it('lists recent signups with a validated window', async () => {
    const output: string[] = []
    const platform = new FakePlatform()
    const code = await runCli(['contact', 'recent', '--days', '14', '--json'], {
      platform,
      stdout: (text) => output.push(text),
    })

    assert.equal(code, 0)
    assert.deepEqual(platform.recentContactsInput, { days: 14, limit: 1000 })
    const data = JSON.parse(output.join('')).data
    assert.equal(data.signups, 1)
    assert.equal(data.contacts[0].email, 'new@example.com')

    const badCode = await runCli(['contact', 'recent', '--days', '0', '--json'], {
      platform,
      stdout: () => {},
      stderr: () => {},
    })
    assert.notEqual(badCode, 0)
  })

  it('seeds gmail aliases for local send tests', async () => {
    const output: string[] = []
    const platform = new FakePlatform()
    const code = await runCli(
      [
        'contact',
        'seed-aliases',
        '--email',
        'ian@example.com',
        '--count',
        '2',
        '--prefix',
        'test',
        '--json',
      ],
      {
        platform,
        stdout: (text) => output.push(text),
      },
    )

    assert.equal(code, 0)
    assert.deepEqual(platform.importedEmails, [
      'ian+test001@example.com',
      'ian+test002@example.com',
    ])
    assert.deepEqual(JSON.parse(output.join('')).data.contacts, [
      'ian+test001@example.com',
      'ian+test002@example.com',
    ])
  })

  it('seeds gmail aliases with subscriber intelligence fixtures', async () => {
    const output: string[] = []
    const platform = new FakePlatform()
    const code = await runCli(
      [
        'contact',
        'seed-intelligence',
        '--email',
        'ian@example.com',
        '--count',
        '6',
        '--prefix',
        'intel',
        '--json',
      ],
      {
        platform,
        stdout: (text) => output.push(text),
      },
    )

    assert.equal(code, 0)
    const data = JSON.parse(output.join('')).data
    assert.equal(data.imported, 6)
    assert.equal(data.externalIds, 6)
    assert.equal(data.purchases, 2)
    assert.equal(data.contacts[0].email, 'ian+intel001@example.com')
    assert.ok(
      data.contacts.some((contact: { tags: string[] }) =>
        contact.tags.includes('high-value'),
      ),
    )
    assert.ok(
      data.suggestedCommands.some((command: string) =>
        command.includes('audience preview'),
      ),
    )
  })

  it('prints aggregate link summaries for agents', async () => {
    const output: string[] = []
    const code = await runCli(['analytics', 'link-summary', '--json'], {
      platform: new FakePlatform(),
      stdout: (text) => output.push(text),
    })

    assert.equal(code, 0)
    assert.deepEqual(JSON.parse(output.join('')).data, [
      {
        originalUrl: 'https://example.com',
        tags: [],
        topics: ['ai-agents'],
        humanClicks: 2,
        botClicks: 0,
        uniqueHumanContacts: 2,
        uniqueBotContacts: 0,
        linkCount: 2,
        broadcastCount: 1,
      },
    ])
  })

  it('tags contacts and records purchases for agents', async () => {
    const output: string[] = []
    const platform = new FakePlatform()
    const tagCode = await runCli(
      ['contact', 'tag', 'buyer@example.com', '--tag', 'high-value', '--json'],
      {
        platform,
        stdout: (text) => output.push(text),
      },
    )
    assert.equal(tagCode, 0)
    assert.deepEqual(platform.taggedContact, {
      emailOrId: 'buyer@example.com',
      tagKey: 'high-value',
    })

    output.length = 0
    const purchaseCode = await runCli(
      [
        'purchase',
        'record',
        '--email',
        'buyer@example.com',
        '--provider',
        'stripe',
        '--external-id',
        'pi_123',
        '--idempotency-key',
        'stripe:pi_123',
        '--product-key',
        'prompt-stack',
        '--amount-cents',
        '50000',
        '--currency',
        'USD',
        '--json',
      ],
      {
        platform,
        stdout: (text) => output.push(text),
      },
    )
    assert.equal(purchaseCode, 0)
    assert.equal(platform.recordedPurchase?.productKey, 'prompt-stack')
    assert.equal(platform.recordedPurchase?.amountCents, 50_000)
  })

  it('previews audiences and passes audiences into broadcast creation', async () => {
    const output: string[] = []
    const platform = new FakePlatform()
    const previewCode = await runCli(
      [
        'audience',
        'preview',
        '--contact-tag',
        'high-value',
        '--purchased-product',
        'prompt-stack',
        '--min-ltv-cents',
        '25000',
        '--currency',
        'USD',
        '--json',
      ],
      {
        platform,
        stdout: (text) => output.push(text),
      },
    )
    assert.equal(previewCode, 0)
    assert.deepEqual(platform.previewedAudience, {
      contactTags: ['high-value'],
      purchasedProductKeys: ['prompt-stack'],
      minLifetimeValueCents: 25_000,
      currency: 'USD',
    })

    output.length = 0
    const planCode = await runCli(
      [
        'broadcast',
        'preview-plan',
        '--contact-tag',
        'high-value',
        '--duration-hours',
        '12',
        '--sample-limit',
        '5',
        '--json',
      ],
      {
        platform,
        stdout: (text) => output.push(text),
      },
    )
    assert.equal(planCode, 0)
    assert.deepEqual(platform.previewedPlan?.audience, { contactTags: ['high-value'] })
    assert.deepEqual(platform.previewedPlan?.deliveryPolicy, { durationHours: 12 })

    output.length = 0
    const broadcastCode = await runCli(
      [
        'broadcast',
        'create',
        '--draft-id',
        'draft_1',
        '--contact-tag',
        'high-value',
        '--duration-hours',
        '12',
        '--json',
      ],
      {
        platform,
        stdout: (text) => output.push(text),
      },
    )
    assert.equal(broadcastCode, 0)
    assert.deepEqual(platform.createdBroadcast?.audience, {
      contactTags: ['high-value'],
    })
    assert.deepEqual(platform.createdBroadcast?.deliveryPolicy, {
      durationHours: 12,
    })

    output.length = 0
    const canaryCode = await runCli(
      [
        'canary',
        'create',
        '--draft-id',
        'draft_1',
        '--contact-tag',
        'high-value',
        '--steps',
        '50,500,all',
        '--json',
      ],
      {
        platform,
        stdout: (text) => output.push(text),
      },
    )
    assert.equal(canaryCode, 0)
    assert.deepEqual(platform.createdCanary?.audience, {
      contactTags: ['high-value'],
    })
    assert.deepEqual(platform.createdCanary?.steps, [50, 500, 'all'])
  })
})
