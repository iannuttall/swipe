import { readdir, readFile } from 'node:fs/promises'
import path from 'node:path'
import postgres from 'postgres'
import { loadConfig } from '../config.js'

export interface MigrationInput {
  databaseUrl?: string
  migrationsDir?: string
}

export interface MigrationResult {
  applied: string[]
  skipped: string[]
}

export async function runMigrations(
  input: MigrationInput = {},
): Promise<MigrationResult> {
  const databaseUrl = input.databaseUrl ?? loadConfig().databaseUrl
  const migrationsDir = input.migrationsDir ?? path.resolve(process.cwd(), 'migrations')
  const client = postgres(databaseUrl, { max: 1 })

  try {
    await client`
      create table if not exists schema_migrations (
        filename text primary key,
        applied_at timestamptz not null default now()
      )
    `

    const files = (await readdir(migrationsDir))
      .filter((file) => file.endsWith('.sql'))
      .toSorted()
    const applied: string[] = []
    const skipped: string[] = []

    for (const file of files) {
      const existing = await client`
        select filename from schema_migrations where filename = ${file} limit 1
      `
      if (existing.length > 0) {
        skipped.push(file)
        continue
      }

      const sql = await readFile(path.join(migrationsDir, file), 'utf8')
      await client.begin(async (transaction) => {
        await transaction.unsafe(sql)
        await transaction`
          insert into schema_migrations (filename) values (${file})
        `
      })
      applied.push(file)
    }

    return { applied, skipped }
  } finally {
    await client.end()
  }
}
