import type {
  MailTesterSummary,
  PreSendCheck,
  PreSendCheckStatus,
} from './pre-send-checks.js'

export function summarizeMailTesterReport(input: unknown): MailTesterSummary | undefined {
  if (!input || typeof input !== 'object') return undefined
  const report = input as Record<string, unknown>
  if (report.status === false) return undefined
  const displayedMark = stringValue(report.displayedMark)
  const score = displayedMark ? Number.parseFloat(displayedMark) : undefined
  const title = stringValue(report.title)
  const checks = [
    section('mail_tester_spamassassin', 'Mail-Tester SpamAssassin', report.spamAssassin),
    section('mail_tester_authentication', 'Mail-Tester authentication', report.signature),
    section('mail_tester_blacklists', 'Mail-Tester blocklists', report.blacklists),
    section('mail_tester_links', 'Mail-Tester links', report.links),
    section('mail_tester_body', 'Mail-Tester message body', report.body, true),
  ].filter((check): check is PreSendCheck => Boolean(check))
  return {
    ...(typeof score === 'number' && Number.isFinite(score) ? { score } : {}),
    ...(title ? { title } : {}),
    checks,
  }
}

function section(
  id: string,
  title: string,
  value: unknown,
  warningOnly = false,
): PreSendCheck | undefined {
  if (!value || typeof value !== 'object') return undefined
  const reportSection = value as Record<string, unknown>
  const statusClass = stringValue(reportSection.statusClass)?.toLowerCase() ?? ''
  const status: PreSendCheckStatus = statusClass.includes('failure')
    ? warningOnly
      ? 'warn'
      : 'fail'
    : statusClass.includes('warning')
      ? 'warn'
      : 'pass'
  return {
    id,
    title,
    status,
    detail:
      stringValue(reportSection.title) ??
      stringValue(reportSection.description) ??
      'Checked.',
  }
}

function stringValue(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined
}
