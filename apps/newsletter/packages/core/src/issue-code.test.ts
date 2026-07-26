import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { normalizeCodeLanguage, splitIssueBody } from './issue-code.js'
import { renderDraftEmail } from './render.js'

describe('splitIssueBody', () => {
  it('splits markdown and fenced code segments', () => {
    const segments = splitIssueBody(
      ['Before.', '', '```bash', 'echo hi', '```', '', 'After.'].join('\n'),
    )

    assert.deepEqual(segments, [
      { kind: 'markdown', content: 'Before.' },
      { kind: 'code', content: 'echo hi', language: 'bash' },
      { kind: 'markdown', content: 'After.' },
    ])
  })

  it('keeps an unterminated fence as code', () => {
    const segments = splitIssueBody(['```js', 'const a = 1'].join('\n'))
    assert.deepEqual(segments, [{ kind: 'code', content: 'const a = 1', language: 'js' }])
  })

  it('returns one markdown segment when there are no fences', () => {
    assert.deepEqual(splitIssueBody('Just prose.'), [
      { kind: 'markdown', content: 'Just prose.' },
    ])
  })
})

describe('normalizeCodeLanguage', () => {
  it('passes known languages through and falls back to markdown', () => {
    assert.equal(normalizeCodeLanguage('bash'), 'bash')
    assert.equal(normalizeCodeLanguage('TS'), 'ts')
    assert.equal(normalizeCodeLanguage('astro'), 'markdown')
    assert.equal(normalizeCodeLanguage(undefined), 'markdown')
  })
})

describe('fenced code in issues', () => {
  it('renders through the themed CodeBlock, not the Markdown default pre', async () => {
    const rendered = await renderDraftEmail({
      subject: 'Code',
      bodyMarkdown: ['Intro.', '', '```bash', 'pnpm swipe check site', '```'].join('\n'),
    })

    assert.match(rendered.html, /<pre[^>]*Menlo[^>]*#F2F2F2/)
    assert.doesNotMatch(rendered.html, /SFMono-Regular/)
    // CodeBlock inserts zero-width characters between words to preserve
    // whitespace in email clients, so match tokens individually.
    assert.match(rendered.html, /pnpm/)
    assert.match(rendered.html, /check/)
  })
})
