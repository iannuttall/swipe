import { spawnSync } from 'node:child_process'
import { parseSpamAssassinOutput, type SpamAssassinResult } from '@email/core'

export function runSpamAssassin(input: {
  mime: string
  command: string
}): SpamAssassinResult {
  const result = spawnSync(input.command, ['-t'], {
    input: input.mime,
    encoding: 'utf8',
    maxBuffer: 10 * 1024 * 1024,
    timeout: 2 * 60 * 1000,
  })
  if (result.error) {
    throw new Error(`SpamAssassin could not start: ${result.error.message}`)
  }
  if (result.signal === 'SIGTERM') {
    throw new Error('SpamAssassin timed out after two minutes')
  }
  const output = result.stdout ?? ''
  const parsed = parseSpamAssassinOutput(output)
  if (!parsed) {
    const detail = (result.stderr ?? '').trim()
    throw new Error(
      `SpamAssassin returned no readable score${detail ? `: ${detail}` : ''}`,
    )
  }
  return parsed
}
