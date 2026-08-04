import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  parseIssueItem,
  parseIssueItems,
  parseIssueSections,
  parseLinkItem,
  resolveIssueConditionals,
} from './issue-parser.js'

describe('parseIssueSections', () => {
  it('parses directive blocks with attributes and prose between them', () => {
    const sections = parseIssueSections(
      [
        '::: hero color="#E999BE" image="https://example.com/head.jpg" title="Welcome to Issue 1!"',
        '> A quote worth reading.',
        ':::',
        '',
        'Plain intro paragraph.',
        '',
        '::: links title="Apps & Sites"',
        '[Passport Index](https://example.com)',
        'Explore the power of passports',
        '',
        'The description paragraph.',
        '---',
        '[Reproof](https://example.com/reproof)',
        'Collaborative writing app',
        '',
        'Second description.',
        ':::',
      ].join('\n'),
    )

    assert.deepEqual(
      sections.map((section) => section.type),
      ['hero', 'text', 'links'],
    )
    assert.equal(sections[0]?.attrs.color, '#E999BE')
    assert.equal(sections[0]?.attrs.title, 'Welcome to Issue 1!')
    assert.equal(sections[0]?.body, '> A quote worth reading.')
    assert.equal(sections[1]?.body, 'Plain intro paragraph.')
    assert.equal(sections[2]?.items.length, 2)
  })

  it('keeps unterminated blocks and ignores directives inside code fences', () => {
    const sections = parseIssueSections(
      ['```', '::: box color="pink"', '```', '', '::: quote', 'Still captured.'].join(
        '\n',
      ),
    )

    assert.deepEqual(
      sections.map((section) => section.type),
      ['text', 'quote'],
    )
    assert.match(sections[0]?.body ?? '', /::: box/)
    assert.equal(sections[1]?.body, 'Still captured.')
  })

  it('splits items on --- dividers only', () => {
    const sections = parseIssueSections(
      ['::: classifieds', 'First entry.', '---', 'Second entry.', ':::'].join('\n'),
    )
    assert.deepEqual(sections[0]?.items, ['First entry.', 'Second entry.'])
  })

  it('parses component-style blocks and heading-separated items', () => {
    const sections = parseIssueSections(
      [
        '<Header name="Issue 002" />',
        '',
        '<Links title="Worth a Click">',
        '## [First](https://example.com/first)',
        'First tagline',
        '',
        'First description.',
        '',
        '## [Second](https://example.com/second)',
        'Second tagline',
        '',
        'Second description.',
        '</Links>',
      ].join('\n'),
    )

    assert.deepEqual(
      sections.map((section) => section.type),
      ['header', 'links'],
    )
    assert.equal(sections[0]?.attrs.name, 'Issue 002')
    assert.equal(sections[1]?.items.length, 2)
    assert.equal(parseLinkItem(sections[1]?.items[1] ?? '').title, 'Second')
  })

  it('parses first-class items and applies stable defaults', () => {
    const sections = parseIssueSections(
      [
        '<Item id="agent-grade" title="AgentGrade" url="https://www.agentgrade.dev/report" summary="Agent setup grading tool." sponsor="true">',
        'AgentGrade compares two agent setups against the same real task.',
        '<Why>',
        'A change can sound useful while making the result worse. A direct comparison gives the team something concrete to discuss.',
        '</Why>',
        '<Try>',
        'Run one weekly task with both configurations. Compare the finished work and the corrections each one needed.',
        '</Try>',
        '</Item>',
      ].join('\n'),
    )
    const section = sections[0]
    assert.ok(section)
    const item = parseIssueItem(section)

    assert.equal(sections[0]?.type, 'item')
    assert.equal(item.id, 'agent-grade')
    assert.equal(item.chip, '✦')
    assert.equal(item.sponsorLabel, '[sponsor]')
    assert.equal(item.whyLabel, 'Why:')
    assert.equal(item.tryLabel, 'Try:')
    assert.equal(item.sponsor, true)
    assert.equal(item.summary, 'Agent setup grading tool.')
    assert.match(item.why, /direct comparison/)
    assert.match(item.try, /weekly task/)
  })

  it('rejects editorial review blocks on sponsored items', () => {
    const [section] = parseIssueSections(
      [
        '<Item id="paid-tool" title="Paid Tool" sponsor="true" summary="Useful tool for agents.">',
        'Sponsor copy.',
        '<Like>',
        'A paid opinion.',
        '</Like>',
        '<Dislike>',
        'A paid criticism.',
        '</Dislike>',
        '</Item>',
      ].join('\n'),
    )
    assert.ok(section)
    assert.throws(() => parseIssueItem(section), /must not use Like or Dislike blocks/)
  })

  it('requires a separate contents summary for sponsored items', () => {
    const [section] = parseIssueSections(
      [
        '<Item id="paid-tool" title="Paid Tool" sponsor="true">',
        'Sponsor copy belongs in the main slot.',
        '<Why>',
        'It helps with a real job. The result should be clear.',
        '</Why>',
        '<Try>',
        'Give the reader a specific task. Explain what should come back.',
        '</Try>',
        '</Item>',
      ].join('\n'),
    )
    assert.ok(section)
    assert.throws(() => parseIssueItem(section), /requires a four-to-five-word summary/)
  })

  it('uses beta as the marker for newly surfaced products', () => {
    const [section] = parseIssueSections(
      [
        '<Item id="new-tool" title="New Tool" new="true" summary="Useful tool for agents.">',
        'This tool helps an agent complete a useful task.',
        '<Why>',
        'It saves a repeated step. The reader can reuse the result.',
        '</Why>',
        '<Try>',
        'Give it one small task. Check the result before using it.',
        '</Try>',
        '</Item>',
      ].join('\n'),
    )
    assert.ok(section)
    const item = parseIssueItem(section)
    assert.equal(item.chip, 'β')
    assert.equal(item.kind, 'tool')
    assert.equal(item.whyLabel, 'Why:')
    assert.equal(item.tryLabel, 'Try:')
  })

  it('parses workflow items independently from release status', () => {
    const [section] = parseIssueSections(
      [
        '<Item id="research-loop" title="Research loop" kind="workflow">',
        'Primary-source research.',
        '<Like>',
        'It gives the agent a repeatable sequence.',
        '</Like>',
        '<Dislike>',
        'It still needs editorial judgment.',
        '</Dislike>',
        '</Item>',
      ].join('\n'),
    )
    assert.ok(section)
    const item = parseIssueItem(section)
    assert.equal(item.kind, 'workflow')
    assert.equal(item.newRelease, false)
    assert.equal(item.chip, '＋')
  })

  it('rejects unknown item kinds', () => {
    const [section] = parseIssueSections(
      [
        '<Item id="bad-kind" title="Bad kind" kind="news">',
        'Description.',
        '<Like>',
        'Action.',
        '</Like>',
        '<Dislike>',
        'Tradeoff.',
        '</Dislike>',
        '</Item>',
      ].join('\n'),
    )
    assert.ok(section)
    assert.throws(() => parseIssueItem(section), /kind must be tool or workflow/)
  })

  it('rejects duplicate item anchors', () => {
    const body = (title: string) =>
      [
        `<Item id="same-item" title="${title}">`,
        'Description.',
        '<Like>',
        'Action.',
        '</Like>',
        '<Dislike>',
        'Tradeoff.',
        '</Dislike>',
        '</Item>',
      ].join('\n')
    assert.throws(
      () => parseIssueItems(parseIssueSections(`${body('One')}\n\n${body('Two')}`)),
      /Duplicate item id/,
    )
  })
})

