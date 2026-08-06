import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { summarizeMailTesterReport } from './mail-tester-report.js'
import {
  parseSpamAssassinOutput,
  preparePreflightEmail,
  runPreSendChecks,
} from './pre-send-checks.js'

const spamAssassinOutput = `X-Spam-Checker-Version: SpamAssassin 4.0.1
X-Spam-Status: No, score=1.4 required=5.0 tests=HTML_MESSAGE,MISSING_DATE
 autolearn=no autolearn_force=no version=4.0.1

Content analysis details:   (1.4 points, 5.0 required)

 pts rule name              description
---- ---------------------- --------------------------------------------
 0.0 HTML_MESSAGE           BODY: HTML included in message
 1.4 MISSING_DATE           Missing Date: header
`

describe('pre-send checks', () => {
  it('materializes unsubscribe links and accepts a healthy message', () => {
    const prepared = preparePreflightEmail({
      rendered: {
        subject: 'Useful tools',
        html: '<p>Hello</p><p><a href="{{unsubscribeUrl}}">Unsubscribe</a></p>',
        text: 'Hello\n\nUnsubscribe: {{unsubscribeUrl}}',
      },
      fromEmail: 'ian@swipe.md',
      fromName: 'Swipe',
      baseUrl: 'https://swipe.md',
    })
    const spamAssassin = parseSpamAssassinOutput(spamAssassinOutput)
    assert.ok(spamAssassin)
    const report = runPreSendChecks({ prepared, spamAssassin })
    assert.equal(report.ready, true)
    assert.equal(
      report.checks.find((check) => check.id === 'spamassassin')?.status,
      'pass',
    )
    assert.doesNotMatch(prepared.mime, /{{unsubscribeUrl}}/)
  })

  it('blocks clipped HTML, unsafe content, HTTP links, and spam', () => {
    const prepared = preparePreflightEmail({
      rendered: {
        subject: 'Bad message',
        html: `<script>alert(1)</script><a href="http://example.com">x</a>${'x'.repeat(101 * 1024)}`,
        text: 'No footer',
      },
      fromEmail: 'ian@swipe.md',
      baseUrl: 'https://swipe.md',
    })
    const report = runPreSendChecks({
      prepared,
      spamAssassin: { score: 6.2, requiredScore: 5, isSpam: true, rules: [] },
    })
    assert.equal(report.ready, false)
    assert.deepEqual(
      report.checks
        .filter((check) => check.status === 'fail')
        .map((check) => check.id)
        .sort(),
      ['html_size', 'secure_links', 'spamassassin', 'unsafe_html', 'unsubscribe_body'],
    )
  })

  it('summarizes Mail-Tester sections without copying its full email payload', () => {
    const summary = summarizeMailTesterReport({
      status: true,
      displayedMark: '8.5/10',
      title: 'Good, but fix a few things',
      spamAssassin: { statusClass: 'success', title: 'SpamAssassin likes you' },
      signature: { statusClass: 'failure', title: 'DKIM failed' },
      blacklists: { statusClass: 'success', title: 'Not blocklisted' },
      body: { statusClass: 'warning', title: 'One image needs alt text' },
    })
    assert.equal(summary?.score, 8.5)
    assert.equal(
      summary?.checks.find((check) => check.id === 'mail_tester_authentication')?.status,
      'fail',
    )
    assert.equal(
      summary?.checks.find((check) => check.id === 'mail_tester_body')?.status,
      'warn',
    )
  })
})
