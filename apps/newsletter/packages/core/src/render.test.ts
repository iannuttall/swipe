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
    assert.match(rendered.html, /✦[\s\S]*Sponsor Title/)
    assert.match(rendered.html, /＋[\s\S]*Worth a Click/)
    assert.match(rendered.html, /◆[\s\S]*Classifieds/)
    assert.match(rendered.html, /Classifieds/)
    assert.match(
      rendered.html,
      /https:\/\/swipe\.md\/email\/swipe-email-logo-on-white@2x\.png/,
    )
    assert.doesNotMatch(rendered.html, /swipe-email-logo-universal/)
    assert.doesNotMatch(rendered.html, /swipe-email-logo-dark/)
    assert.doesNotMatch(rendered.html, /swipe-email-logo\.gif/)
    assert.match(
      rendered.html,
      /slightly greyed out, 13 pixel unsubscribe link[\s\S]*Unsubscribe[\s\S]*20-22/,
    )
    assert.match(rendered.html, /href="{{unsubscribeUrl}}"[^>]*style="[^"]*color:#7B7D81/)
    assert.match(
      rendered.html,
      /class="issue-footer-address"[^>]*href="#"[^>]*style="[^"]*color:#7B7D81[^"]*pointer-events:none[^"]*text-decoration:none/,
    )
    assert.doesNotMatch(rendered.html, /Sent by/)
    assert.doesNotMatch(rendered.html, /Advertise in Swipe/)
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

  it('renders item contents, anchors, labels, and the Markdown route', async () => {
    const rendered = await renderDraftEmail({
      subject: 'Item issue',
      name: 'item-issue',
      bodyMarkdown: [
        '<Header name="Issue 003" />',
        '',
        '<Item id="agent-grade" title="AgentGrade" url="https://agentgrade.dev" new="true">',
        'A focused description.',
        '',
        '<Like>',
        'Compare the same task across two setups.',
        '</Like>',
        '',
        '<Dislike>',
        'Useful when the task resembles your real work.',
        '</Dislike>',
        '</Item>',
        '',
        '<Item id="research-loop" title="Research loop" kind="workflow">',
        'A reusable research sequence.',
        '',
        '<Like>',
        'It turns discovery into a repeatable process.',
        '</Like>',
        '',
        '<Dislike>',
        'It still needs editorial judgment.',
        '</Dislike>',
        '</Item>',
        '',
        '<ReachOut>',
        '- Found a useful tool? [Send it over.](mailto:ian@swipe.md)',
        '</ReachOut>',
        '',
        '<Disclosure>',
        'Sponsors are labelled and never reviewed for pay.',
        '</Disclosure>',
      ].join('\n'),
    })

    assert.match(rendered.html, /In this issue/)
    assert.match(
      rendered.html,
      /href="https:\/\/swipe\.md\/issues\/item-issue#agent-grade"/,
    )
    assert.doesNotMatch(rendered.html, /href="#agent-grade"/)
    assert.match(rendered.html, /id="agent-grade"/)
    assert.match(rendered.html, /AgentGrade/)
    assert.match(rendered.html, /β/)
    assert.match(rendered.html, />Tools</)
    assert.match(rendered.html, /Skills, loops &amp; workflows/)
    assert.match(rendered.html, /What we like:/)
    assert.match(rendered.html, /What we don&#39;t like:/)
    assert.match(rendered.html, /Reach out/)
    assert.match(rendered.html, /item-issue\.md/)
    assert.match(rendered.html, /you can paste straight into/)
    assert.ok(
      rendered.html.indexOf('In this issue') <
        rendered.html.indexOf('hr-center-on-white@2x.png'),
    )
    assert.ok(
      rendered.html.indexOf('hr-center-on-white@2x.png') <
        rendered.html.indexOf('>Tools<'),
    )
    assert.match(rendered.text, /AgentGrade/)
    assert.match(rendered.text, /What we like:/)
    assert.doesNotMatch(rendered.text, /<Item|<Like|<Dislike/)
  })

  it('lists available templates', () => {
    assert.deepEqual(
      listEmailTemplates().map((template) => template.key),
      ['default'],
    )
  })
})