describe('resolveIssueConditionals', () => {
  const source = [
    'Always visible.',
    '',
    '<Conditional if="status:cold">',
    'Cold only.',
    '',
    '<Box title="Still reading?">',
    'Click any link.',
    '</Box>',
    '</Conditional>',
  ].join('\n')

  it('includes matching blocks and unwraps nested issue components', () => {
    const resolved = resolveIssueConditionals(source, { status: 'cold' })
    assert.match(resolved, /Cold only/)
    assert.doesNotMatch(resolved, /Conditional/)
    assert.deepEqual(
      parseIssueSections(resolved).map((section) => section.type),
      ['text', 'box'],
    )
  })

  it('removes blocks for non-matching recipients and the web archive', () => {
    assert.equal(
      resolveIssueConditionals(source, { status: 'warm' }).trim(),
      'Always visible.',
    )
    assert.equal(resolveIssueConditionals(source).trim(), 'Always visible.')
  })

  it('rejects malformed or unsupported conditions', () => {
    assert.throws(
      () =>
        resolveIssueConditionals(['<Conditional>', 'Bad', '</Conditional>'].join('\n')),
      /Conditional requires/,
    )
    assert.throws(
      () =>
        resolveIssueConditionals(
          ['<Conditional if="clicks:0">', 'Bad', '</Conditional>'].join('\n'),
        ),
      /Unsupported issue condition/,
    )
  })
})

describe('parseLinkItem', () => {
  it('extracts title link, tagline, and description', () => {
    const item = parseLinkItem(
      [
        '[Paku](https://example.com/paku)',
        'Air quality monitor',
        '',
        'As our planet warms, understanding the [AQI](https://example.com/aqi) matters.',
      ].join('\n'),
    )

    assert.equal(item.title, 'Paku')
    assert.equal(item.url, 'https://example.com/paku')
    assert.equal(item.tagline, 'Air quality monitor')
    assert.match(item.description, /AQI/)
  })

  it('handles heading-style titles without links', () => {
    const item = parseLinkItem('### Plain title\nTagline only')
    assert.equal(item.title, 'Plain title')
    assert.equal(item.url, '')
    assert.equal(item.tagline, 'Tagline only')
    assert.equal(item.description, '')
  })
})
