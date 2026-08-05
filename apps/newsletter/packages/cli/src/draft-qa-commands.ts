import type { EmailPlatform } from '@email/core'
import { getBooleanFlag, getNumberFlag, getStringFlag, type ParsedArgs } from './args.js'
import { CliError } from './cli-error.js'

export async function runDraftQaCommand(
  action: string | undefined,
  parsed: ParsedArgs,
  platform: EmailPlatform,
) {
  const draftId = getStringFlag(parsed, 'draft-id')
  if (!draftId) throw new CliError('Missing --draft-id')
  if (action === 'qa-status') return platform.getDraftQa(draftId)
  if (action !== 'qa-approve') throw new CliError(`Unknown draft action: ${action}`)
  if (!getBooleanFlag(parsed, 'yes')) {
    throw new CliError('Refusing to approve draft QA without --yes')
  }
  const testMessageId = getStringFlag(parsed, 'test-message-id')
  const checkedAt = getStringFlag(parsed, 'checked-at')
  const browserCheckedLinks = getNumberFlag(parsed, 'browser-checked-links')
  if (!testMessageId) throw new CliError('Missing --test-message-id')
  if (!checkedAt) throw new CliError('Missing --checked-at')
  if (browserCheckedLinks === undefined) {
    throw new CliError('Missing --browser-checked-links')
  }
  return platform.approveDraftQa({
    draftId,
    testMessageId,
    checkedAt: new Date(checkedAt),
    browserCheckedLinks,
    archiveHtmlOk: getBooleanFlag(parsed, 'archive-html-ok'),
    archiveMarkdownOk: getBooleanFlag(parsed, 'archive-markdown-ok'),
  })
}
