import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { listEmailTemplates, renderDraft, renderDraftEmail } from './render.js'

describe('renderDraft', () => {
  it('sanitizes unsafe markdown html', () => {
    const rendered = renderDraft({
      subject: 'Hello',
      bodyMarkdown: '# Hi\n\n<script>alert(1)</script>\n\n[bad](javascript:alert(1))',
    })

    assert.equal(rendered.subject, 'Hello')
    assert.match(rendered.html, /<h1>Hi<\/h1>/)
    assert.doesNotMatch(rendered.html, /script/)
    assert.doesNotMatch(rendered.html, /javascript:/)
  })

  it('renders the default React Email template from markdown', async () => {
    const rendered = await renderDraftEmail({
      subject: 'Default subject',
      preview: 'Preview text',
      bodyMarkdown: [
        'Hello [there](https://example.com?a=1&b=2).',
        '',
        'Cheers,',
        'Ian',
      ].join('\n'),
    })

    assert.equal(rendered.subject, 'Default subject')
    assert.match(rendered.html, /<!DOCTYPE html|<!doctype html/i)
    assert.match(rendered.html, /Preview text/)
    assert.match(rendered.html, /https:\/\/example.com\?a=1&b=2/)
    assert.match(rendered.html, /{{unsubscribeUrl}}/)
    assert.match(rendered.html, /Inter, Helvetica, Arial, sans-serif/)
    assert.match(rendered.html, /Swipe/)
    assert.match(rendered.html, /Cheers,<br/)
    assert.match(rendered.text, /Hello/)
  })

  it('renders modular sections inside the default template', async () => {
    const rendered = await renderDraftEmail({
      subject: 'Welcome',
      template: 'default',
      bodyMarkdown: [
        '::: header name="Issue 001"',
        ':::',
        '',
        'Plain intro text.',
        '',
        '::: text title="What to expect"',
        '- Practical walkthroughs',
        '- Useful tools',
        ':::',
        '',
        '::: sponsor title="Sponsor Title" label-url="https://example.com"',
        'Sponsored copy.',
        ':::',
        '',
        '::: links title="Worth a Click"',
        '[Paku](https://example.com/paku)',
        'Air quality monitor',
        '',
        'Description text.',
        ':::',
        '',
        '::: classifieds title="Classifieds"',
        '[MicroSponsor](https://example.com/micro) helps builders reach useful readers.',
        ':::',
      ].join('\n'),
    })

    assert.match(rendered.html, /Plain intro text/)
    assert.match(rendered.html, /What to expect/)
    assert.match(rendered.html, /Sponsor Title/)
    assert.match(rendered.html, /Issue 001/)
    assert.match(rendered.html, /Worth a Click/)
    // Section headings are plain type; the ▲ ✦ ＋ ◆ markers are gone.
    assert.doesNotMatch(rendered.html, /[▲✦＋◆]/)
    assert.match(rendered.html, /Classifieds/)
    assert.match(rendered.html, /Advertise in Swipe[\s\S]*Unsubscribe/)
    assert.doesNotMatch(rendered.html, /Browse older issues/)
    assert.match(rendered.html, /Book yours ↗︎/)
    assert.match(rendered.html, /\[if mso\]/)
    assert.match(rendered.html, /{{unsubscribeUrl}}/)
  })

  it('renders component blocks and recipient conditions without leaking tags', async () => {
    const draft = {
      subject: 'Conditional issue',
      bodyMarkdown: [
        '<Header name="Issue 002" />',
        '',
        'Visible to everyone.',
        '',
        '<Conditional if="status:cold">',
        '<Box title="Still reading?" color="yellow">',
        'Click any link to stay on the list.',
        '</Box>',
        '</Conditional>',
      ].join('\n'),
    }

    const cold = await renderDraftEmail(draft, { status: 'cold' })
    const warm = await renderDraftEmail(draft, { status: 'warm' })

    assert.match(cold.html, /Still reading\?/)
    assert.match(cold.text, /Click any link/)
    assert.doesNotMatch(cold.html, /<Conditional/)
    assert.doesNotMatch(cold.html, /<Box/)
    assert.doesNotMatch(warm.html, /Still reading\?/)
    assert.doesNotMatch(warm.text, /Click any link/)
  })

  it('lists available templates', () => {
    assert.deepEqual(
      listEmailTemplates().map((template) => template.key),
      ['default'],
    )
  })
})
