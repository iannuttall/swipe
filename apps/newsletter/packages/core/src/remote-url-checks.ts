import { decodeHtmlAttribute } from './link-metadata.js'
import type { PreSendCheck, PreSendCheckStatus } from './pre-send-checks.js'

type RemoteTargetKind = 'link' | 'image'

interface RemoteTarget {
  kind: RemoteTargetKind
  url: string
}

interface RemoteResult extends RemoteTarget {
  status: PreSendCheckStatus
  detail: string
}

export async function runRemoteUrlChecks(
  html: string,
  fetchUrl: typeof fetch = fetch,
): Promise<PreSendCheck[]> {
  const links = uniqueTargets(
    Array.from(html.matchAll(/\bhref=["']([^"']+)["']/gi), (match) => match[1]),
    'link',
  )
  const images = uniqueTargets(
    Array.from(
      html.matchAll(/<img\b[^>]*\bsrc=["']([^"']+)["'][^>]*>/gi),
      (match) => match[1],
    ),
    'image',
  )
  const [linkResults, imageResults] = await Promise.all([
    Promise.all(links.map((target) => checkRemoteTarget(target, fetchUrl))),
    Promise.all(images.map((target) => checkRemoteTarget(target, fetchUrl))),
  ])
  return [
    summarizeResults('link_destinations', 'Link destinations', linkResults),
    summarizeResults('image_sources', 'Image sources', imageResults),
  ]
}

function uniqueTargets(values: Array<string | undefined>, kind: RemoteTargetKind) {
  return Array.from(
    new Set(
      values
        .filter((value): value is string => Boolean(value))
        .map((value) => decodeHtmlAttribute(value.trim()))
        .filter((value) => /^https?:/i.test(value)),
    ),
    (url): RemoteTarget => ({ kind, url }),
  )
}

async function checkRemoteTarget(
  target: RemoteTarget,
  fetchUrl: typeof fetch,
): Promise<RemoteResult> {
  try {
    const parsed = new URL(target.url)
    if (!['http:', 'https:'].includes(parsed.protocol) || !parsed.hostname) {
      return { ...target, status: 'fail', detail: 'Invalid web URL.' }
    }
    const response = await fetchUrl(parsed, {
      cache: 'no-store',
      redirect: 'follow',
      signal: AbortSignal.timeout(10_000),
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/150 Safari/537.36',
      },
    })
    await response.body?.cancel()
    if (target.kind === 'image') {
      if (!response.ok) {
        return { ...target, status: 'fail', detail: `HTTP ${response.status}.` }
      }
      const contentType = response.headers.get('content-type')?.toLowerCase() ?? ''
      if (!contentType.startsWith('image/')) {
        return {
          ...target,
          status: 'fail',
          detail: `Expected an image, got ${contentType || 'no content type'}.`,
        }
      }
      return { ...target, status: 'pass', detail: `HTTP ${response.status}.` }
    }
    if (response.ok)
      return { ...target, status: 'pass', detail: `HTTP ${response.status}.` }
    if ([401, 403, 429].includes(response.status)) {
      return {
        ...target,
        status: 'warn',
        detail: `HTTP ${response.status}; the site may be blocking automated checks.`,
      }
    }
    return { ...target, status: 'fail', detail: `HTTP ${response.status}.` }
  } catch (error) {
    return {
      ...target,
      status: 'fail',
      detail: error instanceof Error ? error.message : 'Request failed.',
    }
  }
}

function summarizeResults(
  id: string,
  title: string,
  results: RemoteResult[],
): PreSendCheck {
  const failures = results.filter((result) => result.status === 'fail')
  const warnings = results.filter((result) => result.status === 'warn')
  const problems = [...failures, ...warnings]
  const status: PreSendCheckStatus =
    failures.length > 0 ? 'fail' : warnings.length > 0 ? 'warn' : 'pass'
  const detail = problems.length
    ? problems
        .slice(0, 3)
        .map((result) => `${result.url} (${result.detail})`)
        .join(' ')
    : `${results.length} remote URL${results.length === 1 ? '' : 's'} loaded successfully.`
  return { id, title, status, detail }
}
