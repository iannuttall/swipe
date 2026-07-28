import type { ConfirmationPurpose, EmailPlatform } from '@email/core'
import { getBooleanFlag, getStringFlag, type ParsedArgs } from './args.js'

export interface ConfirmationCommandResult {
  handled: boolean
  result?: unknown
}

export async function runConfirmationCommand(
  parsed: ParsedArgs,
  platform: EmailPlatform,
): Promise<ConfirmationCommandResult> {
  const [area, action] = parsed.positionals
  if (area !== 'confirmation') return { handled: false }

  if (action === 'prepare') {
    if (!getBooleanFlag(parsed, 'yes')) {
      throw new Error('Refusing to prepare confirmation requests without --yes')
    }
    return {
      handled: true,
      result: await platform.prepareMigrationConfirmations({
        batchKey: requiredFlag(parsed, 'batch-key'),
        expiresAt: dateFlag(parsed, 'expires-at'),
        ...(getStringFlag(parsed, 'source')
          ? { source: requiredFlag(parsed, 'source') }
          : {}),
      }),
    }
  }

  if (action === 'report') {
    const purpose = purposeFlag(parsed)
    const batchKey = getStringFlag(parsed, 'batch-key')
    return {
      handled: true,
      result: await platform.getConfirmationReport({
        purpose,
        ...(batchKey ? { batchKey } : {}),
      }),
    }
  }

  if (action === 'unsubscribe-unconfirmed') {
    const execute = getBooleanFlag(parsed, 'yes')
    const result = await platform.unsubscribeUnconfirmedMigration({
      batchKey: requiredFlag(parsed, 'batch-key'),
      expiredBefore: dateFlag(parsed, 'expired-before'),
      execute,
      ...(getStringFlag(parsed, 'source')
        ? { source: requiredFlag(parsed, 'source') }
        : {}),
    })
    return {
      handled: true,
      result: { ...result, dryRun: !execute },
    }
  }

  throw new Error(
    'Unknown confirmation command; use prepare, report, or unsubscribe-unconfirmed',
  )
}

function purposeFlag(parsed: ParsedArgs): ConfirmationPurpose {
  const value = getStringFlag(parsed, 'purpose') ?? 'swipe_migration'
  if (
    value !== 'double_opt_in' &&
    value !== 'swipe_invite' &&
    value !== 'swipe_migration'
  ) {
    throw new Error(
      'Invalid --purpose; expected double_opt_in, swipe_invite, or swipe_migration',
    )
  }
  return value
}

function requiredFlag(parsed: ParsedArgs, name: string): string {
  const value = getStringFlag(parsed, name)
  if (!value) throw new Error(`Missing --${name}`)
  return value
}

function dateFlag(parsed: ParsedArgs, name: string): Date {
  const raw = requiredFlag(parsed, name)
  const value = new Date(raw)
  if (Number.isNaN(value.getTime())) {
    throw new Error(`Invalid --${name}; expected an ISO date`)
  }
  return value
}
