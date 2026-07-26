import assert from 'node:assert/strict'
import { fileURLToPath } from 'node:url'
import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import { loadConfig } from './config.js'
import { runMigrations } from './db/migrate.js'
import * as schema from './db/schema.js'
import { CoreEmailPlatform } from './platform.js'
import { PostgresEmailStore } from './postgres-store.js'
import { TestEmailProvider } from './providers.js'

export const databaseUrl = process.env.INTEGRATION_DATABASE_URL

const migrationsDir = fileURLToPath(new URL('../../../migrations', import.meta.url))
let migrated = false
let migrationPromise: Promise<void> | undefined

export async function makeIntegrationPlatform(
  input: { provider?: TestEmailProvider; reset?: boolean } = {},
) {
  assert.ok(databaseUrl)
  await ensureMigrations()
  const client = postgres(databaseUrl, { max: 4 })
  const db = drizzle(client, { schema })
  if (input.reset ?? true) {
    await client`
      truncate table
        contact_link_rollups, link_rollups, events, webhook_events, links,
        messages, broadcasts, drafts, contact_value_rollups, purchases,
        contact_external_ids, suppressions, contact_tags, tags, subscriptions,
        lists, contacts, sequence_steps, sequences
      restart identity cascade
    `
  }

  const provider = input.provider ?? new TestEmailProvider()
  const store = new PostgresEmailStore(db)
  const platform = new CoreEmailPlatform({
    store,
    provider,
    config: loadConfig({
      NODE_ENV: 'test',
      DATABASE_URL: databaseUrl,
      EMAIL_PROVIDER: 'test',
      EMAIL_FROM_EMAIL: 'from@example.com',
      BASE_URL: 'http://localhost:3000',
    }),
  })

  return {
    platform,
    provider,
    store,
    db,
    close: () => client.end(),
  }
}

async function ensureMigrations() {
  assert.ok(databaseUrl)
  if (migrated) return
  migrationPromise ??= runMigrations({ databaseUrl, migrationsDir }).then(() => {})
  await migrationPromise
  migrated = true
}
