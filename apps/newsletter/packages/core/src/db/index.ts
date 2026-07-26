import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import { loadConfig } from '../config.js'
import * as schema from './schema.js'

export type Database = ReturnType<typeof createDb>

export function createDb(databaseUrl = loadConfig().databaseUrl) {
  return createDbConnection(databaseUrl).db
}

export function createDbConnection(databaseUrl = loadConfig().databaseUrl) {
  const client = postgres(databaseUrl, { max: 10 })
  return {
    db: drizzle(client, { schema }),
    close: () => client.end(),
  }
}

export { schema }
